"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeRed,
  SesionExpiradaError,
  esAbortado,
  obtenerCatalogo,
} from "@/lib/catalogo/cliente";
import {
  POR_PAGINA,
  type ConsultaCatalogo,
  type PublicacionResumen,
} from "@/lib/catalogo/tipos";
import { BarraBusqueda } from "./barra-busqueda";
import { Paginacion } from "./paginacion";
import { TarjetaPublicacion } from "./tarjeta-publicacion";

function mensajeDeError(error: unknown) {
  return error instanceof ErrorDeRed
    ? "No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo."
    : "No se pudo cargar el catálogo. Inténtalo de nuevo.";
}

/** Deja la búsqueda y la página en la URL, para poder recargar o compartirla. */
function actualizarUrl({ buscar, page }: ConsultaCatalogo) {
  const query = new URLSearchParams();
  if (buscar) query.set("buscar", buscar);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

type Props = {
  buscarInicial?: string;
  paginaInicial?: number;
};

/**
 * Catálogo de publicaciones (H02): barra de búsqueda, tarjetas de 12 en 12 y
 * paginación. Estados: cargando, resultados, vacío y error con reintento.
 */
export function ListadoCatalogo({ buscarInicial = "", paginaInicial = 1 }: Props) {
  const [consulta, setConsulta] = useState<ConsultaCatalogo>({
    buscar: buscarInicial,
    page: paginaInicial,
  });
  // Cambia para volver a pedir la misma consulta.
  const [recarga, setRecarga] = useState(0);
  const [items, setItems] = useState<PublicacionResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerCatalogo(consulta, controller.signal)
      .then((pagina) => {
        setItems(pagina.items);
        setTotal(pagina.total);
        setError(null);
        setCargando(false);
      })
      .catch((e: unknown) => {
        if (esAbortado(e) || e instanceof SesionExpiradaError) return;
        setError(mensajeDeError(e));
        setCargando(false);
      });
    return () => controller.abort();
  }, [consulta, recarga]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  function consultar(nueva: ConsultaCatalogo) {
    setCargando(true);
    setError(null);
    setConsulta(nueva);
    actualizarUrl(nueva);
  }

  function reintentar() {
    setCargando(true);
    setError(null);
    setRecarga((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <BarraBusqueda
        valor={consulta.buscar}
        onBuscar={(buscar) => consultar({ ...consulta, buscar, page: 1 })}
      />

      {cargando ? (
        <p role="status" className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Cargando publicaciones...
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
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
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {consulta.buscar
              ? `No encontramos publicaciones para «${consulta.buscar}». Prueba con otra palabra o borra la búsqueda.`
              : "Todavía no hay publicaciones disponibles."}
          </p>
          {consulta.buscar && (
            <button
              type="button"
              onClick={() => consultar({ ...consulta, buscar: "", page: 1 })}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Ver todas las publicaciones
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {total === 1 ? "1 publicación" : `${total} publicaciones`} · más recientes primero
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.id}>
                <TarjetaPublicacion publicacion={p} />
              </li>
            ))}
          </ul>
          <Paginacion
            page={consulta.page}
            paginas={paginas}
            onCambiar={(page) => consultar({ ...consulta, page })}
          />
        </>
      )}
    </div>
  );
}
