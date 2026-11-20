// Contrato del panel de solicitudes (backend, BE-04.1 / MP4-53,
// docs/modulos/reservas.md). No agregar campos que el backend no envía.

export type EstadoReserva =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "RECHAZADA"
  | "CANCELADA"
  | "EN_CURSO"
  | "COMPLETADA";

export const ESTADOS: EstadoReserva[] = [
  "PENDIENTE",
  "CONFIRMADA",
  "RECHAZADA",
  "CANCELADA",
  "EN_CURSO",
  "COMPLETADA",
];

/** Una fila de GET /arrendador/solicitudes. Fechas en ISO 8601 UTC. */
export type Solicitud = {
  id: string;
  estado: EstadoReserva;
  publicacion: { id: string; nombre: string };
  arrendatario: { id: string; nombre: string };
  inicio: string;
  fin: string;
  /** Costo del alquiler con dos decimales, como texto ("45.00"). */
  costoEstimado: string;
  depositoMonto: string;
  creadaAt: string;
  decididaAt: string | null;
  motivoRechazo: string | null;
  /**
   * Si ya se calificó al arrendatario (H18). Lo agrega BE-18.1; mientras ese
   * PR no esté en main, el backend no lo envía.
   */
  arrendatarioCalificado?: boolean;
};

/** Respuesta de GET /arrendador/solicitudes. `total` cuenta todas las del filtro. */
export type PaginaSolicitudes = {
  items: Solicitud[];
  total: number;
  page: number;
  limit: number;
};

export type Decision = "APROBAR" | "RECHAZAR";

/** Respuesta 200 de PATCH /reservas/:id/decision. */
export type DecisionGuardada = {
  id: string;
  estado: "CONFIRMADA" | "RECHAZADA";
  decididaAt: string;
  motivoRechazo: string | null;
};

/** H04, criterio 1: de 12 en 12. Es el valor por defecto del backend. */
export const POR_PAGINA = 12;

/** Largo máximo del motivo de rechazo (backend: 500). */
export const MOTIVO_MAX = 500;
