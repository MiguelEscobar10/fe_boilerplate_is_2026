import { useId } from "react";

const CLASE_CAMPO =
  "w-full min-w-0 rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";

type Props = {
  inicio: string;
  fin: string;
  /** Primer día que se puede elegir (hoy). */
  minimo: string;
  onCambiar: (rango: { inicio: string; fin: string }) => void;
};

/** Las dos fechas del filtro "disponible entre" (H11). Solo captura; valida el panel. */
export function SelectorRangoFechas({ inicio, fin, minimo, onCambiar }: Props) {
  const id = useId();

  return (
    <fieldset className="flex min-w-0 flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Fechas disponibles</legend>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-inicio`} className="text-xs text-zinc-600 dark:text-zinc-400">
            Fecha de inicio
          </label>
          <input
            id={`${id}-inicio`}
            type="date"
            value={inicio}
            min={minimo}
            onChange={(e) => onCambiar({ inicio: e.target.value, fin })}
            className={CLASE_CAMPO}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-fin`} className="text-xs text-zinc-600 dark:text-zinc-400">
            Fecha de fin
          </label>
          <input
            id={`${id}-fin`}
            type="date"
            value={fin}
            min={inicio || minimo}
            onChange={(e) => onCambiar({ inicio, fin: e.target.value })}
            className={CLASE_CAMPO}
          />
        </div>
      </div>
    </fieldset>
  );
}
