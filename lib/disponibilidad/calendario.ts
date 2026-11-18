import { hoyLocal, inicioDelDia, limitesDelMes, sumarDias } from "./fechas";
import type { PeriodoOcupado } from "./tipos";

export type EstadoDia = "libre" | "reserva" | "bloqueo" | "pasado";

export type CeldaDia = {
  /** `AAAA-MM-DD`. */
  dia: string;
  numero: number;
  estado: EstadoDia;
};

/**
 * Estado de un día: pasado si ya pasó (H13, criterio 3); si no, ocupado si
 * algún período se cruza con el día (de 00:00 a 24:00 locales). Una reserva
 * gana sobre un bloqueo cuando hay de los dos.
 */
export function estadoDelDia(
  dia: string,
  ocupados: PeriodoOcupado[],
  hoy = hoyLocal(),
): EstadoDia {
  if (dia < hoy) return "pasado";
  const inicio = inicioDelDia(dia);
  const fin = inicioDelDia(sumarDias(dia, 1));
  const cruzan = ocupados.filter(
    (p) => Date.parse(p.inicio) < fin && Date.parse(p.fin) > inicio,
  );
  if (cruzan.some((p) => p.origen === "RESERVA")) return "reserva";
  if (cruzan.length > 0) return "bloqueo";
  return "libre";
}

/**
 * Semanas del mes, de lunes a domingo. Los huecos antes del día 1 y después
 * del último quedan en `null`.
 */
export function semanasDelMes(
  mes: string,
  ocupados: PeriodoOcupado[],
  hoy = hoyLocal(),
): (CeldaDia | null)[][] {
  const { desde, hasta } = limitesDelMes(mes);
  // getUTCDay: 0 domingo … 6 sábado → 0 lunes … 6 domingo.
  const primero = (new Date(`${desde}T00:00:00Z`).getUTCDay() + 6) % 7;
  const celdas: (CeldaDia | null)[] = Array.from({ length: primero }, () => null);
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    celdas.push({ dia, numero: Number(dia.slice(8)), estado: estadoDelDia(dia, ocupados, hoy) });
  }
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas: (CeldaDia | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}
