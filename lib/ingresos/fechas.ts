import type { RangoFechas } from "./tipos";

// El backend interpreta `desde` y `hasta` como días en hora de El Salvador
// (UTC−6 fijo, sin horario de verano). Aquí se usa la misma zona.
export const ZONA_EL_SALVADOR = "America/El_Salvador";

/** Mismo máximo que el backend, contando los dos extremos. */
export const MAXIMO_DIAS = 366;

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// en-CA formatea como AAAA-MM-DD.
const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_EL_SALVADOR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día de hoy en El Salvador, `AAAA-MM-DD`. */
export function hoyEnElSalvador(ahora: Date = new Date()): string {
  return formatoDia.format(ahora);
}

/**
 * Primer y último día del mes en curso en El Salvador. El 1 de diciembre a
 * las 05:59Z todavía es 30 de noviembre allá, así que devuelve noviembre.
 */
export function mesEnCurso(ahora: Date = new Date()): RangoFechas {
  const [anio, mes] = hoyEnElSalvador(ahora).split("-").map(Number);
  // Día 0 del mes siguiente = último día de este mes.
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  return { desde: `${prefijo}-01`, hasta: `${prefijo}-${String(ultimoDia).padStart(2, "0")}` };
}

/** Milisegundos UTC de una fecha `AAAA-MM-DD` que existe, o null. */
function aDiaUtc(fecha: string): number | null {
  const coincide = FECHA.exec(fecha);
  if (!coincide) return null;
  const [anio, mes, dia] = coincide.slice(1).map(Number);
  const ms = Date.UTC(anio, mes - 1, dia);
  const d = new Date(ms);
  // Descarta fechas que no existen (2026-02-30 se correría a marzo).
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return ms;
}

/**
 * Revisa el rango antes de llamar al backend. Devuelve el mensaje de error o
 * null si es válido. Son las mismas reglas que aplica el backend (que igual
 * vuelve a revisarlas y responde 400).
 */
export function validarRango({ desde, hasta }: RangoFechas): string | null {
  if (!desde || !hasta) {
    return "Elige la fecha de inicio y la de fin.";
  }
  const inicio = aDiaUtc(desde);
  const fin = aDiaUtc(hasta);
  if (inicio === null || fin === null) {
    return "Alguna de las fechas no es válida.";
  }
  if (inicio > fin) {
    return "La fecha «Desde» no puede ser posterior a «Hasta».";
  }
  const dias = Math.round((fin - inicio) / MS_POR_DIA) + 1;
  if (dias > MAXIMO_DIAS) {
    return `El rango no puede tener más de ${MAXIMO_DIAS} días.`;
  }
  return null;
}

/** "2026-11-01" → "01/11/2026". */
export function fechaLegible(fecha: string): string {
  const coincide = FECHA.exec(fecha);
  if (!coincide) return fecha;
  const [, anio, mes, dia] = coincide;
  return `${dia}/${mes}/${anio}`;
}
