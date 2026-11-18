import { formatearTasa, type ItemOcupacion } from "@/lib/reportes/tipos";

/** Días ocupados, días disponibles y tasa de cada bien (H22, FE-22.1). */
export function TablaOcupacionPorBien({ items }: { items: ItemOcupacion[] }) {
  if (items.length === 0) {
    return <p>Todavía no tienes bienes publicados.</p>;
  }
  const celda = "px-2 py-2 sm:px-3";
  const numero = `${celda} text-right tabular-nums`;
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <caption className="sr-only">Tasa de ocupación por bien, en días</caption>
        <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
          <tr>
            <th scope="col" className={celda}>Bien</th>
            <th scope="col" className={`${celda} text-right`}>
              <abbr title="Días ocupados" className="no-underline">Ocupados</abbr>
            </th>
            <th scope="col" className={`${celda} text-right`}>
              <abbr title="Días disponibles" className="no-underline">Disponibles</abbr>
            </th>
            <th scope="col" className={`${celda} text-right`}>Tasa</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.publicacionId} className="border-t border-zinc-200 dark:border-zinc-800">
              <th scope="row" className={`${celda} text-left font-medium`}>{item.nombre}</th>
              <td className={numero}>{item.diasOcupados}</td>
              <td className={numero}>{item.diasDisponibles}</td>
              <td className={`${numero} whitespace-nowrap font-semibold`}>{formatearTasa(item.tasaOcupacion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
