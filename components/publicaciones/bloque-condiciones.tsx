import { formatearMonto } from "@/lib/pagos/montos";

type Props = {
  condiciones: string | null;
  depositoMonto: string;
};

/**
 * Condiciones de uso y depósito de garantía (H12). Va en el detalle y también
 * dentro del formulario de solicitud, para que se lean antes de enviar.
 */
export function BloqueCondiciones({ condiciones, depositoMonto }: Props) {
  const sinDeposito = Number(depositoMonto) === 0;

  return (
    <section
      aria-label="Condiciones y depósito"
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
    >
      <h3 className="font-semibold">Condiciones de uso</h3>
      {condiciones ? (
        <p className="whitespace-pre-line">{condiciones}</p>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">
          El arrendador no indicó condiciones especiales.
        </p>
      )}
      <p>
        <span className="text-zinc-500">Depósito de garantía: </span>
        <span className="font-medium">
          {sinDeposito ? "no pide depósito" : `$${formatearMonto(depositoMonto)}`}
        </span>
      </p>
    </section>
  );
}
