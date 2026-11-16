import { ErrorDeApi, pedirJson } from "./cliente";

// Opción "requiere verificación" de una publicación (H19, BE-19.1) y el 422
// que responde la solicitud de reserva (BE-03.1) cuando no se cumple.

export const VERIFICACION_REQUERIDA = "VERIFICACION_REQUERIDA";

/** Respuesta de PATCH /publicaciones/{id}/requiere-verificacion. */
export type RequisitoVerificacion = {
  id: string;
  requiereVerificacion: boolean;
};

/** Cuerpo del 422 VERIFICACION_REQUERIDA (formato de Nest + `codigo`). */
export type CuerpoVerificacionRequerida = {
  statusCode: 422;
  codigo: typeof VERIFICACION_REQUERIDA;
  message: string;
};

export function cambiarRequiereVerificacion(
  publicacionId: string,
  requiereVerificacion: boolean,
) {
  return pedirJson<RequisitoVerificacion>(
    `/api/publicaciones/${encodeURIComponent(publicacionId)}/requiere-verificacion`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requiereVerificacion }),
    },
  );
}

/**
 * true si una respuesta de la solicitud de reserva es el 422 de verificación
 * requerida. Para FE-03.1: con el `status` y el cuerpo ya leído como JSON.
 */
export function esVerificacionRequerida(
  status: number,
  cuerpo: unknown,
): cuerpo is CuerpoVerificacionRequerida {
  return (
    status === 422 &&
    typeof cuerpo === "object" &&
    cuerpo !== null &&
    (cuerpo as { codigo?: unknown }).codigo === VERIFICACION_REQUERIDA
  );
}

/** Igual que esVerificacionRequerida, para un ErrorDeApi del cliente. */
export function esErrorVerificacionRequerida(error: unknown) {
  return (
    error instanceof ErrorDeApi &&
    error.status === 422 &&
    error.codigo === VERIFICACION_REQUERIDA
  );
}
