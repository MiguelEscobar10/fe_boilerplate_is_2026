"use client";

import { useEffect, useState } from "react";
import { semanasDelMes, type EstadoDia } from "@/lib/disponibilidad/calendario";
import {
  ErrorDeRed,
  SesionExpiradaError,
  esAbortado,
  obtenerDisponibilidad,
} from "@/lib/disponibilidad/cliente";
import {
  formatearDiaCorto,
  hoyLocal,
  limitesDelMes,
  nombreDelMes,
  sumarMeses,
} from "@/lib/disponibilidad/fechas";
import type { PeriodoOcupado } from "@/lib/disponibilidad/tipos";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const ESTILO: Record<EstadoDia, string> = {
  libre: "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-900",
  reserva:
    "bg-[repeating-linear-gradient(45deg,var(--color-zinc-200)_0_4px,transparent_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,var(--color-zinc-700)_0_4px,transparent_4px_8px)] font-semibold",
  bloqueo: "bg-foreground text-background font-semibold",
  pasado: "text-zinc-400 dark:text-zinc-600",
};

const ETIQUETA: Record<EstadoDia, string> = {
  libre: "libre",
  reserva: "ocupado por una reserva",
  bloqueo: "bloqueado",
  pasado: "pasado",
};

type Props = {
  publicacionId: string;
  /** Cambia para volver a pedir la disponibilidad (p. ej. tras un bloqueo). */
  recarga?: number;
  /** Rango elegido (`AAAA-MM-DD`), que se resalta. */
  seleccion?: { desde: string | null; hasta: string | null };
  /** Si viene, los días que no pasaron se pueden pulsar. */
  onElegirDia?: (dia: string) => void;
};

/**
 * Calendario de un mes con los días libres, ocupados por una reserva
 * CONFIRMADA o EN_CURSO, bloqueados por el arrendador y pasados (H13). Pide
 * `GET /publicaciones/:id/disponibilidad` del mes que se ve.
 */
export function CalendarioDisponibilidad({
  publicacionId,
  recarga = 0,
  seleccion,
  onElegirDia,
}: Props) {
  const hoy = hoyLocal();
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [reintento, setReintento] = useState(0);
  const [ocupados, setOcupados] = useState<PeriodoOcupado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerDisponibilidad(publicacionId, limitesDelMes(mes), controller.signal)
      .then((d) => {
        setOcupados(d.ocupados);
        setError(null);
        setCargando(false);
      })
      .catch((e: unknown) => {
        if (esAbortado(e) || e instanceof SesionExpiradaError) return;
        setError(
          e instanceof ErrorDeRed
            ? "No se pudo cargar el calendario. Revisa tu conexión."
            : "No se pudo cargar el calendario.",
        );
        setCargando(false);
      });
    return () => controller.abort();
  }, [publicacionId, mes, recarga, reintento]);

  function cambiarMes(n: number) {
    setCargando(true);
    setError(null);
    setMes((m) => sumarMeses(m, n));
  }

  const semanas = semanasDelMes(mes, ocupados, hoy);
  const { desde, hasta } = seleccion ?? { desde: null, hasta: null };
  const elegido = (dia: string) =>
    desde !== null && dia >= desde && dia <= (hasta ?? desde);

  return (
    <section aria-label="Calendario de disponibilidad" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          disabled={mes <= hoy.slice(0, 7)}
          aria-label="Mes anterior"
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          ◀
        </button>
        <h3 className="text-sm font-semibold" aria-live="polite">
          {/* Solo la primera letra: "Diciembre de 2026", no "Diciembre De 2026". */}
          {nombreDelMes(mes).replace(/^./, (l) => l.toUpperCase())}
        </h3>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
        >
          ▶
        </button>
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              setCargando(true);
              setError(null);
              setReintento((n) => n + 1);
            }}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <table
          className={`w-full table-fixed border-collapse text-center text-sm transition-opacity ${
            cargando ? "opacity-50" : ""
          }`}
          aria-busy={cargando}
        >
          <thead>
            <tr>
              {DIAS_SEMANA.map((d) => (
                <th key={d} scope="col" className="py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semanas.map((semana, i) => (
              <tr key={i}>
                {semana.map((celda, j) => (
                  <td key={j} className="p-0.5">
                    {celda && (
                      <button
                        type="button"
                        data-dia={celda.dia}
                        data-estado={celda.estado}
                        aria-pressed={onElegirDia ? elegido(celda.dia) : undefined}
                        aria-label={`${formatearDiaCorto(celda.dia)}, ${ETIQUETA[celda.estado]}`}
                        disabled={!onElegirDia || celda.estado === "pasado"}
                        onClick={() => onElegirDia?.(celda.dia)}
                        className={`h-9 w-full rounded border border-zinc-200 tabular-nums disabled:cursor-default dark:border-zinc-800 ${
                          ESTILO[celda.estado]
                        } ${elegido(celda.dia) ? "outline outline-2 -outline-offset-2 outline-sky-600" : ""}`}
                      >
                        {celda.numero}
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        <li className="flex items-center gap-1">
          <span className={`inline-block size-3 rounded border border-zinc-300 dark:border-zinc-700 ${ESTILO.libre}`} /> Libre
        </li>
        <li className="flex items-center gap-1">
          <span className={`inline-block size-3 rounded border border-zinc-300 dark:border-zinc-700 ${ESTILO.reserva}`} /> Ocupado (reserva CONFIRMADA o EN_CURSO)
        </li>
        <li className="flex items-center gap-1">
          <span className={`inline-block size-3 rounded ${ESTILO.bloqueo}`} /> Bloqueado por el arrendador
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block size-3 rounded border border-zinc-300 text-[8px] leading-3 text-zinc-400 dark:border-zinc-700">·</span> Pasado (no se puede elegir)
        </li>
      </ul>
    </section>
  );
}
