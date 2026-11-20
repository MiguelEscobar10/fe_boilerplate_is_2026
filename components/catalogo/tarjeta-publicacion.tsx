import Link from "next/link";
import { etiquetaTipo, rutaDeImagen, tarifaLegible } from "@/lib/catalogo/formato";
import type { PublicacionResumen } from "@/lib/catalogo/tipos";

/** Una publicación del catálogo: foto principal, tipo, nombre, ubicación y tarifa. */
export function TarjetaPublicacion({ publicacion: p }: { publicacion: PublicacionResumen }) {
  const imagen = rutaDeImagen(p.imagenUrl);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element -- la sirve el backend por medio de nuestra ruta
        <img
          src={imagen}
          alt={`Fotografía de ${p.nombre}`}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-zinc-100 text-xs text-zinc-500 dark:bg-zinc-900">
          Sin fotografía
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{etiquetaTipo(p.tipo)}</p>
        <h2 className="font-semibold">
          <Link href={`/publicaciones/${p.id}`} className="hover:underline">
            {p.nombre}
          </Link>
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.ubicacion}</p>
        <p className="mt-auto pt-2 text-sm font-medium">{tarifaLegible(p)}</p>
      </div>
    </article>
  );
}
