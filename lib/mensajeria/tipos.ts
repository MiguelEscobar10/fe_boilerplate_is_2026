// Contrato de mensajería del backend (BE-15.1 y BE-16.1).

export type EstadoReserva =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "RECHAZADA"
  | "CANCELADA"
  | "EN_CURSO"
  | "COMPLETADA";

/** POST /reservas/{id}/conversacion: 201 si es nueva, 200 si ya existía. */
export type ConversacionDeReserva = {
  id: string;
  estadoReserva: EstadoReserva;
  /** true solo con la reserva CONFIRMADA o EN_CURSO. */
  puedeEscribir: boolean;
};

export type Mensaje = {
  id: string;
  autorId: string;
  contenido: string;
  createdAt: string;
};

/** GET /conversaciones/{id}/mensajes: en orden cronológico, el más viejo primero. */
export type PaginaMensajes = {
  items: Mensaje[];
  page: number;
  limit: number;
  total: number;
};

export type MensajeCreado = { id: string; createdAt: string };

/** Códigos del 409 de BE-16.1. */
export type CodigoConversacion =
  "CONVERSACION_NO_HABILITADA" | "CONVERSACION_CERRADA";

export const MAX_CARACTERES = 1000;
