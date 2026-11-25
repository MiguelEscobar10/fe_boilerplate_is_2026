"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarioDisponibilidad } from "@/components/disponibilidad/calendario-disponibilidad";
import {
  ErrorDeRed,
  RespuestaError,
  SesionExpiradaError,
  crearBloqueo,
  esAbortado,
  listarBloqueos,
} from "@/lib/disponibilidad/cliente";
import { aIsoLocal, formatearDiaCorto, hoyLocal, sumarDias } from "@/lib/disponibilidad/fechas";
import type { Bloqueo } from "@/lib/disponibilidad/tipos";
import {
  FormularioBloqueo,
  validarBloqueo,
  type DatosBloqueo,
  type ErroresBloqueo,
} from "./formulario-bloqueo";
import { TablaBloqueos } from "./tabla-bloqueos";

/** FE-14.1: el texto del 409. */
export const MENSAJE_RANGO_OCUPADO = "El rango incluye una reserva CONFIRMADA.";

const VACIO: DatosBloqueo = { desde: "", hasta: "", motivo: "" };

type Aviso = { tipo: "exito" | "error"; mensaje: string; detalle?: string };

function avisoDeError(e: unknown): Aviso {
  if (e instanceof RespuestaError) {
    if (e.status === 409) {
      return { tipo: "error", mensaje: MENSAJE_RANGO_OCUPADO, detalle: e.message || undefined };
    }
    if (e.status === 403) {
      return { tipo: "error", mensaje: "Acceso restringido: esta publicación no es tuya." };
    }
    if (e.status === 404) return { tipo: "error", mensaje: "Publicación no encontrada." };
    if (e.status === 400 && e.message) return { tipo: "error", mensaje: e.message };
  }
  if (e instanceof ErrorDeRed) {
    return { tipo: "error", mensaje: "No se pudo bloquear. Revisa tu conexión." };
  }
  return { tipo: "error", mensaje: "No se pudo bloquear. Inténtalo de nuevo." };
}

/**
 * Pantalla de bloqueos de una publicación (H14): el calendario, el formulario
 * y la lista de bloqueos. Los días se pueden elegir pulsando el calendario:
 * el primer clic marca Desde y el segundo Hasta.
 */
export function BloqueoFechas({ publicacionId }: { publicacionId: string }) {
  const hoy = hoyLocal();
  const [datos, setDatos] = useState<DatosBloqueo>(VACIO);
  const [errores, setErrores] = useState<ErroresBloqueo>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [bloqueos, setBloqueos] = useState<Bloqueo[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  // Corta un segundo envío que llegue antes de que React actualice `enviando`.
  const enviandoRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    listarBloqueos(publicacionId, controller.signal)
      .then((r) => {
        setBloqueos(r.items);
        setErrorLista(null);
      })
      .catch((e: unknown) => {
        if (esAbortado(e) || e instanceof SesionExpiradaError) return;
        setErrorLista(
          e instanceof RespuestaError && e.status === 403
            ? "Acceso restringido: esta publicación no es tuya."
            : "No se pudieron cargar tus bloqueos.",
        );
      });
    return () => controller.abort();
  }, [publicacionId, recarga]);

  function elegirDia(dia: string) {
    setErrores({});
    setDatos((d) =>
      // Sin Desde, o con un rango ya completo, o antes de Desde: empieza de nuevo.
      !d.desde || (d.hasta && d.hasta !== d.desde) || dia < d.desde
        ? { ...d, desde: dia, hasta: dia }
        : { ...d, hasta: dia },
    );
  }

  async function enviar() {
    if (enviandoRef.current) return;
    const encontrados = validarBloqueo(datos, hoy);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    enviandoRef.current = true;
    setEnviando(true);
    setAviso(null);
    try {
      const motivo = datos.motivo.trim();
      await crearBloqueo(publicacionId, {
        inicio: aIsoLocal(datos.desde),
        // Hasta va incluido: el bloqueo termina cuando empieza el día siguiente.
        fin: aIsoLocal(sumarDias(datos.hasta, 1)),
        ...(motivo ? { motivo } : {}),
      });
      setAviso({
        tipo: "exito",
        mensaje:
          datos.desde === datos.hasta
            ? `Bloqueaste el ${formatearDiaCorto(datos.desde)}.`
            : `Bloqueaste del ${formatearDiaCorto(datos.desde)} al ${formatearDiaCorto(datos.hasta)}.`,
      });
      setDatos(VACIO);
      setRecarga((n) => n + 1);
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setAviso(avisoDeError(e));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr]">
      <CalendarioDisponibilidad
        publicacionId={publicacionId}
        recarga={recarga}
        seleccion={{ desde: datos.desde || null, hasta: datos.hasta || null }}
        onElegirDia={enviando ? undefined : elegirDia}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <FormularioBloqueo
          datos={datos}
          errores={errores}
          hoy={hoy}
          enviando={enviando}
          onCambiar={(d) => {
            setDatos(d);
            setErrores({});
          }}
          onEnviar={enviar}
          onCancelar={() => {
            setDatos(VACIO);
            setErrores({});
            setAviso(null);
          }}
        />

        {aviso && (
          <div
            role={aviso.tipo === "exito" ? "status" : "alert"}
            className={`rounded-md px-3 py-2 text-sm ${
              aviso.tipo === "exito"
                ? "border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                : "border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400"
            }`}
          >
            <p>{aviso.mensaje}</p>
            {aviso.detalle && <p className="mt-1 text-xs">{aviso.detalle}</p>}
          </div>
        )}

        <section aria-labelledby="titulo-bloqueos" className="flex flex-col gap-2">
          <h2 id="titulo-bloqueos" className="text-base font-semibold">
            Tus bloqueos
          </h2>
          {errorLista ? (
            <p role="alert" className="text-sm text-red-600">
              {errorLista}
            </p>
          ) : bloqueos === null ? (
            <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
              Cargando bloqueos...
            </p>
          ) : (
            <TablaBloqueos bloqueos={bloqueos} />
          )}
        </section>
      </div>
    </div>
  );
}
