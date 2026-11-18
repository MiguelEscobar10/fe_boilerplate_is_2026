// Contrato del módulo de verificación (backend, BE-07.1 / MP4-98 y BE-07.2 /
// MP4-99, docs/modulos/verificacion.md). No agregar campos que el backend no
// envía.

export type EstadoVerificacion = "PENDIENTE" | "APROBADA" | "RECHAZADA";

/** Respuesta de POST /usuarios/me/verificaciones. */
export type VerificacionCreada = {
  id: string;
  estado: EstadoVerificacion;
};

/** Respuesta de GET /usuarios/me/verificaciones/ultima. Nunca trae el documento. */
export type Verificacion = VerificacionCreada & {
  /** Solo si fue RECHAZADA y el revisor escribió un motivo. */
  motivoRechazo: string | null;
  /** ISO 8601 UTC. */
  enviadaAt: string;
  /** ISO 8601 UTC. null mientras está PENDIENTE. */
  revisadaAt: string | null;
};

/** Una solicitud en la cola del REVISOR (GET /verificaciones). */
export type SolicitudEnCola = Verificacion & {
  usuario: { id: string; email: string; nombre: string | null };
  /** Ruta del backend para abrir el documento (solo REVISOR). */
  documentoUrl: string;
};

export type Decision = "APROBAR" | "RECHAZAR";

/** Formatos y tamaño que acepta el backend. */
export const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "application/pdf"];
export const EXTENSIONES_PERMITIDAS = [".jpg", ".jpeg", ".png", ".pdf"];
export const TAMANO_MAXIMO = 5 * 1024 * 1024;
export const LARGO_MAXIMO_MOTIVO = 500;
