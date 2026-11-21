import { irALogin } from "@/lib/notificaciones/navegacion";
import { ErrorDeRed, SesionExpiradaError } from "@/lib/solicitudes/cliente";
import { CalificacionRechazadaError } from "./cliente";
import type { CalificacionCreada, CalificacionPropia, DatosCalificacionBien } from "./tipos";

// Llamadas del navegador al route handler de /api/reservas/{id}/calificacion
// (calificación del bien y del arrendador, H17). Comparte los errores de red,
// de sesión y de rechazo con la calificación del arrendatario.

async function leerError(res: Response): Promise<CalificacionRechazadaError> {
  let codigo: string | undefined;
  let mensaje = "";
  try {
    const error = (await res.json()) as { codigo?: string; message?: string | string[] };
    codigo = error.codigo;
    mensaje = (Array.isArray(error.message) ? error.message[0] : error.message) ?? "";
  } catch {
    // Sin cuerpo JSON: se queda con el status.
  }
  return new CalificacionRechazadaError(res.status, codigo, mensaje);
}

/**
 * POST: califica el bien y al arrendador de una reserva COMPLETADA. Lanza
 * CalificacionRechazadaError con el status y el `codigo` del backend (409
 * RESERVA_YA_CALIFICADA, 422 RESERVA_NO_COMPLETADA, 404, 400).
 */
export async function calificarBienYArrendador(
  reservaId: string,
  { puntajeBien, puntajeArrendador, comentario }: DatosCalificacionBien,
): Promise<CalificacionCreada> {
  const body: DatosCalificacionBien = { puntajeBien, puntajeArrendador };
  if (comentario) body.comentario = comentario;

  let res: Response;
  try {
    res = await fetch(`/api/reservas/${encodeURIComponent(reservaId)}/calificacion`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ErrorDeRed();
  }
  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) throw new ErrorDeRed();
  if (res.ok) return (await res.json()) as CalificacionCreada;
  throw await leerError(res);
}

export type ResultadoConsultaCalificacion =
  | { tipo: "calificada"; calificacion: CalificacionPropia }
  /** 404 con CALIFICACION_NO_REGISTRADA: la reserva es suya y no la calificó. */
  | { tipo: "sin-calificar" }
  /** Cualquier otro 404: la reserva no existe o no es suya. */
  | { tipo: "no-disponible" }
  | { tipo: "error" }
  | { tipo: "sesion-expirada" };

/** GET: la calificación que el arrendatario dejó en su reserva, si existe. */
export async function consultarCalificacionPropia(
  reservaId: string,
): Promise<ResultadoConsultaCalificacion> {
  let res: Response;
  try {
    res = await fetch(`/api/reservas/${encodeURIComponent(reservaId)}/calificacion`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { tipo: "error" };
  }
  if (res.status === 401) {
    irALogin();
    return { tipo: "sesion-expirada" };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await res.json();
  } catch {
    // Sin body JSON: se decide solo por status.
  }

  if (res.status === 404) {
    const codigo = (cuerpo as { codigo?: unknown } | null)?.codigo;
    return codigo === "CALIFICACION_NO_REGISTRADA"
      ? { tipo: "sin-calificar" }
      : { tipo: "no-disponible" };
  }
  if (res.ok && esCalificacionPropia(cuerpo)) return { tipo: "calificada", calificacion: cuerpo };
  return { tipo: "error" };
}

function esCalificacionPropia(valor: unknown): valor is CalificacionPropia {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.puntajeBien === "number" &&
    typeof v.puntajeArrendador === "number"
  );
}
