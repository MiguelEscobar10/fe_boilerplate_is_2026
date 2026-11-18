// Tipos del reporte de tasa de ocupación (H22, BE-22.1).
// GET /api/v1/reportes/ocupacion?desde=AAAA-MM-DD&hasta=AAAA-MM-DD

export type ItemOcupacion = {
  publicacionId: string;
  nombre: string;
  diasOcupados: number;
  diasDisponibles: number;
  /** Porcentaje con un decimal; 0 si no hay días disponibles. */
  tasaOcupacion: number;
};

export type ReporteOcupacion = {
  desde: string;
  hasta: string;
  items: ItemOcupacion[];
};

/** Fechas `AAAA-MM-DD` inclusivas. */
export type RangoFechas = { desde: string; hasta: string };

export const RANGO_MAXIMO_DIAS = 366;
export const ZONA_HORARIA = "America/El_Salvador";

const DIA_MS = 86_400_000;
const aFecha = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Mes calendario en curso en hora de El Salvador (lo mismo que usa el backend por defecto). */
export function mesEnCurso(ahora = new Date()): RangoFechas {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(ahora);
  const [anio, mes] = hoy.split("-").map(Number);
  return { desde: aFecha(Date.UTC(anio, mes - 1, 1)), hasta: aFecha(Date.UTC(anio, mes, 0)) };
}

/** Días del rango, contando los dos extremos. */
export function diasDelRango({ desde, hasta }: RangoFechas) {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS + 1;
}

/** La tasa con un decimal y el símbolo %: 21.4 → "21.4 %", 0 → "0.0 %". */
export function formatearTasa(tasa: number) {
  const numero = new Intl.NumberFormat("es-SV", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(tasa);
  return `${numero} %`;
}
