/* eslint-disable @next/next/no-img-element -- las fotos salen de un route handler con sesión, no de una URL que next/image pueda optimizar */
import { urlFoto } from "@/lib/entregas/cliente";
import type { Entrega } from "@/lib/entregas/tipos";
import { fecha } from "./mensajes";

type Props = { entrega: Entrega };

/** Entrega ya registrada: fecha real, estado inicial y fotos (H08). */
export function DetalleEntrega({ entrega }: Props) {
  return (
    <section
      aria-label="Entrega registrada"
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <p className="font-medium">
          Entrega registrada <span className="text-sm font-normal">· Reserva EN_CURSO</span>
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          El {fecha(entrega.entregadaAt)}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium">Estado inicial</p>
        <p className="whitespace-pre-line text-sm">{entrega.nota}</p>
      </div>
      {entrega.fotos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {entrega.fotos.map((foto) => (
            <li key={foto.orden}>
              <img
                src={urlFoto(entrega.reservaId, foto.orden)}
                alt={`Foto ${foto.orden + 1} del estado inicial`}
                className="aspect-square w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
