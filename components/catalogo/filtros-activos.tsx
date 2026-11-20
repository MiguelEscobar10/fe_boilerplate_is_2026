import { filtrosActivos } from "@/lib/catalogo/filtros";
import { SIN_FILTROS, type FiltrosCatalogo } from "@/lib/catalogo/tipos";

type Props = {
  filtros: FiltrosCatalogo;
  onCambiar: (filtros: FiltrosCatalogo) => void;
};

/** Los filtros aplicados, cada uno con su botón para quitarlo, y "Limpiar filtros". */
export function FiltrosActivos({ filtros, onCambiar }: Props) {
  const activos = filtrosActivos(filtros);
  if (activos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">Filtros activos:</span>
      <ul className="flex flex-wrap gap-2">
        {activos.map((activo) => (
          <li
            key={activo.clave}
            className="flex items-center gap-1 rounded-full border border-zinc-300 py-1 pl-3 pr-1 dark:border-zinc-700"
          >
            <span>{activo.etiqueta}</span>
            <button
              type="button"
              aria-label={`Quitar filtro ${activo.etiqueta}`}
              onClick={() => onCambiar(activo.sinEl)}
              className="rounded-full px-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onCambiar(SIN_FILTROS)} className="underline">
        Limpiar filtros
      </button>
    </div>
  );
}
