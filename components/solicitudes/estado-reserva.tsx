import type { EstadoReserva } from "@/lib/solicitudes/tipos";

// Escala de grises: el estado lo dice el texto de la etiqueta, no el color.
const ESTILO: Record<EstadoReserva, string> = {
  PENDIENTE: "border border-zinc-400 text-zinc-800 dark:border-zinc-500 dark:text-zinc-200",
  CONFIRMADA: "bg-foreground text-background",
  RECHAZADA: "border border-zinc-300 text-zinc-500 line-through dark:border-zinc-700 dark:text-zinc-400",
  CANCELADA: "border border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
  EN_CURSO: "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-zinc-900",
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
