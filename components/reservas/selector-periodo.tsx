"use client";

import {
  SelectorDisponibilidad,
  type PeriodoElegido,
} from "@/components/disponibilidad/selector-disponibilidad";
import { usaHoras } from "@/lib/reservas/periodo";
import type { UnidadTarifa } from "@/lib/reservas/tipos";

type Props = {
  publicacionId: string;
  unidad: UnidadTarifa;
  horaInicio: string;
  horaFin: string;
  deshabilitado?: boolean;
  onDias: (periodo: PeriodoElegido | null) => void;
  onHoraInicio: (hora: string) => void;
  onHoraFin: (hora: string) => void;
};

/**
 * Dónde se elige el período: el calendario de disponibilidad (no deja elegir
 * días pasados ni ocupados) y, si la tarifa es por hora, la hora de inicio y
 * de fin. Con las demás tarifas se reservan días completos.
 */
export function SelectorPeriodo({
  publicacionId,
  unidad,
  horaInicio,
  horaFin,
  deshabilitado,
  onDias,
  onHoraInicio,
  onHoraFin,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <SelectorDisponibilidad publicacionId={publicacionId} onPeriodoElegido={onDias} />

      {usaHoras(unidad) ? (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Hora de inicio
            <input
              type="time"
              value={horaInicio}
              disabled={deshabilitado}
              onChange={(e) => onHoraInicio(e.target.value)}
              className="rounded-md border border-zinc-300 bg-background px-3 py-2 dark:border-zinc-700"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Hora de fin
            <input
              type="time"
              value={horaFin}
              disabled={deshabilitado}
              onChange={(e) => onHoraFin(e.target.value)}
              className="rounded-md border border-zinc-300 bg-background px-3 py-2 dark:border-zinc-700"
            />
          </label>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Esta publicación se reserva por días completos: del primer día elegido, desde las
          00:00, hasta el final del último.
        </p>
      )}
    </div>
  );
}
