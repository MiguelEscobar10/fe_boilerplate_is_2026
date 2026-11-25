"use client";

import { useEffect, useId, useState } from "react";
import {
  ErrorDeApi,
  SesionExpiradaError,
  decidir,
  obtenerCola,
  urlDocumento,
} from "@/lib/verificacion/cliente";
import {
  LARGO_MAXIMO_MOTIVO,
  type Decision,
  type SolicitudEnCola,
} from "@/lib/verificacion/tipos";
import { fecha, mensajeGeneral } from "./mensajes";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "restringido" }
  | { tipo: "listo"; solicitudes: SolicitudEnCola[] };

/**
 * Cola de revisión del REVISOR (H07, BE-07.2): solicitudes PENDIENTE en orden
 * de llegada, el documento por la ruta protegida y la decisión.
 *
 * Si el backend responde 403 (otra cuenta), se muestra "Acceso restringido"
 * y no se ve ninguna acción: la seguridad real la decide el backend.
 */
export function ColaRevision() {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerCola("PENDIENTE")
      .then((solicitudes) => {
        if (vigente) setCarga({ tipo: "listo", solicitudes });
      })
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        setCarga(
          e instanceof ErrorDeApi && e.status === 403
            ? { tipo: "restringido" }
            : { tipo: "error", mensaje: mensajeGeneral(e, "cargar las solicitudes") },
        );
      });
    return () => {
      vigente = false;
    };
  }, [recarga]);

  function recargar() {
    setCarga({ tipo: "cargando" });
    setAviso(null);
    setRecarga((n) => n + 1);
  }

  function quitar(id: string, mensaje: string) {
    setCarga((actual) =>
      actual.tipo === "listo"
        ? { tipo: "listo", solicitudes: actual.solicitudes.filter((s) => s.id !== id) }
        : actual,
    );
    setAviso(mensaje);
  }

  if (carga.tipo === "cargando") {
    return <p role="status">Cargando solicitudes...</p>;
  }
  if (carga.tipo === "restringido") {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Solo el revisor puede ver y decidir las solicitudes de verificación.
        </p>
      </div>
    );
  }
  if (carga.tipo === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>{carga.mensaje}</p>
        <button type="button" onClick={recargar} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {carga.solicitudes.length === 1
            ? "1 solicitud pendiente"
            : `${carga.solicitudes.length} solicitudes pendientes`}
        </p>
        <button type="button" onClick={recargar} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Actualizar
        </button>
      </div>
      {aviso && (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      )}
      {carga.solicitudes.length === 0 ? (
        <p>No hay solicitudes pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {carga.solicitudes.map((solicitud) => (
            <ItemSolicitud key={solicitud.id} solicitud={solicitud} onResuelta={quitar} />
          ))}
        </ul>
      )}
    </div>
  );
}

type ItemProps = {
  solicitud: SolicitudEnCola;
  /** Ya no está pendiente (decidida aquí o por otra persona). */
  onResuelta: (id: string, mensaje: string) => void;
};

function ItemSolicitud({ solicitud, onResuelta }: ItemProps) {
  const idMotivo = useId();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombre = solicitud.usuario.nombre ?? solicitud.usuario.email;

  async function enviar(decision: Decision) {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await decidir(
        solicitud.id,
        decision,
        decision === "RECHAZAR" ? motivo.trim() || undefined : undefined,
      );
      onResuelta(
        solicitud.id,
        resultado.estado === "APROBADA"
          ? `Aprobaste la verificación de ${nombre}.`
          : `Rechazaste la verificación de ${nombre}.`,
      );
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      if (e instanceof ErrorDeApi && (e.status === 409 || e.status === 404)) {
        onResuelta(solicitud.id, `La solicitud de ${nombre} ya fue resuelta por otra persona.`);
        return;
      }
      setError(
        e instanceof ErrorDeApi && e.status === 400
          ? (e.detalle ?? "Revisa el motivo e inténtalo de nuevo.")
          : mensajeGeneral(e, "registrar la decisión"),
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800">
      <div className="min-w-0">
        <p className="truncate font-medium">{nombre}</p>
        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">{solicitud.usuario.email}</p>
        <p className="text-xs text-zinc-500">Enviada el {fecha(solicitud.enviadaAt)}</p>
        <a
          href={urlDocumento(solicitud.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm underline"
        >
          Ver documento de {nombre}
        </a>
      </div>

      <div className="flex flex-col gap-2 sm:w-72">
        {rechazando ? (
          <>
            <label htmlFor={idMotivo} className="text-sm font-medium">
              Motivo del rechazo (opcional)
            </label>
            <textarea
              id={idMotivo}
              value={motivo}
              maxLength={LARGO_MAXIMO_MOTIVO}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() => enviar("RECHAZAR")}
                className="rounded-md border border-zinc-400 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-60 dark:border-zinc-600 dark:text-red-400"
              >
                Confirmar rechazo
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => setRechazando(false)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={() => enviar("APROBAR")}
              className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setRechazando(true)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Rechazar
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
