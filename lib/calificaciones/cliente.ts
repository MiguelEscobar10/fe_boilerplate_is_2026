import { irALogin } from "@/lib/notificaciones/navegacion";
import { ErrorDeRed, SesionExpiradaError } from "@/lib/solicitudes/cliente";
import type { CalificacionCreada } from "./tipos";

// Llamada del navegador al route handler de la calificación. Comparte con el
// panel de solicitudes los errores de red y de sesión.

/**
 * El backend no guardó la calificación. `status` y `codigo` dicen por qué:
 * 409 `RESERVA_YA_CALIFICADA`, 422 `RESERVA_NO_COMPLETADA`, 404 reserva que
 * no existe o es de otro arrendador, 400 datos inválidos.
 */
export class CalificacionRechazadaError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string | undefined,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "CalificacionRechazadaError";
  }
}

export async function calificarArrendatario(
  reservaId: string,
  puntaje: number,
  comentario?: string,
): Promise<CalificacionCreada> {
  const body: { puntaje: number; comentario?: string } = { puntaje };
  if (comentario) body.comentario = comentario;

  let res: Response;
  try {
    res = await fetch(
      `/api/reservas/${encodeURIComponent(reservaId)}/calificacion-arrendatario`,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
  } catch {
    throw new ErrorDeRed();
  }
  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) throw new ErrorDeRed();
  if (res.ok) return (await res.json()) as CalificacionCreada;

  let codigo: string | undefined;
  let mensaje = "";
  try {
    const error = (await res.json()) as { codigo?: string; message?: string | string[] };
    codigo = error.codigo;
    mensaje = (Array.isArray(error.message) ? error.message[0] : error.message) ?? "";
  } catch {
    // Sin cuerpo JSON: se queda con el status.
  }
  throw new CalificacionRechazadaError(res.status, codigo, mensaje);
}
