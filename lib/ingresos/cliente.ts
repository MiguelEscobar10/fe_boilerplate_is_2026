import { apiErrorMessage } from "@/lib/api";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { RangoFechas, ReporteIngresos } from "./tipos";

// Llamada del navegador al route handler /api/reportes/ingresos. Nunca va
// directo al backend: el token está en una cookie httpOnly.

/** 400 del backend (fecha inválida, desde > hasta, más de 366 días...). */
export class RangoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RangoInvalidoError";
  }
}

/** 403: la cuenta no es ARRENDADOR. */
export class AccesoRestringidoError extends Error {
  constructor() {
    super("Acceso restringido.");
    this.name = "AccesoRestringidoError";
  }
}

/** Sin respuesta (sin conexión o backend caído, 502 del route handler). */
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

export async function obtenerIngresos(
  { desde, hasta }: RangoFechas,
  signal?: AbortSignal,
): Promise<ReporteIngresos> {
  const query = new URLSearchParams({ desde, hasta });
  let res: Response;
  try {
    res = await fetch(`/api/reportes/ingresos?${query}`, {
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
  if (res.status === 403) {
    throw new AccesoRestringidoError();
  }
  if (res.status === 400) {
    throw new RangoInvalidoError(
      (await apiErrorMessage(res)) ??"El rango de fechas no es válido.",
    );
  }
  if (res.status >= 502 && res.status <= 504) {
    throw new ErrorDeRed();
  }
  if (!res.ok) {
    throw new Error(`La solicitud respondió ${res.status}.`);
  }
  return (await res.json()) as ReporteIngresos;
}
