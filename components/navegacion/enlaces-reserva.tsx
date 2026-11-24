import Link from "next/link";
import type { EstadoReserva } from "@/lib/solicitudes/tipos";

/** Estados en los que la entrega y la conversación de la reserva tienen sentido. */
const ESTADOS_CON_SEGUIMIENTO: EstadoReserva[] = [
  "CONFIRMADA",
  "EN_CURSO",
  "COMPLETADA",
];

const CLASE =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

/**
 * Enlaces a la entrega y a la conversación de una reserva. Esas pantallas ya
 * existían pero ninguna otra las enlazaba (docs/09-problemas-conocidos.md).
 */
export function EnlacesReserva({
  reservaId,
  estado,
}: {
  reservaId: string;
  estado: EstadoReserva;
}) {
  if (!ESTADOS_CON_SEGUIMIENTO.includes(estado)) return null;
  const base = `/reservas/${encodeURIComponent(reservaId)}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`${base}/entrega`} className={CLASE}>
        Entrega
      </Link>
      <Link href={`${base}/conversacion`} className={CLASE}>
        Conversación
      </Link>
    </div>
  );
}
