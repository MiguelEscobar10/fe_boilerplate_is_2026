"use client";

import { useId, useState } from "react";
import { MOTIVO_MAX, type Decision } from "@/lib/solicitudes/tipos";

type Props = {
  decision: Decision;
  /** Mientras se envía, los botones quedan bloqueados. */
  enviando: boolean;
  onConfirmar: (motivo?: string) => void;
  onCancelar: () => void;
};

/**
 * Paso de confirmación antes de mandar la decisión. Al rechazar muestra el
 * motivo opcional con su contador (H04, criterio 4).
 */
export function ConfirmacionDecision({ decision, enviando, onConfirmar, onCancelar }: Props) {
  const idMotivo = useId();
  const idContador = useId();
  const [motivo, setMotivo] = useState("");
  const largo = motivo.length;
  const excedido = largo > MOTIVO_MAX;

  function confirmar() {
    if (enviando || excedido) return;
    onConfirmar(decision === "RECHAZAR" ? motivo.trim() || undefined : undefined);
  }

  return (
    <div
      role="group"
      aria-label={decision === "APROBAR" ? "Confirmar aprobación" : "Confirmar rechazo"}
      className="flex flex-col gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {decision === "APROBAR" ? (
        <p className="text-sm">¿Aprobar esta solicitud? Las fechas quedarán ocupadas.</p>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor={idMotivo} className="text-sm font-medium">
            Motivo de rechazo (opcional)
          </label>
          <textarea
            id={idMotivo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={MOTIVO_MAX}
            rows={3}
            disabled={enviando}
            aria-describedby={idContador}
            aria-invalid={excedido}
            placeholder="Por ejemplo: el equipo está en mantenimiento esas fechas."
            className="w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
          />
          <p
            id={idContador}
            className={`text-right text-xs tabular-nums ${
              excedido ? "text-red-600" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {largo}/{MOTIVO_MAX}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            El arrendatario lo verá en el aviso del rechazo.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={enviando || excedido}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60 ${
            decision === "APROBAR"
              ? "bg-foreground text-background"
              : "border border-zinc-400 text-red-700 dark:border-zinc-600 dark:text-red-400"
          }`}
        >
          {enviando
            ? "Enviando..."
            : decision === "APROBAR"
              ? "Sí, aprobar"
              : "Rechazar solicitud"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
