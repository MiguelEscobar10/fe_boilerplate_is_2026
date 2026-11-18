// Contrato del pago simulado (backend, BE-05.1 / MP4-65, docs/modulos/pagos.md).
// No agregar campos que el backend no envía.

/** Máximo de intentos de pago por reserva. */
export const MAX_INTENTOS = 3;

/** Respuesta 201 de POST /reservas/{id}/pagos/simulados. */
export type PagoSimulado = {
  pagoId: string;
  reservaId: string;
  /** Alquiler + depósito leídos de la reserva. String con 2 decimales. */
  montoTotal: string;
  estado: "APROBADO" | "RECHAZADO";
  simulado: true;
  /** De 1 a 3. */
  intento: number;
  /** Solo si es RECHAZADO. */
  motivo?: string;
};

/** Valores del campo `codigo` en los errores 400 y 409 del pago. */
export type CodigoErrorPago =
  | "TARJETA_NO_VALIDA"
  | "RESERVA_NO_CONFIRMADA"
  | "PAGO_YA_APROBADO"
  | "PAGO_EN_PROCESO"
  | "INTENTOS_AGOTADOS";

/** Lo único que se envía al backend: sin montos ni escenario. */
export type DatosTarjeta = {
  numeroTarjeta: string;
  vencimiento: string;
  cvv: string;
};

/** Importes de la reserva que se muestran antes de pagar. */
export type ResumenReserva = {
  id: string;
  /** Costo del alquiler. String con 2 decimales. */
  alquiler: string;
  /** Depósito de garantía. String con 2 decimales. */
  deposito: string;
};

export function intentosRestantes(intento: number) {
  return Math.max(0, MAX_INTENTOS - intento);
}
