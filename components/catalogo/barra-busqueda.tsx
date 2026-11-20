"use client";

import { useState } from "react";
import { BUSCAR_MAX } from "@/lib/catalogo/tipos";

type Props = {
  /** Texto de la búsqueda que está aplicada. */
  valor: string;
  /** Recibe el texto recortado; vacío quita la búsqueda. */
  onBuscar: (texto: string) => void;
};

/** Campo de búsqueda del catálogo (H02): busca al enviar y se puede borrar. */
export function BarraBusqueda({ valor, onBuscar }: Props) {
  const [texto, setTexto] = useState(valor);
  // Si la búsqueda aplicada cambia desde afuera (p. ej. "Borrar búsqueda" del
  // estado vacío), el campo la sigue.
  const [aplicado, setAplicado] = useState(valor);
  if (aplicado !== valor) {
    setAplicado(valor);
    setTexto(valor);
  }

  return (
    <form
      role="search"
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onBuscar(texto.trim());
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="buscar-catalogo" className="text-sm font-medium">
          Buscar equipos y espacios
        </label>
        <input
          id="buscar-catalogo"
          type="search"
          value={texto}
          maxLength={BUSCAR_MAX}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Por ejemplo: taladro, salón, proyector"
          className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Buscar
      </button>
      {(texto || valor) && (
        <button
          type="button"
          onClick={() => {
            setTexto("");
            onBuscar("");
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Borrar búsqueda
        </button>
      )}
    </form>
  );
}
