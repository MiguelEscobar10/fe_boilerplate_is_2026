// Los importes llegan del backend como texto exacto ("130.00"). Aquí solo se
// les da formato: nunca pasan por number, para no perder precisión.
//
// NOTA: el PR de FE-05.1 (MP4-66) agrega lib/pagos/montos.ts con
// formatearMonto/sumarMontos (en centavos enteros). Cuando los dos estén en
// main, conviene unificarlas en un solo módulo de importes.

const IMPORTE = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * "130.00" → "$130.00", "45.5" → "$45.50", "0" → "$0.00".
 * Un texto que no sea un importe válido se muestra como «—».
 */
export function formatearImporte(importe: string): string {
  const coincide = IMPORTE.exec(importe.trim());
  if (!coincide) return "—";
  const [, enteros, decimales = ""] = coincide;
  return `$${enteros}.${decimales.padEnd(2, "0")}`;
}
