"use client";

import { useEffect, useState } from "react";
import { MAX_FOTOS } from "@/lib/publicaciones/reglas";

type Props = {
  error?: string;
};

/** Selector de fotos con vista previa. El input sigue siendo parte del form. */
export function CargaImagenes({ error }: Props) {
  const [previas, setPrevias] = useState<{ url: string; nombre: string }[]>([]);

  // Libera las URLs de vista previa cuando cambian o se desmonta.
  useEffect(() => () => previas.forEach((p) => URL.revokeObjectURL(p.url)), [previas]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="imagenes" className="text-sm font-medium">
        Fotografías
      </label>
      <input
        id="imagenes"
        name="imagenes"
        type="file"
        accept="image/jpeg,image/png"
        multiple
        aria-describedby="imagenes-ayuda imagenes-error"
        onChange={(e) => {
          const archivos = Array.from(e.target.files ?? []);
          setPrevias(archivos.map((f) => ({ url: URL.createObjectURL(f), nombre: f.name })));
        }}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-1.5 dark:file:border-zinc-700"
      />
      <p id="imagenes-ayuda" className="text-xs text-zinc-500">
        De 1 a {MAX_FOTOS} fotos JPG o PNG, de máximo 5 MB cada una. La primera es la portada.
      </p>
      {previas.length > 0 && (
        <ul className="mt-2 grid grid-cols-4 gap-2">
          {previas.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img
                src={p.url}
                alt={p.nombre}
                className="aspect-square w-full rounded-md object-cover"
              />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">
                  Portada
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p id="imagenes-error" aria-live="polite" className="min-h-4 text-sm text-red-600">
        {error}
      </p>
    </div>
  );
}
