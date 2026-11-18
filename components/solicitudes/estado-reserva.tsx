import type { EstadoReserva } from "@/lib/solicitudes/tipos";

const ESTILO: Record<EstadoReserva, string> = {
  PENDIENTE: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  CONFIRMADA: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  RECHAZADA: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  CANCELADA: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  EN_CURSO: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  COMPLETADA: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

/** El estado de la reserva como etiqueta, con el mismo texto que la API. */
export function EstadoReservaBadge({ estado }: { estado: EstadoReserva }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO[estado]}`}
    >
      {estado}
    </span>
  );
}
