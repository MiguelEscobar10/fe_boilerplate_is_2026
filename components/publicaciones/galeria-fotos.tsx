"use client";

import { useState } from "react";

type Props = {
  publicacionId: string;
  nombre: string;
  /** Fotos en el orden en que se muestran. */
  imagenes: { orden: number }[];
};

/** Las fotos las sirve el backend por medio de nuestra ruta (FE-01.1). */
const ruta = (id: string, orden: number) => `/publicaciones/${id}/imagenes/${orden}`;

/** Fotos de la publicación (H12): una grande y las demás como miniaturas para elegir. */
export function GaleriaFotos({ publicacionId, nombre, imagenes }: Props) {
  const [elegida, setElegida] = useState(0);

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
        Sin fotografías
      </div>
    );
  }

  const actual = imagenes[Math.min(elegida, imagenes.length - 1)];

  return (
    <section aria-label="Fotografías" className="flex flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- la sirve el backend por medio de nuestra ruta */}
      <img
        src={ruta(publicacionId, actual.orden)}
        alt={`${nombre}, foto ${elegida + 1} de ${imagenes.length}`}
        className="aspect-video w-full rounded-md object-cover"
      />
      {imagenes.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto">
          {imagenes.map((img, i) => (
            <li key={img.orden} className="shrink-0">
              <button
                type="button"
                onClick={() => setElegida(i)}
                aria-label={`Ver la foto ${i + 1}`}
                aria-current={i === elegida}
                className="block rounded-md border-2 border-transparent aria-[current=true]:border-foreground"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- la sirve el backend por medio de nuestra ruta */}
                <img
                  src={ruta(publicacionId, img.orden)}
                  alt=""
                  loading="lazy"
                  className="h-16 w-24 rounded object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
