import type { ErrorPago } from "@/lib/pagos/errores";
import { formatearMonto } from "@/lib/pagos/montos";
import { intentosRestantes, type PagoSimulado } from "@/lib/pagos/tipos";

export type Resultado =
  | { tipo: "aprobado"; pago: PagoSimulado }
  | { tipo: "rechazado"; pago: PagoSimulado }
  | { tipo: "error"; error: ErrorPago };

/** Resultado del intento de pago: aprobado, rechazado (con motivo) o error. */
export function ResultadoPago({ resultado }: { resultado: Resultado }) {
  if (resultado.tipo === "aprobado") {
    const { pago } = resultado;
    return (
      <div
        role="status"
        data-testid="resultado-pago"
        className="rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 p-4 text-sm"
      >
        <p className="mb-1 text-base font-semibold">Pago aprobado</p>
        <p>
          Total cobrado: <strong className="tabular-nums">${formatearMonto(pago.montoTotal)}</strong>
        </p>
        <p className="mt-1">Intento {pago.intento} de 3.</p>
      </div>
    );
  }

  if (resultado.tipo === "rechazado") {
    const { pago } = resultado;
    const restantes = intentosRestantes(pago.intento);
    return (
      <div
        role="alert"
        data-testid="resultado-pago"
        className="rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 p-4 text-sm"
      >
        <p className="mb-1 text-base font-semibold">Pago rechazado</p>
        <p>
          Motivo: <span data-testid="motivo-rechazo">{pago.motivo ?? "No se indicó un motivo."}</span>
        </p>
        <p className="mt-1">El cobro sigue pendiente y tu reserva sigue confirmada.</p>
        <p className="mt-1 font-medium" data-testid="intentos-restantes">
          {restantes > 0
            ? `Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`} de 3. Puedes probar de nuevo.`
            : "Ya no te quedan intentos de pago para esta reserva."}
        </p>
      </div>
    );
  }

  return (
    <div
      role="alert"
      data-testid="resultado-pago"
      className="rounded-lg border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 p-4 text-sm"
    >
      <p className="mb-1 text-base font-semibold">No se pudo completar el pago</p>
      <p>{resultado.error.mensaje}</p>
    </div>
  );
}
