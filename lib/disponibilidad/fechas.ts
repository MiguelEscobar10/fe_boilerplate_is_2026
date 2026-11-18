// Días en hora de El Salvador. Está en UTC-6 todo el año (sin horario de
// verano), así que un día local va de las 06:00 UTC a las 06:00 UTC del día
// siguiente. Los días se manejan como texto `AAAA-MM-DD`.

const DESFASE_MS = 6 * 3_600_000;
const DIA_MS = 86_400_000;

/** `AAAA-MM-DD` de hoy en El Salvador. */
export function hoyLocal(ahora = new Date()): string {
  return new Date(ahora.getTime() - DESFASE_MS).toISOString().slice(0, 10);
}

/** El día siguiente (o anterior, con `n` negativo). */
export function sumarDias(dia: string, n: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Instante (ms) en que empieza el día local. */
export function inicioDelDia(dia: string): number {
  return Date.parse(`${dia}T00:00:00Z`) + DESFASE_MS;
}

/** `2026-11-20` → `2026-11-20T00:00:00-06:00`, como lo pide la API. */
export function aIsoLocal(dia: string): string {
  return `${dia}T00:00:00-06:00`;
}

/** Instante → `AAAA-MM-DD` del día local en que cae. */
export function diaLocal(iso: string): string {
  return new Date(Date.parse(iso) - DESFASE_MS).toISOString().slice(0, 10);
}

/** Primer y último día del mes (`mes` en formato `AAAA-MM`). */
export function limitesDelMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function sumarMeses(mes: string, n: number): string {
  const [y, m] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1 + n, 1));
  return fecha.toISOString().slice(0, 7);
}

const NOMBRE_MES = new Intl.DateTimeFormat("es-SV", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `2026-11` → `noviembre de 2026`. */
export function nombreDelMes(mes: string): string {
  return NOMBRE_MES.format(new Date(`${mes}-01T00:00:00Z`));
}

const DIA_CORTO = new Intl.DateTimeFormat("es-SV", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `2026-11-20` → `20 nov 2026`. */
export function formatearDiaCorto(dia: string): string {
  return DIA_CORTO.format(new Date(`${dia}T00:00:00Z`)).replace(".", "");
}
