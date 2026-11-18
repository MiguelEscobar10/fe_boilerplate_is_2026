"use client";

import { useId, useState, type FormEvent } from "react";
import { RANGO_MAXIMO_DIAS, diasDelRango, mesEnCurso, type RangoFechas } from "@/lib/reportes/tipos";

/** Mensaje de error del rango, o null si es válido. */
export function validarRango({ desde, hasta }: RangoFechas): string | null {
  if (!desde || !hasta) return "Elige las dos fechas.";
  if (desde > hasta) return "La fecha inicial no puede ser posterior a la final.";
  if (diasDelRango({ desde, hasta }) > RANGO_MAXIMO_DIAS) {
    return `El rango puede tener como máximo ${RANGO_MAXIMO_DIAS} días.`;
  }
  return null;
}

type Props = {
  rango: RangoFechas;
  onCambio: (rango: RangoFechas) => void;
  deshabilitado?: boolean;
};

/** Desde y hasta (inclusivos) más un atajo al mes en curso (H22, FE-22.1). */
export function SelectorRangoFechas({ rango, onCambio, deshabilitado = false }: Props) {
  const [desde, setDesde] = useState(rango.desde);
  const [hasta, setHasta] = useState(rango.hasta);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  function consultar(e: FormEvent) {
    e.preventDefault();
    const mensaje = validarRango({ desde, hasta });
    setError(mensaje);
    if (!mensaje) onCambio({ desde, hasta });
  }

  function irAlMes() {
    const mes = mesEnCurso();
    setDesde(mes.desde);
    setHasta(mes.hasta);
    setError(null);
    onCambio(mes);
  }

  const campo = "rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <form onSubmit={consultar} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor={`${id}-desde`} className="flex flex-col gap-1 text-sm">
          Desde
          <input
            id={`${id}-desde`}
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className={campo}
          />
        </label>
        <label htmlFor={`${id}-hasta`} className="flex flex-col gap-1 text-sm">
          Hasta
          <input
            id={`${id}-hasta`}
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className={campo}
          />
        </label>
        <button
          type="submit"
          disabled={deshabilitado}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Consultar
        </button>
        <button
          type="button"
          onClick={irAlMes}
          disabled={deshabilitado}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          Mes en curso
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
