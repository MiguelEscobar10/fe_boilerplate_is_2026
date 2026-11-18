"use client";

import { useId } from "react";
import { MOTIVO_BLOQUEO_MAX } from "@/lib/disponibilidad/tipos";

export type DatosBloqueo = { desde: string; hasta: string; motivo: string };
export type ErroresBloqueo = { desde?: string; hasta?: string; motivo?: string };

/**
 * Reglas antes de enviar (FE-14.1 y H14, criterio 4): las dos fechas, que no
 * hayan pasado, Hasta igual o posterior a Desde (un bloqueo de un solo día es
 * Desde = Hasta) y el motivo de hasta 200 caracteres.
 */
export function validarBloqueo({ desde, hasta, motivo }: DatosBloqueo, hoy: string) {
  const errores: ErroresBloqueo = {};
  if (!desde) errores.desde = "Elige la fecha de inicio.";
  else if (desde < hoy) errores.desde = "No se pueden bloquear fechas pasadas.";
  if (!hasta) errores.hasta = "Elige la fecha de fin.";
  else if (desde && hasta < desde) errores.hasta = "Debe ser igual o posterior a Desde.";
  if (motivo.trim().length > MOTIVO_BLOQUEO_MAX) {
    errores.motivo = `El motivo no puede pasar de ${MOTIVO_BLOQUEO_MAX} caracteres.`;
  }
  return errores;
}

type Props = {
  datos: DatosBloqueo;
  errores: ErroresBloqueo;
  hoy: string;
  enviando: boolean;
  onCambiar: (datos: DatosBloqueo) => void;
  onEnviar: () => void;
  onCancelar: () => void;
};

/**
 * Rango y motivo del bloqueo. Las fechas también se eligen pulsando días en
 * el calendario; aquí se pueden escribir o corregir.
 */
export function FormularioBloqueo({
  datos,
  errores,
  hoy,
  enviando,
  onCambiar,
  onEnviar,
  onCancelar,
}: Props) {
  const id = useId();
  const campo = (nombre: keyof DatosBloqueo) => `${id}-${nombre}`;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onEnviar();
      }}
      className="flex flex-col gap-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={campo("desde")} className="text-sm font-medium">
            Desde *
          </label>
          <input
            id={campo("desde")}
            type="date"
            min={hoy}
            value={datos.desde}
            onChange={(e) => onCambiar({ ...datos, desde: e.target.value })}
            disabled={enviando}
            aria-invalid={Boolean(errores.desde)}
            className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          />
          {errores.desde && <p className="text-sm text-red-600">{errores.desde}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={campo("hasta")} className="text-sm font-medium">
            Hasta *
          </label>
          <input
            id={campo("hasta")}
            type="date"
            min={datos.desde || hoy}
            value={datos.hasta}
            onChange={(e) => onCambiar({ ...datos, hasta: e.target.value })}
            disabled={enviando}
            aria-invalid={Boolean(errores.hasta)}
            className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          />
          {errores.hasta ? (
            <p className="text-sm text-red-600">{errores.hasta}</p>
          ) : (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Incluido. Debe ser igual o posterior a Desde.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={campo("motivo")} className="text-sm font-medium">
          Motivo (opcional)
        </label>
        <input
          id={campo("motivo")}
          type="text"
          value={datos.motivo}
          maxLength={MOTIVO_BLOQUEO_MAX}
          onChange={(e) => onCambiar({ ...datos, motivo: e.target.value })}
          disabled={enviando}
          placeholder="Mantenimiento"
          className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
        />
        <p className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
          <span>Solo lo ves tú; el calendario público no lo muestra.</span>
          <span className="tabular-nums">
            {datos.motivo.length}/{MOTIVO_BLOQUEO_MAX}
          </span>
        </p>
        {errores.motivo && <p className="text-sm text-red-600">{errores.motivo}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {enviando ? "Bloqueando..." : "Bloquear fechas"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
