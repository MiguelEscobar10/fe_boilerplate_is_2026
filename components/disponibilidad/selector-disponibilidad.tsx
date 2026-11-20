"use client";

import { useRef, useState } from "react";
import type { EstadoDia } from "@/lib/disponibilidad/calendario";
import {
  ErrorDeRed,
  SesionExpiradaError,
  obtenerDisponibilidad,
} from "@/lib/disponibilidad/cliente";
import { formatearDiaCorto } from "@/lib/disponibilidad/fechas";
import { CalendarioDisponibilidad } from "./calendario-disponibilidad";

/** Lo mismo que acepta el backend en una consulta de disponibilidad. */
export const PERIODO_MAX_DIAS = 92;
const DIA_MS = 86_400_000;

export type PeriodoElegido = { desde: string; hasta: string };

const AVISO_DIA: Partial<Record<EstadoDia, string>> = {
  pasado: "No se pueden elegir fechas pasadas.",
  reserva: "Ese día ya tiene una reserva confirmada.",
  bloqueo: "Ese día no está disponible.",
};

type Props = {
  publicacionId: string;
  /**
   * El período elegido, solo de días libres. Es donde se conecta el selector
   * de la solicitud de reserva (FE-03.1).
   */
  onPeriodoElegido?: (periodo: PeriodoElegido | null) => void;
};

/**
 * Calendario del detalle de un bien para quien quiere reservar (H13): ve los
 * días libres y ocupados y elige un período. No deja elegir días pasados ni
 * un período que incluya días ocupados.
 */
export function SelectorDisponibilidad({ publicacionId, onPeriodoElegido }: Props) {
  const [desde, setDesde] = useState<string | null>(null);
  const [hasta, setHasta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  // Cada clic invalida la revisión anterior, por si responde tarde.
  const revision = useRef(0);

  function avisar(mensaje: string | null) {
    setAviso(mensaje);
  }

  function limpiar() {
    revision.current += 1;
    setDesde(null);
    setHasta(null);
    setRevisando(false);
    avisar(null);
    onPeriodoElegido?.(null);
  }

  async function elegirDia(dia: string) {
    const turno = ++revision.current;
    avisar(null);

    // Primer día, rango ya completo o un día antes de Desde: empieza de nuevo.
    if (!desde || hasta || dia < desde) {
      setDesde(dia);
      setHasta(null);
      setRevisando(false);
      onPeriodoElegido?.(null);
      return;
    }

    const dias = (Date.parse(dia) - Date.parse(desde)) / DIA_MS + 1;
    if (dias > PERIODO_MAX_DIAS) {
      avisar(`Elige un período de ${PERIODO_MAX_DIAS} días o menos.`);
      return;
    }

    // El calendario solo conoce el mes que se ve: se pregunta al backend por
    // el período completo antes de aceptarlo.
    setRevisando(true);
    try {
      const { ocupados } = await obtenerDisponibilidad(publicacionId, { desde, hasta: dia });
      if (turno !== revision.current) return;
      if (ocupados.length > 0) {
        avisar("El período elegido incluye días ocupados.");
        return;
      }
      setHasta(dia);
      onPeriodoElegido?.({ desde, hasta: dia });
    } catch (e) {
      if (turno !== revision.current || e instanceof SesionExpiradaError) return;
      avisar(
        e instanceof ErrorDeRed
          ? "No se pudo revisar el período. Revisa tu conexión."
          : "No se pudo revisar el período. Inténtalo de nuevo.",
      );
    } finally {
      if (turno === revision.current) setRevisando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <CalendarioDisponibilidad
        publicacionId={publicacionId}
        seleccion={{ desde, hasta }}
        onElegirDia={revisando ? undefined : elegirDia}
        onDiaNoDisponible={(_dia, estado) => avisar(AVISO_DIA[estado] ?? null)}
      />

      <p aria-live="polite" className="min-h-5 text-sm">
        {revisando ? (
          <span className="text-zinc-600 dark:text-zinc-400">Revisando el período...</span>
        ) : desde && hasta ? (
          <>
            Seleccionado:{" "}
            <strong>
              {desde === hasta
                ? formatearDiaCorto(desde)
                : `${formatearDiaCorto(desde)} – ${formatearDiaCorto(hasta)}`}
            </strong>{" "}
            (días libres)
          </>
        ) : desde ? (
          <span className="text-zinc-600 dark:text-zinc-400">
            Desde el {formatearDiaCorto(desde)}. Elige el último día.
          </span>
        ) : (
          <span className="text-zinc-600 dark:text-zinc-400">
            Pulsa el primer y el último día que quieres.
          </span>
        )}
      </p>

      {aviso && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {aviso}
        </p>
      )}

      {desde && (
        <button
          type="button"
          onClick={limpiar}
          className="self-start rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          Limpiar selección
        </button>
      )}
    </div>
  );
}
