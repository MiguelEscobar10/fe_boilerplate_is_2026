import { ErrorDeRed, SesionExpiradaError } from "@/lib/notificaciones/cliente";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { RangoFechas, ReporteOcupacion } from "./tipos";

// Llamadas del navegador al route handler /api/reportes/ocupacion. Nunca van
// directo al backend: el token está en una cookie httpOnly.

export { ErrorDeRed, SesionExpiradaError };

export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    readonly detalle?: string,
  ) {
    super(detalle ?? `La solicitud respondió ${status}.`);
    this.name = "ErrorDeApi";
  }
}

async function errorDe(res: Response) {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    return new ErrorDeApi(res.status, Array.isArray(body.message) ? body.message[0] : body.message);
  } catch {
    return new ErrorDeApi(res.status);
  }
}

/** Tasa de ocupación de los bienes del arrendador en el rango. */
export async function obtenerOcupacion(
  rango: RangoFechas,
  signal?: AbortSignal,
): Promise<ReporteOcupacion> {
  const query = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
  let res: Response;
  try {
    res = await fetch(`/api/reportes/ocupacion?${query}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ErrorDeRed();
  }
  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) throw new ErrorDeRed();
  if (!res.ok) throw await errorDe(res);
  return (await res.json()) as ReporteOcupacion;
}
