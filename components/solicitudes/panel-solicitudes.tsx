"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeRed,
  SesionExpiradaError,
  esAbortado,
  obtenerSolicitudes,
} from "@/lib/solicitudes/cliente";
import {
  ESTADOS,
  POR_PAGINA,
  type Decision,
  type DecisionGuardada,
  type EstadoReserva,
  type Solicitud,
} from "@/lib/solicitudes/tipos";
import { DetalleSolicitud, type ErrorDecision } from "./detalle-solicitud";
import { TablaSolicitudes } from "./tabla-solicitudes";

function mensajeDeError(error: unknown) {
  return error instanceof ErrorDeRed
    ? "No se pudieron cargar las solicitudes. Revisa tu conexión."
    : "No se pudieron cargar las solicitudes. Inténtalo de nuevo.";
}

/** Deja el filtro y la página en la URL, para poder recargar o compartirla. */
function actualizarUrl(estado: EstadoReserva | null, page: number) {
  const query = new URLSearchParams();
  if (estado) query.set("estado", estado);
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

type Abierta = { id: string; decision?: Decision };

type Props = {
  estadoInicial?: EstadoReserva | null;
  paginaInicial?: number;
};

/**
 * Panel "Mis solicitudes" del arrendador (H04): la tabla con filtro por estado
 * y paginación de 12 en 12, y el detalle de la que se abre para decidir.
 */
export function PanelSolicitudes({ estadoInicial = null, paginaInicial = 1 }: Props) {
  const [estado, setEstado] = useState<EstadoReserva | null>(estadoInicial);
  const [page, setPage] = useState(paginaInicial);
  // Cambia para volver a pedir la misma página.
  const [recarga, setRecarga] = useState(0);
  const [items, setItems] = useState<Solicitud[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Abierta | null>(null);
  // Error de una decisión (409 o 404) cuya solicitud puede salir de la lista
  // al recargar, por ejemplo con el filtro PENDIENTE. Así no se pierde.
  const [aviso, setAviso] = useState<(ErrorDecision & { id: string }) | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    obtenerSolicitudes({ estado, page, limit: POR_PAGINA }, controller.signal)
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
  }, [estado, page, recarga]);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const solicitudAbierta = abierta ? items.find((s) => s.id === abierta.id) : undefined;

  function cambiarEstado(valor: string) {
    const nuevo = valor === "" ? null : (valor as EstadoReserva);
    setAviso(null);
    setCargando(true);
    setError(null);
    setAbierta(null);
    setEstado(nuevo);
    setPage(1);
    actualizarUrl(nuevo, 1);
  }

  function irAPagina(nueva: number) {
    setAviso(null);
    setCargando(true);
    setError(null);
    setAbierta(null);
    setPage(nueva);
    actualizarUrl(estado, nueva);
  }

  function recargar() {
    setCargando(true);
    setError(null);
    setRecarga((n) => n + 1);
  }

  // 200: se actualiza solo esa fila con lo que devolvió el backend. Se queda
  // a la vista aunque ya no cumpla el filtro, para que se vea el resultado.
  function decidida(resultado: DecisionGuardada) {
    setItems((actuales) =>
      actuales.map((s) =>
        s.id === resultado.id
          ? {
              ...s,
              estado: resultado.estado,
              decididaAt: resultado.decididaAt,
              motivoRechazo: resultado.motivoRechazo,
            }
          : s,
      ),
    );
  }

  // Solo hace falta cuando la solicitud ya no está en la lista: si sigue, el
  // detalle muestra el mismo error.
  const avisoVisible = aviso && !items.some((s) => s.id === aviso.id) ? aviso : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-estado" className="text-sm font-medium">
            Filtrar por estado
          </label>
          <select
            id="filtro-estado"
            value={estado ?? ""}
            onChange={(e) => cambiarEstado(e.target.value)}
            className="rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700"
          >
            <option value="">Todas</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Más recientes primero · {POR_PAGINA} por página
          </p>
          <button
            type="button"
            onClick={recargar}
            disabled={cargando}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
          >
            Actualizar
          </button>
        </div>
      </div>

      {avisoVisible && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <p>{avisoVisible.mensaje}</p>
          {avisoVisible.detalle && <p className="mt-1 text-xs">{avisoVisible.detalle}</p>}
        </div>
      )}

      {cargando && items.length === 0 ? (
        <p role="status" className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Cargando solicitudes...
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={recargar}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {estado ? `No tienes solicitudes en estado ${estado}.` : "Aún no tienes solicitudes"}
        </p>
      ) : (
        <>
          <TablaSolicitudes
            solicitudes={items}
            seleccionadaId={abierta?.id ?? null}
            onAbrir={(s, decision) => {
              setAviso(null);
              setAbierta({ id: s.id, decision });
            }}
          />
          {paginas > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                onClick={() => irAPagina(page - 1)}
                disabled={page <= 1 || cargando}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
              >
                Anterior
              </button>
              <span className="tabular-nums">
                Página {page} de {paginas}
              </span>
              <button
                type="button"
                onClick={() => irAPagina(page + 1)}
                disabled={page >= paginas || cargando}
                className="rounded-md border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}

      {solicitudAbierta && abierta && (
        <DetalleSolicitud
          // Otra solicitud o la misma con otra acción: el detalle empieza de cero.
          key={`${abierta.id}-${abierta.decision ?? "ver"}`}
          solicitud={solicitudAbierta}
          decisionInicial={abierta.decision}
          onDecidida={decidida}
          onDesactualizada={(error) => {
            setAviso({ ...error, id: abierta.id });
            recargar();
          }}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}
