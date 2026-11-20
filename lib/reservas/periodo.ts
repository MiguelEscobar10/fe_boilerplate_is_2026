import { aIsoLocal, inicioDelDia, sumarDias } from "@/lib/disponibilidad/fechas";
import type { UnidadTarifa } from "./tipos";

// Del período que elige la persona (días del calendario y, para tarifa por
// hora, horas) al par de instantes que se envía. Todo en hora de El Salvador.

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const HORA_INICIO_POR_DEFECTO = "09:00";
export const HORA_FIN_POR_DEFECTO = "12:00";

export type Periodo = {
  /** ISO con `-06:00`, listo para enviar. */
  inicio: string;
  fin: string;
  inicioMs: number;
  finMs: number;
};

/** Si la tarifa es por hora se eligen horas; si no, se reservan días completos. */
export function usaHoras(unidad: UnidadTarifa) {
  return unidad === "HORA";
}

function aMs(dia: string, hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return inicioDelDia(dia) + (h * 60 + m) * 60_000;
}

/** `2026-11-12` + `09:00` → `2026-11-12T09:00:00-06:00`. */
function aIso(dia: string, hora: string) {
  return `${dia}T${hora}:00-06:00`;
}

/**
 * Arma el período. Con tarifa por hora: del `desde` a `horaInicio` al `hasta`
 * a `horaFin`. Con las demás: días completos, de las 00:00 del primer día a
 * las 00:00 del día siguiente al último (el fin no está incluido).
 *
 * Devuelve null si falta algo o una hora está mal escrita.
 */
export function armarPeriodo(
  desde: string | null,
  hasta: string | null,
  unidad: UnidadTarifa,
  horaInicio: string,
  horaFin: string,
): Periodo | null {
  if (!desde || !hasta) return null;
  if (!usaHoras(unidad)) {
    const dia = sumarDias(hasta, 1);
    return {
      inicio: aIsoLocal(desde),
      fin: aIsoLocal(dia),
      inicioMs: inicioDelDia(desde),
      finMs: inicioDelDia(dia),
    };
  }
  if (!HORA.test(horaInicio) || !HORA.test(horaFin)) return null;
  return {
    inicio: aIso(desde, horaInicio),
    fin: aIso(hasta, horaFin),
    inicioMs: aMs(desde, horaInicio),
    finMs: aMs(hasta, horaFin),
  };
}

/**
 * Por qué el período no se puede enviar, o null si está bien. Es solo para
 * avisar antes: el backend vuelve a validar todo (400).
 */
export function errorDePeriodo(
  periodo: Periodo | null,
  unidad: UnidadTarifa,
  ahora = Date.now(),
): string | null {
  if (!periodo) return "Elige las horas de inicio y de fin.";
  if (periodo.finMs <= periodo.inicioMs) {
    return "La hora de fin debe ser posterior a la de inicio.";
  }
  if (periodo.inicioMs < ahora) {
    return usaHoras(unidad)
      ? "La hora de inicio ya pasó. Elige una hora a partir de ahora."
      : "El período no puede empezar en el pasado. Elige desde mañana.";
  }
  return null;
}
