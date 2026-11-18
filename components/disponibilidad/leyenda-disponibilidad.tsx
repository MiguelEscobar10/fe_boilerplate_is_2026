import type { EstadoDia } from "@/lib/disponibilidad/calendario";

/** Cómo se pinta cada día. Lo usan el calendario y su leyenda. */
export const ESTILO_DIA: Record<EstadoDia, string> = {
  libre: "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-900",
  reserva:
    "bg-[repeating-linear-gradient(45deg,var(--color-zinc-200)_0_4px,transparent_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,var(--color-zinc-700)_0_4px,transparent_4px_8px)] font-semibold",
  bloqueo: "bg-foreground text-background font-semibold",
  pasado: "text-zinc-400 dark:text-zinc-600",
};

/** Leyenda del calendario de disponibilidad (H13). */
export function LeyendaDisponibilidad() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      <li className="flex items-center gap-1">
        <span className={`inline-block size-3 rounded border border-zinc-300 dark:border-zinc-700 ${ESTILO_DIA.libre}`} /> Libre
      </li>
      <li className="flex items-center gap-1">
        <span className={`inline-block size-3 rounded border border-zinc-300 dark:border-zinc-700 ${ESTILO_DIA.reserva}`} /> Ocupado (reserva CONFIRMADA o EN_CURSO)
      </li>
      <li className="flex items-center gap-1">
        <span className={`inline-block size-3 rounded ${ESTILO_DIA.bloqueo}`} /> Bloqueado por el arrendador
      </li>
      <li className="flex items-center gap-1">
        <span className="inline-block size-3 rounded border border-zinc-300 text-[8px] leading-3 text-zinc-400 dark:border-zinc-700">·</span> Pasado (no se puede elegir)
      </li>
    </ul>
  );
}
