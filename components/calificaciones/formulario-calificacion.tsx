"use client";

import { useId, useRef, useState } from "react";
import { CalificacionRechazadaError } from "@/lib/calificaciones/cliente";
import { calificarBienYArrendador } from "@/lib/calificaciones/cliente-bien";
import { validarCalificacionBien, type ErroresCalificacionBien } from "@/lib/calificaciones/reglas";
import { COMENTARIO_MAX } from "@/lib/calificaciones/tipos";
import { ErrorDeRed, SesionExpiradaError } from "@/lib/solicitudes/cliente";
import { ContadorComentario } from "./contador-comentario";
import { SelectorEstrellas } from "./selector-estrellas";

/** Cómo terminó el envío, para que la sección actualice lo que muestra. */
export type ResultadoCalificacionBien =
  /** 201, o 409: la reserva ya tiene calificación. */
  | "calificada"
  /** 422 o 404: la reserva ya no se puede calificar; se muestra el mensaje. */
  | "no-disponible";

function mensajeDeError(e: unknown): string {
  if (e instanceof CalificacionRechazadaError) {
    if (e.status === 409) return "Ya calificaste esta reserva.";
    if (e.status === 422) return "Solo puedes calificar una reserva que ya está COMPLETADA.";
    if (e.status === 404) return "Esta reserva ya no está disponible.";
    if (e.status === 403) return "Tu cuenta no puede calificar reservas.";
    if (e.status === 400 && e.message) return e.message;
  }
  if (e instanceof ErrorDeRed) {
    return "No se pudo enviar la calificación. Revisa tu conexión.";
  }
  return "No se pudo enviar la calificación. Inténtalo de nuevo.";
}

type Props = {
  reservaId: string;
  nombreBien: string;
  /** `mensaje` va con "no-disponible". */
  onTerminado: (resultado: ResultadoCalificacionBien, mensaje?: string) => void;
  onCancelar: () => void;
};

/**
 * Formulario para calificar el bien y al arrendador de una reserva COMPLETADA
 * (H17): de 1 a 5 estrellas para cada uno y un comentario opcional de hasta
 * 500 caracteres. Valida antes de enviar y deshabilita el envío mientras se
 * procesa.
 */
export function FormularioCalificacion({ reservaId, nombreBien, onTerminado, onCancelar }: Props) {
  const idComentario = useId();
  const idContador = useId();
  const idErrorBien = useId();
  const idErrorArrendador = useId();
  const [puntajeBien, setPuntajeBien] = useState<number | null>(null);
  const [puntajeArrendador, setPuntajeArrendador] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [errores, setErrores] = useState<ErroresCalificacionBien>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Corta un segundo envío que llegue antes de que React actualice `enviando`.
  const enviandoRef = useRef(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;

    const encontrados = validarCalificacionBien(puntajeBien, puntajeArrendador, comentario);
    setErrores(encontrados);
    if (
      encontrados.puntajeBien ||
      encontrados.puntajeArrendador ||
      encontrados.comentario ||
      puntajeBien === null ||
      puntajeArrendador === null
    ) {
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      await calificarBienYArrendador(reservaId, {
        puntajeBien,
        puntajeArrendador,
        comentario: comentario.trim() || undefined,
      });
      onTerminado("calificada");
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      const mensaje = mensajeDeError(e);
      setError(mensaje);
      if (e instanceof CalificacionRechazadaError) {
        if (e.status === 409) onTerminado("calificada");
        if (e.status === 422 || e.status === 404) onTerminado("no-disponible", mensaje);
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={`Calificar ${nombreBien}`}
      className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-col gap-1">
        <SelectorEstrellas
          etiqueta={`Calificación del bien (1 a 5)`}
          valor={puntajeBien}
          onCambiar={(n) => {
            setPuntajeBien(n);
            setErrores((e) => ({ ...e, puntajeBien: undefined }));
          }}
          deshabilitado={enviando}
          idError={errores.puntajeBien ? idErrorBien : undefined}
        />
        {errores.puntajeBien && (
          <p id={idErrorBien} className="text-sm text-red-600">
            {errores.puntajeBien}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <SelectorEstrellas
          etiqueta="Calificación del arrendador (1 a 5)"
          valor={puntajeArrendador}
          onCambiar={(n) => {
            setPuntajeArrendador(n);
            setErrores((e) => ({ ...e, puntajeArrendador: undefined }));
          }}
          deshabilitado={enviando}
          idError={errores.puntajeArrendador ? idErrorArrendador : undefined}
        />
        {errores.puntajeArrendador && (
          <p id={idErrorArrendador} className="text-sm text-red-600">
            {errores.puntajeArrendador}
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
          placeholder="Por ejemplo: el equipo funcionó bien y el arrendador fue puntual."
          className="w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
        />
        <ContadorComentario id={idContador} largo={comentario.length} />
        {errores.comentario && <p className="text-sm text-red-600">{errores.comentario}</p>}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm"
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
          onClick={onCancelar}
          disabled={enviando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm transition-opacity disabled:opacity-60 dark:border-zinc-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
