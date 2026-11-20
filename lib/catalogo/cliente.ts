import { irALogin } from "@/lib/notificaciones/navegacion";
import {
  CAMPOS_FILTRO,
  POR_PAGINA,
  type ConsultaCatalogo,
  type PaginaCatalogo,
} from "./tipos";

// Llamada del navegador al route handler /api/publicaciones. Nunca va directo
// al backend: el token está en una cookie httpOnly.

/** No hubo respuesta (sin conexión o backend caído, 502 del route handler). */
export class ErrorDeRed extends Error {
  constructor() {
    super("No se pudo conectar con el servidor.");
    this.name = "ErrorDeRed";
  }
}

/** La sesión expiró. Ya se inició la navegación a /login. */
export class SesionExpiradaError extends Error {
  constructor() {
    super("La sesión expiró.");
    this.name = "SesionExpiradaError";
  }
}

export function esAbortado(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Parámetros que se mandan al backend: sin los vacíos, que son su valor por defecto. */
export function parametrosDeConsulta({
  buscar,
  page,
  filtros,
}: ConsultaCatalogo): URLSearchParams {
  const query = new URLSearchParams({ page: String(page), limit: String(POR_PAGINA) });
  if (buscar) query.set("buscar", buscar);
  for (const campo of CAMPOS_FILTRO) {
    if (filtros[campo]) query.set(campo, filtros[campo]);
  }
  return query;
}

export async function obtenerCatalogo(
  consulta: ConsultaCatalogo,
  signal?: AbortSignal,
): Promise<PaginaCatalogo> {
  let res: Response;
  try {
    res = await fetch(`/api/publicaciones?${parametrosDeConsulta(consulta)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (esAbortado(error)) throw error;
    throw new ErrorDeRed();
  }
  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) throw new ErrorDeRed();
  if (!res.ok) throw new Error(`El catálogo respondió ${res.status}.`);
  return (await res.json()) as PaginaCatalogo;
}
