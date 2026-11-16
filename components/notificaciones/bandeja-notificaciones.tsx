"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeRed,
  SesionExpiradaError,
  esAbortado,
  obtenerBandeja,
} from "@/lib/notificaciones/cliente";
import { LIMITE_PAGINA, type Notificacion } from "@/lib/notificaciones/tipos";
import { ItemNotificacion } from "./item-notificacion";

type Filtro = "todas" | "no-leidas";

function mensajeDeError(error: unknown) {
  return error instanceof ErrorDeRed
    ? "No se pudieron cargar las notificaciones. Revisa tu conexión."
    : "No se pudieron cargar las notificaciones. Inténtalo de nuevo.";
}

type Props = {
  id?: string;
  /** Se pulsó «Actualizar»: el ícono vuelve a pedir el conteo. */
  onActualizar: () => void;
  /** Una pendiente pasó a leída. */
  onMarcada: () => void;
  /** Un PATCH respondió 404: el conteo ya no es confiable. */
  onCaducada: () => void;
};

export function BandejaNotificaciones({ id, onActualizar, onMarcada, onCaducada }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  // Cambia para volver a pedir la primera página con el mismo filtro.
  const [recarga, setRecarga] = useState(0);
  const [items, setItems] = useState<Notificacion[]>([]);
  // Total del backend con el filtro aplicado, ajustado con lo que sale del
  // filtro desde la última respuesta.
  const [total, setTotal] = useState(0);
  // Posición, en el estado actual del backend, de la primera notificación que
  // todavía no se cargó. La API pagina por número de página: si un item sale
  // del filtro (caducó, o se marcó leída en «No leídas»), las páginas se
  // corren uno y pedir `page + 1` se saltaría una notificación.
  const [siguiente, setSiguiente] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Primera página. Los setState síncronos (cargando, limpiar) van en los
  // handlers que disparan la recarga; aquí solo se aplica la respuesta.
  useEffect(() => {
    const controller = new AbortController();
    obtenerBandeja(
      { soloNoLeidas: filtro === "no-leidas", page: 1, limit: LIMITE_PAGINA },
      controller.signal,
    )
      .then((bandeja) => {
        setItems(bandeja.items);
        setTotal(bandeja.total);
        setSiguiente(bandeja.items.length);
        setError(null);
        setCargando(false);
      })
      .catch((e: unknown) => {
        if (esAbortado(e) || e instanceof SesionExpiradaError) return;
        setError(mensajeDeError(e));
        setCargando(false);
      });
    return () => controller.abort();
  }, [filtro, recarga]);

  function prepararRecarga() {
    setCargando(true);
    setError(null);
    setErrorMas(null);
    setAviso(null);
  }

  function cambiarFiltro(nuevo: Filtro) {
    if (nuevo === filtro) return;
    prepararRecarga();
    setItems([]);
    setTotal(0);
    setFiltro(nuevo);
  }

  function reintentar() {
    prepararRecarga();
    setRecarga((n) => n + 1);
  }

  function actualizar() {
    reintentar();
    onActualizar();
  }

  async function cargarMas() {
    setCargandoMas(true);
    setErrorMas(null);
    try {
      // La página que contiene la siguiente posición. Si no está alineada, la
      // página repite algunas ya cargadas, que se descartan por id.
      const page = Math.floor(siguiente / LIMITE_PAGINA) + 1;
      const bandeja = await obtenerBandeja({
        soloNoLeidas: filtro === "no-leidas",
        page,
        limit: LIMITE_PAGINA,
      });
      setItems((actuales) => {
        const ids = new Set(actuales.map((n) => n.id));
        return [...actuales, ...bandeja.items.filter((n) => !ids.has(n.id))];
      });
      setTotal(bandeja.total);
      setSiguiente((page - 1) * LIMITE_PAGINA + bandeja.items.length);
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setErrorMas(mensajeDeError(e));
    } finally {
      setCargandoMas(false);
    }
  }

  function marcada(actualizada: Notificacion) {
    setItems((actuales) =>
      actuales.map((n) => (n.id === actualizada.id ? actualizada : n)),
    );
    if (filtro === "no-leidas") {
      // Ya no cumple el filtro en el backend: se queda a la vista como leída,
      // pero las posiciones de las siguientes bajan en uno.
      setSiguiente((p) => Math.max(0, p - 1));
      setTotal((t) => Math.max(0, t - 1));
    }
    setAviso(null);
    onMarcada();
  }

  function caducada(idCaducada: string) {
    setItems((actuales) => actuales.filter((n) => n.id !== idCaducada));
    setTotal((t) => Math.max(0, t - 1));
    setSiguiente((p) => Math.max(0, p - 1));
    setAviso("Esa notificación ya no está disponible y se quitó de la lista.");
    onCaducada();
  }

  const hayMas = !cargando && !error && siguiente < total;

  return (
    <section
      id={id}
      aria-label="Bandeja de notificaciones"
      className="flex max-h-[inherit] flex-col"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-base font-semibold">Notificaciones</h2>
        <button
          type="button"
          onClick={actualizar}
          disabled={cargando}
          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium transition-opacity disabled:opacity-60 dark:border-zinc-700"
        >
          {cargando && items.length > 0 ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div
        role="group"
        aria-label="Filtro"
        className="flex gap-1 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800"
      >
        {(
          [
            ["todas", "Todas"],
            ["no-leidas", "No leídas"],
          ] as const
        ).map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => cambiarFiltro(valor)}
            className={`rounded-md px-3 py-1 text-sm ${
              filtro === valor
                ? "bg-foreground font-medium text-background"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="empty:hidden px-4 pt-3 text-sm text-zinc-700 dark:text-zinc-300">
        {aviso}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {cargando && items.length === 0 ? (
          <p role="status" className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Cargando notificaciones...
          </p>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={reintentar}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {filtro === "no-leidas"
              ? "No tienes notificaciones pendientes."
              : "No tienes notificaciones."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((n) => (
              <ItemNotificacion
                key={n.id}
                notificacion={n}
                onMarcada={marcada}
                onCaducada={caducada}
              />
            ))}
          </ul>
        )}

        {(hayMas || errorMas) && (
          <div className="flex flex-col items-center gap-2 px-4 py-3">
            {errorMas && (
              <p role="alert" className="text-sm text-red-600">
                {errorMas}
              </p>
            )}
            <button
              type="button"
              onClick={cargarMas}
              disabled={cargandoMas}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
            >
              {cargandoMas ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
