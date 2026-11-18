// Importes en centavos enteros para no sumar con floats (0.1 + 0.2).

/** "45.5" | "45.50" | 45.5 → 4550. Lanza error si no es un importe válido. */
export function aCentavos(monto: string | number): number {
  const texto = String(monto).trim();
  const coincide = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);
  if (!coincide) {
    throw new Error(`Importe no válido: ${texto}`);
  }
  const [, enteros, decimales = ""] = coincide;
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

/** 4550 → "45.50". */
export function formatearCentavos(centavos: number): string {
  const enteros = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  return `${enteros}.${resto}`;
}

/** Normaliza un importe a dos decimales: "45.5" → "45.50". */
export function formatearMonto(monto: string | number): string {
  return formatearCentavos(aCentavos(monto));
}

/** Suma importes con dos decimales: ("45.00", "5.05") → "50.05". */
export function sumarMontos(...montos: (string | number)[]): string {
  return formatearCentavos(montos.reduce<number>((total, m) => total + aCentavos(m), 0));
}
