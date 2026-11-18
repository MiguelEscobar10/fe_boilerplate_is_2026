// Contrato de GET /reportes/ingresos (BE-21.1, MP4-116). Ver docs/ingresos.md.

/** Rango de días inclusivos, `AAAA-MM-DD`, en hora de El Salvador. */
export type RangoFechas = {
  desde: string;
  hasta: string;
};

export type IngresoPorBien = {
  /** UUID de la publicación. */
  publicacionId: string;
  nombre: string;
  /** Texto con dos decimales, p. ej. "130.00". Puede ser "0.00". */
  ingreso: string;
};

export type ReporteIngresos = RangoFechas & {
  moneda: "USD";
  /** Suma de `porBien[].ingreso`, calculada por el backend. Texto con dos decimales. */
  total: string;
  /** Ordenado por nombre. Vacío si el arrendador no tiene bienes. */
  porBien: IngresoPorBien[];
};
