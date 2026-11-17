import type { Publicacion } from "@/lib/publicaciones/api";
import { TIPOS, UNIDADES } from "@/lib/publicaciones/reglas";

const etiquetaTipo = (v: string) => TIPOS.find((t) => t.valor === v)?.etiqueta ?? v;
const etiquetaUnidad = (v: string) => UNIDADES.find((u) => u.valor === v)?.etiqueta ?? v;

export function DetallePublicacion({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <article className="flex flex-col gap-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">{etiquetaTipo(p.tipo)}</p>
        <h1 className="text-2xl font-semibold">{p.nombre}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.ubicacion}</p>
      </header>

      {p.imagenes.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {p.imagenes.map((img) => (
            <li key={img.orden}>
              {/* eslint-disable-next-line @next/next/no-img-element -- la sirve el backend por medio de nuestra ruta */}
              <img
                src={`/publicaciones/${p.id}/imagenes/${img.orden}`}
                alt={`${p.nombre}, foto ${img.orden + 1}`}
                className="aspect-square w-full rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-zinc-500">Tarifa</dt>
        <dd>
          ${p.tarifaMonto} {etiquetaUnidad(p.tarifaUnidad)}
        </dd>
        <dt className="text-zinc-500">Depósito</dt>
        <dd>${p.depositoMonto}</dd>
        {p.descripcion && (
          <>
            <dt className="text-zinc-500">Descripción</dt>
            <dd className="whitespace-pre-line">{p.descripcion}</dd>
          </>
        )}
        {p.condiciones && (
          <>
            <dt className="text-zinc-500">Condiciones</dt>
            <dd className="whitespace-pre-line">{p.condiciones}</dd>
          </>
        )}
      </dl>
    </article>
  );
}
