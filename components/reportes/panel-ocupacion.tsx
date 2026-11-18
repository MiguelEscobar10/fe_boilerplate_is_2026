"use client";

import { useEffect, useState } from "react";
import { ErrorDeApi, ErrorDeRed, SesionExpiradaError, obtenerOcupacion } from "@/lib/reportes/cliente";
import { mesEnCurso, type RangoFechas, type ReporteOcupacion } from "@/lib/reportes/tipos";
import { SelectorRangoFechas } from "./selector-rango-fechas";
import { TablaOcupacionPorBien } from "./tabla-ocupacion-por-bien";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "restringido" }
  | { tipo: "listo"; reporte: ReporteOcupacion };

function mensajeDe(error: unknown) {
  if (error instanceof ErrorDeApi && error.status === 400 && error.detalle) return error.detalle;
  return error instanceof ErrorDeRed
    ? "No se pudo cargar el reporte. Revisa tu conexión."
    : "No se pudo cargar el reporte. Inténtalo de nuevo.";
}

const fecha = (dia: string) =>
  new Intl.DateTimeFormat("es", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${dia}T00:00:00Z`),
  );

/**
 * Panel de tasa de ocupación del arrendador (H22). Por defecto, el mes en
 * curso. Si el backend responde 403 (no es arrendador), muestra "Acceso
 * restringido" sin datos: la seguridad real la decide el backend.
 */
export function PanelOcupacion({ rangoInicial }: { rangoInicial?: RangoFechas }) {
  const [rango, setRango] = useState<RangoFechas>(() => rangoInicial ?? mesEnCurso());
  const [recarga, setRecarga] = useState(0);
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });

  useEffect(() => {
    const control = new AbortController();
    obtenerOcupacion(rango, control.signal)
      .then((reporte) => setCarga({ tipo: "listo", reporte }))
      .catch((e: unknown) => {
        if (control.signal.aborted || e instanceof SesionExpiradaError) return;
        setCarga(
          e instanceof ErrorDeApi && e.status === 403
            ? { tipo: "restringido" }
            : { tipo: "error", mensaje: mensajeDe(e) },
        );
      });
    return () => control.abort();
  }, [rango, recarga]);

  function cambiar(nuevo: RangoFechas) {
    setCarga({ tipo: "cargando" });
    setRango(nuevo);
    setRecarga((n) => n + 1);
  }

  if (carga.tipo === "restringido") {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Solo los arrendadores pueden ver la tasa de ocupación de sus bienes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectorRangoFechas rango={rango} onCambio={cambiar} deshabilitado={carga.tipo === "cargando"} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Días ocupados y disponibles de cada bien del {fecha(rango.desde)} al {fecha(rango.hasta)}.
        Los días bloqueados no cuentan como disponibles.
      </p>
      {carga.tipo === "cargando" && <p role="status">Cargando el reporte...</p>}
      {carga.tipo === "error" && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>{carga.mensaje}</p>
          <button
            type="button"
            onClick={() => cambiar(rango)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Reintentar
          </button>
        </div>
      )}
      {carga.tipo === "listo" && <TablaOcupacionPorBien items={carga.reporte.items} />}
    </div>
  );
}
