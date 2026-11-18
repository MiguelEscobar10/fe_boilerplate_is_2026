import { formatearMonto, sumarMontos } from "@/lib/pagos/montos";

type Props = {
  alquiler: string;
  deposito: string;
};

/** Desglose del cobro: alquiler, depósito y total, con dos decimales. */
export function ResumenCobro({ alquiler, deposito }: Props) {
  const total = sumarMontos(alquiler, deposito);

  return (
    <section
      aria-labelledby="resumen-cobro-titulo"
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 id="resumen-cobro-titulo" className="mb-3 text-base font-semibold">
        Resumen del cobro
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-600 dark:text-zinc-400">Alquiler</dt>
          <dd data-testid="monto-alquiler" className="tabular-nums">
            ${formatearMonto(alquiler)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-600 dark:text-zinc-400">Depósito de garantía</dt>
          <dd data-testid="monto-deposito" className="tabular-nums">
            ${formatearMonto(deposito)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
          <dt>Total</dt>
          <dd data-testid="monto-total" className="tabular-nums">
            ${total}
          </dd>
        </div>
      </dl>
    </section>
  );
}
