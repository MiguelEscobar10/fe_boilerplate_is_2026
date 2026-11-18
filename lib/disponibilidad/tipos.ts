// Contratos de disponibilidad (BE-13.1) y bloqueos (BE-14.1), backend
// docs/modulos/reservas.md. Las fechas llegan con `-06:00`.

export type OrigenOcupado = "RESERVA" | "BLOQUEO";

export type PeriodoOcupado = {
  inicio: string;
  /** No incluido: un período que termina el 22 a las 00:00 deja libre el 22. */
  fin: string;
  origen: OrigenOcupado;
};

/** Respuesta de GET /publicaciones/:id/disponibilidad. */
export type Disponibilidad = {
  publicacionId: string;
  desde: string;
  hasta: string;
  ocupados: PeriodoOcupado[];
};

/** Un bloqueo, como lo ve su dueño (GET y POST /publicaciones/:id/bloqueos). */
export type Bloqueo = {
  id: string;
  publicacionId: string;
  inicio: string;
  fin: string;
  motivo: string | null;
};

export type ListaBloqueos = { items: Bloqueo[] };

/** Largo máximo del motivo de un bloqueo (backend: 200). */
export const MOTIVO_BLOQUEO_MAX = 200;
