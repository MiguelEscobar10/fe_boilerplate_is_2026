"use client";

import { useState, type FormEvent } from "react";
import { normalizarFiltros, validarFiltros } from "@/lib/catalogo/filtros";
import { UBICACION_MAX, type FiltrosCatalogo as Filtros } from "@/lib/catalogo/tipos";
import { hoyEnElSalvador } from "@/lib/ingresos/fechas";
import { TIPOS } from "@/lib/publicaciones/reglas";
import { SelectorRangoFechas } from "./selector-rango-fechas";

const CLASE_CAMPO =
  "w-full min-w-0 rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";

type Props = {
  /** Los filtros que están aplicados. */
  filtros: Filtros;
  /** Recibe filtros ya validados. */
  onAplicar: (filtros: Filtros) => void;
  /** Hay una consulta en curso: no se puede aplicar otra. */
  cargando: boolean;
};

/**
 * Panel de filtros del catálogo (H11): tipo, ubicación, rango de precios y
 * fechas disponibles. Valida antes de aplicar; con un rango inválido muestra
 * el error y no consulta, así los resultados no cambian.
 */
export function FiltrosCatalogo({ filtros, onAplicar, cargando }: Props) {
  const [borrador, setBorrador] = useState(filtros);
  const [error, setError] = useState<string | null>(null);
  // Si los filtros aplicados cambian desde afuera (quitar uno, limpiar), el
  // formulario los sigue.
  const [aplicados, setAplicados] = useState(filtros);
  if (aplicados !== filtros) {
    setAplicados(filtros);
    setBorrador(filtros);
    setError(null);
  }

  const cambiar = (cambios: Partial<Filtros>) => setBorrador((b) => ({ ...b, ...cambios }));

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const normalizados = normalizarFiltros(borrador);
    const problema = validarFiltros(normalizados);
    setError(problema);
    if (!problema) onAplicar(normalizados);
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label="Filtros del catálogo"
      className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="filtro-tipo" className="text-sm font-medium">
            Tipo
          </label>
          <select
            id="filtro-tipo"
            value={borrador.tipo}
            onChange={(e) => cambiar({ tipo: e.target.value as Filtros["tipo"] })}
            className={CLASE_CAMPO}
          >
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="filtro-ubicacion" className="text-sm font-medium">
            Ubicación
          </label>
          <input
            id="filtro-ubicacion"
            type="text"
            value={borrador.ubicacion}
            maxLength={UBICACION_MAX}
            onChange={(e) => cambiar({ ubicacion: e.target.value })}
            placeholder="Por ejemplo: San Salvador"
            className={CLASE_CAMPO}
          />
        </div>

        <fieldset className="flex min-w-0 flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Precio (USD)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="filtro-precio-min"
                className="text-xs text-zinc-600 dark:text-zinc-400"
              >
                Precio mínimo
              </label>
              <input
                id="filtro-precio-min"
                type="text"
                inputMode="decimal"
                value={borrador.precioMin}
                onChange={(e) => cambiar({ precioMin: e.target.value })}
                className={CLASE_CAMPO}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="filtro-precio-max"
                className="text-xs text-zinc-600 dark:text-zinc-400"
              >
                Precio máximo
              </label>
              <input
                id="filtro-precio-max"
                type="text"
                inputMode="decimal"
                value={borrador.precioMax}
                onChange={(e) => cambiar({ precioMax: e.target.value })}
                className={CLASE_CAMPO}
              />
            </div>
          </div>
        </fieldset>

        <SelectorRangoFechas
          inicio={borrador.fechaInicio}
          fin={borrador.fechaFin}
          minimo={hoyEnElSalvador()}
          onCambiar={({ inicio, fin }) => cambiar({ fechaInicio: inicio, fechaFin: fin })}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {cargando ? "Aplicando..." : "Aplicar filtros"}
        </button>
      </div>
    </form>
  );
}
