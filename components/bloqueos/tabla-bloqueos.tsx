import { diaLocal, formatearDiaCorto, sumarDias } from "@/lib/disponibilidad/fechas";
import type { Bloqueo } from "@/lib/disponibilidad/tipos";

/**
 * Último día incluido del bloqueo. El backend guarda `fin` sin incluir: un
 * bloqueo del 22 al 24 termina el 24 a las 00:00 y se muestra "Hasta 23".
 * Si termina a media jornada, ese día también está bloqueado.
 */
function ultimoDia(fin: string) {
  const dia = diaLocal(fin);
  return fin.slice(11, 19) === "00:00:00" ? sumarDias(dia, -1) : dia;
}

/** Los bloqueos de la publicación, del más próximo al más lejano. */
export function TablaBloqueos({ bloqueos }: { bloqueos: Bloqueo[] }) {
  if (bloqueos.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        No tienes fechas bloqueadas.
      </p>
    );
  }
  return (
    <div className="relative overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Desde</th>
            <th scope="col" className="px-3 py-2 font-medium">Hasta</th>
            <th scope="col" className="px-3 py-2 font-medium">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {bloqueos.map((b) => (
            <tr key={b.id}>
              <td className="px-3 py-2">{formatearDiaCorto(diaLocal(b.inicio))}</td>
              <td className="px-3 py-2">{formatearDiaCorto(ultimoDia(b.fin))}</td>
              <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{b.motivo ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
