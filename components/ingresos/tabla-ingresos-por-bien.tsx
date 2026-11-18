import { formatearImporte } from "@/lib/ingresos/montos";
import type { IngresoPorBien } from "@/lib/ingresos/tipos";

type Props = {
  porBien: IngresoPorBien[];
  total: string;
  /** Período ya legible, para el caption. */
  periodo: string;
};

// Dos columnas: el nombre hace salto de línea y el importe no, así la tabla
// cabe a 375 px sin scroll horizontal.
export function TablaIngresosPorBien({ porBien, total, periodo }: Props) {
  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <caption className="sr-only">Ingreso por bien, {periodo}</caption>
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <th scope="col" className="py-2 pr-3 text-left font-medium">
            Bien
          </th>
          <th scope="col" className="w-32 py-2 text-right font-medium">
            Ingreso
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {porBien.map((bien) => (
          <tr key={bien.publicacionId}>
            <th scope="row" className="py-2 pr-3 text-left font-normal break-words">
              {bien.nombre}
            </th>
            <td className="py-2 text-right whitespace-nowrap tabular-nums">
              {formatearImporte(bien.ingreso)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-zinc-300 font-semibold dark:border-zinc-700">
          <th scope="row" className="py-2 pr-3 text-left">
            Total
          </th>
          <td className="py-2 text-right whitespace-nowrap tabular-nums">{formatearImporte(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
