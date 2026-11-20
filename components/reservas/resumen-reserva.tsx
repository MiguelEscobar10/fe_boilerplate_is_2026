import { formatearMonto, formatearPeriodo } from "@/lib/solicitudes/formato";

type Props = {
  /** ISO 8601 con su desfase. */
  inicio: string;
  fin: string;
  /** Costo del alquiler con dos decimales. No incluye el depósito. */
  costo: string;
  deposito: string;
  /** Cómo se llegó al costo, p. ej. "3 horas × $15.00". Solo en la estimación. */
  detalle?: string;
  /** `true` antes de enviar: el costo final lo calcula el backend. */
  estimado?: boolean;
};

/**
 * Período, costo y depósito. El depósito va aparte: no se suma al costo del
 * alquiler (H03, criterio 2).
 */
export function ResumenReserva({ inicio, fin, costo, deposito, detalle, estimado }: Props) {
  return (
    <section
      aria-labelledby="resumen-reserva-titulo"
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h3 id="resumen-reserva-titulo" className="mb-3 text-base font-semibold">
        Resumen de la reserva
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-600 dark:text-zinc-400">Período</dt>
          <dd data-testid="periodo" className="text-right">
            {formatearPeriodo(inicio, fin)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-600 dark:text-zinc-400">
            {estimado ? "Costo estimado" : "Costo del alquiler"}
            {detalle && <span className="block text-xs">{detalle}</span>}
          </dt>
          <dd data-testid="costo" className="tabular-nums">
            {formatearMonto(costo)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 dark:border-zinc-800">
          <dt className="text-zinc-600 dark:text-zinc-400">
            Depósito de garantía
            <span className="block text-xs">Aparte del costo del alquiler.</span>
          </dt>
          <dd data-testid="deposito" className="tabular-nums">
            {formatearMonto(deposito)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
