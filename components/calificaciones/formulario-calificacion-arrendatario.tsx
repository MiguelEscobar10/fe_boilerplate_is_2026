"use client";

import { useId, useRef, useState } from "react";
import {
  CalificacionRechazadaError,
  calificarArrendatario,
} from "@/lib/calificaciones/cliente";
import { validarCalificacion, type ErroresCalificacion } from "@/lib/calificaciones/reglas";
import { COMENTARIO_MAX } from "@/lib/calificaciones/tipos";
import { ErrorDeRed, SesionExpiradaError } from "@/lib/solicitudes/cliente";
import { formatearPeriodo } from "@/lib/solicitudes/formato";
import type { Solicitud } from "@/lib/solicitudes/tipos";
import { ContadorComentario } from "./contador-comentario";
import { SelectorEstrellas } from "./selector-estrellas";

/** Cómo terminó el envío, para que el panel actualice la fila. */
export type ResultadoCalificacion =
  /** 201, o 409: la reserva ya tiene calificación. */
  | "calificada"
  /** 422 o 404: la fila ya no refleja el estado real; hay que recargar. */
  | "desactualizada";

function mensajeDeError(e: unknown): string {
  if (e instanceof CalificacionRechazadaError) {
    if (e.status === 409) return "Esta reserva ya fue calificada.";
    if (e.status === 422) {
      return "Solo puedes calificar al arrendatario de una reserva COMPLETADA.";
    }
    if (e.status === 404) return "Esta reserva ya no existe.";
    if (e.status === 403) return "Tu cuenta no puede calificar arrendatarios.";
    if (e.status === 400 && e.message) return e.message;
  }
  if (e instanceof ErrorDeRed) {
    return "No se pudo enviar la calificación. Revisa tu conexión.";
  }
  return "No se pudo enviar la calificación. Inténtalo de nuevo.";
}

type Props = {
  reserva: Solicitud;
  onTerminado: (resultado: ResultadoCalificacion) => void;
  onCerrar: () => void;
};

/**
 * Formulario para calificar al arrendatario de una reserva COMPLETADA (H18):
 * de 1 a 5 estrellas y un comentario opcional de hasta 500 caracteres.
 */
export function FormularioCalificacionArrendatario({ reserva, onTerminado, onCerrar }: Props) {
  const idComentario = useId();
  const idContador = useId();
  const idErrorPuntaje = useId();
  const [puntaje, setPuntaje] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState<ErroresCalificacion>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  // Corta un segundo envío que llegue antes de que React actualice `enviando`.
  const enviandoRef = useRef(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current || listo) return;

    const encontrados = validarCalificacion(puntaje, comentario);
    setErrores(encontrados);
    if (encontrados.puntaje || encontrados.comentario || puntaje === null) return;

    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      await calificarArrendatario(reserva.id, puntaje, comentario.trim() || undefined);
      setListo(true);
      onTerminado("calificada");
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setError(mensajeDeError(e));
      if (e instanceof CalificacionRechazadaError) {
        if (e.status === 409) onTerminado("calificada");
        if (e.status === 422 || e.status === 404) onTerminado("desactualizada");
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <section
      aria-labelledby={`calificar-${reserva.id}`}
      className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id={`calificar-${reserva.id}`} className="text-lg font-semibold">
            Calificar a {reserva.arrendatario.nombre}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {reserva.publicacion.nombre} · {formatearPeriodo(reserva.inicio, reserva.fin)}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          disabled={enviando}
          className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Cerrar
        </button>
      </div>

      {listo ? (
        <p
          role="status"
          className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Calificación guardada. Gracias por calificar a {reserva.arrendatario.nombre}.
        </p>
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <SelectorEstrellas
              valor={puntaje}
              onCambiar={(n) => {
                setPuntaje(n);
                setErrores((e) => ({ ...e, puntaje: undefined }));
              }}
              deshabilitado={enviando}
              idError={errores.puntaje ? idErrorPuntaje : undefined}
            />
            {errores.puntaje && (
              <p id={idErrorPuntaje} className="text-sm text-red-600">
                {errores.puntaje}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={idComentario} className="text-sm font-medium">
              Comentario (opcional)
            </label>
            <textarea
              id={idComentario}
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                setErrores((er) => ({ ...er, comentario: undefined }));
              }}
              maxLength={COMENTARIO_MAX}
              rows={3}
              disabled={enviando}
              aria-describedby={idContador}
              aria-invalid={Boolean(errores.comentario)}
              placeholder="Por ejemplo: devolvió el equipo a tiempo y en buen estado."
              className="w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
            />
            <ContadorComentario id={idContador} largo={comentario.length} />
            {errores.comentario && <p className="text-sm text-red-600">{errores.comentario}</p>}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Enviar calificación"}
            </button>
            <button
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
