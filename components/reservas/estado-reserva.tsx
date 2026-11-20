import { EstadoReservaBadge } from "@/components/solicitudes/estado-reserva";
import type { EstadoReserva as Estado } from "@/lib/reservas/tipos";

const EXPLICACION: Record<Estado, string> = {
  PENDIENTE:
    "Esperando la decisión del arrendador. Todavía no es una reserva confirmada: las fechas no están apartadas para ti.",
  CONFIRMADA: "El arrendador aprobó la solicitud. Las fechas están apartadas.",
  RECHAZADA: "El arrendador rechazó la solicitud. Las fechas no quedan apartadas.",
  CANCELADA: "La reserva fue cancelada.",
  EN_CURSO: "El bien ya fue entregado y la reserva está en curso.",
  COMPLETADA: "El bien fue devuelto y la reserva terminó.",
};

type Props = {
  estado: Estado;
  /** Número de la solicitud, para identificarla. */
  numero?: string;
};

/**
 * Estado de una reserva con su explicación. Una solicitud PENDIENTE nunca se
 * presenta como una reserva confirmada: es lo que más se confunde (H03).
 */
export function EstadoReserva({ estado, numero }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {numero && (
          <span>
            Solicitud <span className="break-all font-mono text-xs">{numero}</span>
          </span>
        )}
        <EstadoReservaBadge estado={estado} />
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{EXPLICACION[estado]}</p>
    </div>
  );
}
