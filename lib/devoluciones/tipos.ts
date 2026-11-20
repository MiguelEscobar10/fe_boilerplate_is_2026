// Contrato de la devolución y la garantía (backend, BE-09.1 / MP4-77 y
// BE-09.2 / MP4-78, docs/modulos/devoluciones.md). No agregar campos que el
// backend no envía.

export type EstadoFinal = "SIN_OBSERVACIONES" | "CON_OBSERVACIONES";

/** Respuesta de GET /reservas/{id}/devolucion. */
export type Devolucion = {
  devolucionId: string;
  reservaId: string;
  /** ISO 8601 UTC. */
  fechaReal: string;
  estadoFinal: EstadoFinal;
  danos: string | null;
};

export type EstadoGarantia = "PENDIENTE" | "LIBERADA" | "RETENIDA";

/**
 * Respuesta de GET y POST /reservas/{id}/deposito/resolucion. Los importes
 * llegan como número (20, no "20.00"). Antes de resolver, `estadoGarantia` es
 * PENDIENTE y `montoRetenido`, `montoLiberado` y `motivo` son null.
 */
export type Garantia = {
  depositoOriginal: number;
  montoRetenido: number | null;
  montoLiberado: number | null;
  estadoGarantia: EstadoGarantia;
  motivo: string | null;
  estadoReserva: string;
  simulado: true;
};

export const LARGO_MAXIMO_DANOS = 500;
export const LARGO_MAXIMO_MOTIVO = 500;

/** Códigos de los 422 de la resolución. */
export const DEVOLUCION_NO_REGISTRADA = "DEVOLUCION_NO_REGISTRADA";

const MONTO = /^\d{1,10}(\.\d{1,2})?$/;

/** "$20.00". */
export function dinero(monto: number) {
  return `$${monto.toFixed(2)}`;
}

/**
 * Lo que quedaría al retener `texto` de un depósito: el retenido, el liberado
 * (en centavos, para no arrastrar errores de punto flotante) y el estado de la
 * garantía. Devuelve `error` si el monto no se puede usar.
 */
export function calcularResolucion(
  depositoOriginal: number,
  texto: string,
): { retenido: number; liberado: number; estado: "LIBERADA" | "RETENIDA" } | { error: string } {
  const limpio = texto.trim();
  if (!MONTO.test(limpio)) {
    return { error: "El monto retenido debe ser un número de 0 en adelante, con hasta dos decimales." };
  }
  const retenido = Number(limpio);
  const centavos = Math.round(depositoOriginal * 100) - Math.round(retenido * 100);
  if (centavos < 0) {
    return { error: "El monto retenido no puede superar el depósito." };
  }
  return { retenido, liberado: centavos / 100, estado: retenido > 0 ? "RETENIDA" : "LIBERADA" };
}
