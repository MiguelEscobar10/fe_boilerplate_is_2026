// Contrato de la calificación del arrendatario (backend, BE-18.1 / MP4-94,
// docs/modulos/resenas.md).

export const PUNTAJE_MIN = 1;
export const PUNTAJE_MAX = 5;
export const COMENTARIO_MAX = 500;

/** Respuesta 201 de POST /reservas/:id/calificacion-arrendatario. */
export type CalificacionCreada = { id: string };
