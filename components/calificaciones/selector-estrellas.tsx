"use client";

import { useId } from "react";
import { PUNTAJE_MAX, PUNTAJE_MIN } from "@/lib/calificaciones/tipos";

type Props = {
  valor: number | null;
  onCambiar: (valor: number) => void;
  deshabilitado?: boolean;
  /** id del mensaje de error, para aria-describedby. */
  idError?: string;
};

const PUNTAJES = Array.from(
  { length: PUNTAJE_MAX - PUNTAJE_MIN + 1 },
  (_, i) => PUNTAJE_MIN + i,
);

/**
 * Estrellas de 1 a 5. Por dentro son radios, así se eligen también con el
 * teclado (flechas) y el lector de pantalla dice "3 estrellas, 3 de 5".
 */
export function SelectorEstrellas({ valor, onCambiar, deshabilitado, idError }: Props) {
  const nombre = useId();
  return (
    <fieldset aria-describedby={idError} className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Calificación del arrendatario (1 a 5)</legend>
      <div className="flex gap-1">
        {PUNTAJES.map((n) => {
          const llena = valor !== null && n <= valor;
          return (
            <label
              key={n}
              className={`cursor-pointer text-3xl leading-none transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:disabled]:cursor-not-allowed ${
                llena ? "text-amber-500" : "text-zinc-300 dark:text-zinc-600"
              }`}
            >
              <input
                type="radio"
                name={nombre}
                value={n}
                checked={valor === n}
                onChange={() => onCambiar(n)}
                disabled={deshabilitado}
                className="sr-only"
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              />
              <span aria-hidden="true">★</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {valor === null ? "Sin elegir" : `${valor} de ${PUNTAJE_MAX}`}
      </p>
    </fieldset>
  );
}
