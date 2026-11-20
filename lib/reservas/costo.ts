import { aCentavos, formatearCentavos } from "@/lib/pagos/montos";
import type { UnidadTarifa } from "./tipos";

// Estimación del costo antes de enviar la solicitud. Es la misma fórmula que
// usa el backend (BE-03.1), solo para mostrar: el costo que vale es el que
// devuelve el 201, porque el backend lo calcula con la tarifa guardada.

const HORA_MS = 3_600_000;
const DIA_MS = 24 * HORA_MS;

const UNIDAD_MS: Record<UnidadTarifa, number> = {
  HORA: HORA_MS,
  DIA: DIA_MS,
  NOCHE: DIA_MS,
  SEMANA: 7 * DIA_MS,
};

export const NOMBRE_UNIDAD: Record<UnidadTarifa, { singular: string; plural: string }> = {
  HORA: { singular: "hora", plural: "horas" },
  DIA: { singular: "día", plural: "días" },
  NOCHE: { singular: "noche", plural: "noches" },
  SEMANA: { singular: "semana", plural: "semanas" },
};

/**
 * Unidades de cobro del período: HORA en horas, DIA y NOCHE en días de 24
 * horas y SEMANA en semanas de 7 días. Una fracción sube a la unidad
 * siguiente y el mínimo es 1.
 */
export function unidadesDeCobro(inicioMs: number, finMs: number, unidad: UnidadTarifa): number {
  return Math.max(1, Math.ceil((finMs - inicioMs) / UNIDAD_MS[unidad]));
}

/** Costo estimado con dos decimales (`"45.00"`), en centavos enteros. */
export function costoEstimado(
  tarifa: string,
  unidad: UnidadTarifa,
  inicioMs: number,
  finMs: number,
): string {
  return formatearCentavos(aCentavos(tarifa) * unidadesDeCobro(inicioMs, finMs, unidad));
}
