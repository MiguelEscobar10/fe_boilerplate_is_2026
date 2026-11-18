import { irALogin } from "@/lib/notificaciones/navegacion";
import type { Bloqueo, Disponibilidad, ListaBloqueos } from "./tipos";

// Llamadas del navegador a los route handlers de /api/publicaciones/:id.

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

/** El backend respondió con error. `status`, `codigo` y el `message` del backend. */
export class RespuestaError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string | undefined,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "RespuestaError";
  }
}

export function esAbortado(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function pedir<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      cache: "no-store",
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
  if (res.ok) return (await res.json()) as T;

  let codigo: string | undefined;
  let mensaje = "";
  try {
    const body = (await res.json()) as { codigo?: string; message?: string | string[] };
    codigo = body.codigo;
    mensaje = (Array.isArray(body.message) ? body.message[0] : body.message) ?? "";
  } catch {
    // Sin cuerpo JSON.
  }
  throw new RespuestaError(res.status, codigo, mensaje);
}

const base = (publicacionId: string) => `/api/publicaciones/${encodeURIComponent(publicacionId)}`;

export function obtenerDisponibilidad(
  publicacionId: string,
  { desde, hasta }: { desde: string; hasta: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ desde, hasta });
  return pedir<Disponibilidad>(`${base(publicacionId)}/disponibilidad?${query}`, { signal });
}

export function listarBloqueos(publicacionId: string, signal?: AbortSignal) {
  return pedir<ListaBloqueos>(`${base(publicacionId)}/bloqueos`, { signal });
}

export function crearBloqueo(
  publicacionId: string,
  datos: { inicio: string; fin: string; motivo?: string },
) {
  return pedir<Bloqueo>(`${base(publicacionId)}/bloqueos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}
