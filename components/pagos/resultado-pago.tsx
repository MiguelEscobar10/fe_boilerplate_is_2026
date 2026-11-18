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
        className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
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
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
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
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
    >
      <p className="mb-1 text-base font-semibold">No se pudo completar el pago</p>
      <p>{resultado.error.mensaje}</p>
    </div>
  );
}
