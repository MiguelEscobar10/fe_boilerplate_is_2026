// Contrato de la calificación del arrendatario (backend, BE-18.1 / MP4-94,
// docs/modulos/resenas.md).

export const PUNTAJE_MIN = 1;
export const PUNTAJE_MAX = 5;
export const COMENTARIO_MAX = 500;

/** Respuesta 201 de POST /reservas/:id/calificacion-arrendatario. */
export type CalificacionCreada = { id: string };

// Calificación del bien y del arrendador (backend, BE-17.1 / MP4-90,
// docs/modulos/resenas.md). Los dos puntajes comparten la escala y el límite
// del comentario de arriba.

/** Lo que se envía a POST /reservas/:id/calificacion. */
export type DatosCalificacionBien = {
  puntajeBien: number;
  puntajeArrendador: number;
  comentario?: string;
};

/** Respuesta 200 de GET /reservas/:id/calificacion. */
export type CalificacionPropia = {
  id: string;
  reservaId: string;
  puntajeBien: number;
  puntajeArrendador: number;
  comentario: string | null;
  /** ISO 8601 en UTC. */
  fechaRegistro: string;
};
