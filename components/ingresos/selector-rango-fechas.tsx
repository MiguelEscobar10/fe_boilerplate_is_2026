"use client";

import { useId, useState, type FormEvent } from "react";
import type { RangoFechas } from "@/lib/ingresos/tipos";

type Props = {
  /** Rango con el que arrancan los campos (el mes en curso). */
  rangoInicial: RangoFechas;
  /** Se pulsó «Consultar». El panel valida y decide si llama al backend. */
  onConsultar: (rango: RangoFechas) => void;
  /** Error del rango (validación del navegador o 400 del backend). */
  error: string | null;
  consultando: boolean;
};

const CLASE_CAMPO =
  "w-full min-w-0 rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm aria-invalid:border-red-600 dark:border-zinc-700";

export function SelectorRangoFechas({ rangoInicial, onConsultar, error, consultando }: Props) {
  const [desde, setDesde] = useState(rangoInicial.desde);
  const [hasta, setHasta] = useState(rangoInicial.hasta);
  const id = useId();
  const idError = `${id}-error`;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    onConsultar({ desde, hasta });
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Período del reporte" className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-desde`} className="text-sm font-medium">
            Desde
          </label>
          <input
            id={`${id}-desde`}
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className={CLASE_CAMPO}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-hasta`} className="text-sm font-medium">
            Hasta
          </label>
          <input
            id={`${id}-hasta`}
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className={CLASE_CAMPO}
          />
        </div>
        <button
          type="submit"
          disabled={consultando}
          className="col-span-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {consultando ? "Consultando..." : "Consultar"}
        </button>
      </div>
      {error && (
        <p id={idError} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
