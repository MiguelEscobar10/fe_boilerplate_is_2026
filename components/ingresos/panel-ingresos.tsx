"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AccesoRestringidoError,
  ErrorDeRed,
  RangoInvalidoError,
  SesionExpiradaError,
  esAbortado,
  obtenerIngresos,
} from "@/lib/ingresos/cliente";
import { fechaLegible, mesEnCurso, validarRango } from "@/lib/ingresos/fechas";
import { formatearImporte } from "@/lib/ingresos/montos";
import type { RangoFechas, ReporteIngresos } from "@/lib/ingresos/tipos";
import { SelectorRangoFechas } from "./selector-rango-fechas";
import { TablaIngresosPorBien } from "./tabla-ingresos-por-bien";

function mensajeDeError(error: unknown) {
  return error instanceof ErrorDeRed
    ? "No se pudo cargar el reporte. Revisa tu conexión."
    : "No se pudo cargar el reporte. Inténtalo de nuevo.";
}

type Props = {
  /**
   * Rango de la primera consulta. La página lo calcula en el servidor para
   * que los campos coincidan al hidratar; por defecto, el mes en curso en
   * hora de El Salvador.
   */
  rangoInicial?: RangoFechas;
};

export function PanelIngresos({ rangoInicial }: Props) {
  const [inicial] = useState(() => rangoInicial ?? mesEnCurso());
  const [rango, setRango] = useState<RangoFechas>(inicial);
  // Cambia para volver a consultar (reintento o el mismo rango otra vez).
  const [recarga, setRecarga] = useState(0);
  const [reporte, setReporte] = useState<ReporteIngresos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorRango, setErrorRango] = useState<string | null>(null);
  const [restringido, setRestringido] = useState(false);

  // Los setState síncronos (cargando, limpiar errores) van en los handlers
  // que disparan la consulta; aquí solo se aplica la respuesta.
  useEffect(() => {
    const controller = new AbortController();
    obtenerIngresos(rango, controller.signal)
      .then((datos) => {
        setReporte(datos);
        setCargando(false);
      })
      .catch((e: unknown) => {
        if (esAbortado(e) || e instanceof SesionExpiradaError) return;
        if (e instanceof AccesoRestringidoError) {
          setRestringido(true);
        } else if (e instanceof RangoInvalidoError) {
          setErrorRango(e.message);
        } else {
          setError(mensajeDeError(e));
        }
        setCargando(false);
      });
    return () => controller.abort();
  }, [rango, recarga]);

  function consultar(nuevo: RangoFechas) {
    const invalido = validarRango(nuevo);
    setErrorRango(invalido);
    if (invalido) return;
    setError(null);
    setCargando(true);
    setRango(nuevo);
    setRecarga((n) => n + 1);
  }

  function reintentar() {
    setError(null);
    setErrorRango(null);
    setCargando(true);
    setRecarga((n) => n + 1);
  }

  if (restringido) {
    return (
      <div role="alert" className="py-8 text-center">
        <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tu cuenta no tiene permiso para ver el reporte de ingresos.
        </p>
      </div>
    );
  }

  const periodo = reporte
    ? `del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}`
    : "";

  let anuncio = "";
  if (cargando) anuncio = "Cargando ingresos...";
  else if (reporte && !error) {
    anuncio =
      reporte.porBien.length === 0
        ? `Reporte ${periodo}: no tienes bienes publicados.`
        : `Reporte ${periodo}: total ${formatearImporte(reporte.total)}.`;
  }

  return (
    <div className="flex flex-col gap-6">
      <SelectorRangoFechas
        rangoInicial={inicial}
        onConsultar={consultar}
        error={errorRango}
        consultando={cargando}
      />

      <p role="status" className="text-sm text-zinc-600 empty:hidden dark:text-zinc-400">
        {anuncio}
      </p>

      {error ? (
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
      ) : reporte ? (
        <section
          aria-label="Resultado del reporte"
          aria-busy={cargando}
          className={`flex flex-col gap-4 transition-opacity ${cargando ? "opacity-60" : ""}`}
        >
          {reporte.porBien.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
              <p className="mb-3 text-sm">Aún no tienes bienes publicados.</p>
              <Link href="/publicaciones/nueva" className="text-sm font-medium underline">
                Publicar un equipo o espacio
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total {periodo}
                </p>
                <p className="text-3xl font-semibold tabular-nums" data-testid="total-ingresos">
                  {formatearImporte(reporte.total)}
                </p>
              </div>
              <TablaIngresosPorBien porBien={reporte.porBien} total={reporte.total} periodo={periodo} />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
