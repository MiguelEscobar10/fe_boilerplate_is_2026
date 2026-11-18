// Contrato de la entrega (backend, BE-08.1 / MP4-73, docs/modulos/entregas.md).
// No agregar campos que el backend no envía.

/** Respuesta 201 de POST /reservas/{id}/entrega. */
export type EntregaCreada = {
  entregaId: string;
  reservaId: string;
  estadoReserva: "EN_CURSO";
};

/** Respuesta de GET /reservas/{id}/entrega. */
export type Entrega = {
  entregaId: string;
  reservaId: string;
  /** ISO 8601 UTC. La pone el servidor. */
  entregadaAt: string;
  nota: string;
  fotos: { orden: number; url: string }[];
};

export type EstadoReserva =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "RECHAZADA"
  | "CANCELADA"
  | "EN_CURSO"
  | "COMPLETADA";

export type TipoBien = "EQUIPO" | "ESPACIO";

/** Lo que AccionEntrega necesita saber de la reserva (lo da FE-04.1/BE-03.1). */
export type ReservaParaEntrega = {
  id: string;
  estado: EstadoReserva;
  /** ISO 8601. Inicio del período de la reserva. */
  inicio: string;
  tipoBien: TipoBien;
};

export const ENTREGA_NO_HABILITADA = "ENTREGA_NO_HABILITADA";
export const LARGO_MAXIMO_NOTA = 500;
export const MAXIMO_FOTOS = 5;
export const TAMANO_MAXIMO_FOTO = 5 * 1024 * 1024;
export const TIPOS_FOTO = ["image/jpeg", "image/png"];
export const EXTENSIONES_FOTO = [".jpg", ".jpeg", ".png"];

/** "Registrar entrega" o, para espacios, "Registrar inicio de uso". */
export function nombreAccion(tipoBien: TipoBien) {
  return tipoBien === "ESPACIO" ? "Registrar inicio de uso" : "Registrar entrega";
}
