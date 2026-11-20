import { formatearMonto } from "@/lib/pagos/montos";
import { UNIDADES } from "@/lib/publicaciones/reglas";

type Props = {
  tarifaMonto: string;
  tarifaUnidad: string;
  depositoMonto: string;
};

/** Tarifa con su unidad de cobro y depósito de garantía (H12). */
export function BloqueTarifaDeposito({ tarifaMonto, tarifaUnidad, depositoMonto }: Props) {
  const unidad = UNIDADES.find((u) => u.valor === tarifaUnidad)?.etiqueta ?? tarifaUnidad;
  const sinDeposito = Number(depositoMonto) === 0;

  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
      <dt className="text-zinc-500">Tarifa</dt>
      <dd className="font-medium">
        ${formatearMonto(tarifaMonto)} {unidad}
      </dd>
      <dt className="text-zinc-500">Depósito de garantía</dt>
      <dd>{sinDeposito ? "No pide depósito" : `$${formatearMonto(depositoMonto)}`}</dd>
    </dl>
  );
}
