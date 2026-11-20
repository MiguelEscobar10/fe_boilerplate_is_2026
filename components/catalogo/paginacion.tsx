type Props = {
  page: number;
  paginas: number;
  deshabilitada?: boolean;
  onCambiar: (page: number) => void;
};

/** "Anterior · Página 2 de 5 · Siguiente". No se muestra si hay una sola página. */
export function Paginacion({ page, paginas, deshabilitada = false, onCambiar }: Props) {
  if (paginas <= 1) return null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3 text-sm">
      <button
        type="button"
        onClick={() => onCambiar(page - 1)}
        disabled={page <= 1 || deshabilitada}
        className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
      >
        Anterior
      </button>
      <span className="tabular-nums">
        Página {page} de {paginas}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(page + 1)}
        disabled={page >= paginas || deshabilitada}
        className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
      >
        Siguiente
      </button>
    </nav>
  );
}
