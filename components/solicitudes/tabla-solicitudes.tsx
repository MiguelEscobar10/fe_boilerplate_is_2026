"use client";

import type { Decision, Solicitud } from "@/lib/solicitudes/tipos";
import { formatearMonto, formatearPeriodo } from "@/lib/solicitudes/formato";
import { EstadoReservaBadge } from "./estado-reserva";

type Props = {
  solicitudes: Solicitud[];
  /** Id de la que está abierta en el detalle, para marcar su fila. */
  seleccionadaId: string | null;
  /** Abre el detalle; con `decision`, ya en el paso de confirmar. */
  onAbrir: (solicitud: Solicitud, decision?: Decision) => void;
};

/**
 * Tabla de "Mis solicitudes" (H04, criterio 1): quién la hizo, el bien, las
 * fechas, el costo estimado y el estado. Las PENDIENTE tienen Aprobar y
 * Rechazar; la decisión se confirma en el detalle.
 */
export function TablaSolicitudes({ solicitudes, seleccionadaId, onAbrir }: Props) {
  return (
    // `relative`: el encabezado "Acciones" es sr-only (position: absolute) y,
    // sin un ancestro posicionado, se sale del contenedor con scroll y
    // ensancha la página en el teléfono.
    <div className="relative overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Arrendatario</th>
            <th scope="col" className="px-3 py-2 font-medium">Bien</th>
            <th scope="col" className="px-3 py-2 font-medium">Fechas</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Costo est.</th>
            <th scope="col" className="px-3 py-2 font-medium">Estado</th>
            <th scope="col" className="px-3 py-2 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {solicitudes.map((s) => (
            <tr
              key={s.id}
              data-estado={s.estado}
              aria-selected={s.id === seleccionadaId}
              className={s.id === seleccionadaId ? "bg-zinc-100 dark:bg-zinc-900" : undefined}
            >
              <td className="px-3 py-2">{s.arrendatario.nombre}</td>
              <td className="px-3 py-2">{s.publicacion.nombre}</td>
              <td className="px-3 py-2">{formatearPeriodo(s.inicio, s.fin)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatearMonto(s.costoEstimado)}
              </td>
              <td className="px-3 py-2">
                <EstadoReservaBadge estado={s.estado} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {s.estado === "PENDIENTE" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onAbrir(s, "APROBAR")}
                        aria-label={`Aprobar la solicitud de ${s.arrendatario.nombre} para ${s.publicacion.nombre}`}
                        className="rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => onAbrir(s, "RECHAZAR")}
                        aria-label={`Rechazar la solicitud de ${s.arrendatario.nombre} para ${s.publicacion.nombre}`}
                        className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
                      >
                        Rechazar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAbrir(s)}
                      aria-label={`Ver la solicitud de ${s.arrendatario.nombre} para ${s.publicacion.nombre}`}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
                    >
                      Ver
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
