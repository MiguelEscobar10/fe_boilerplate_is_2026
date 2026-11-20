"use client";

import { useId, useRef, useState } from "react";
import {
  ErrorDeApi,
  ErrorDeRed,
  SesionExpiradaError,
  enviarMensaje,
} from "@/lib/mensajeria/cliente";
import { MAX_CARACTERES, type Mensaje } from "@/lib/mensajeria/tipos";

/** Lo que se le muestra al usuario si el texto no se puede enviar. */
export function validarMensaje(texto: string): string | null {
  const limpio = texto.trim();
  if (limpio.length === 0) return "Escribe un mensaje.";
  if (limpio.length > MAX_CARACTERES) {
    return `El mensaje no puede pasar de ${MAX_CARACTERES} caracteres.`;
  }
  return null;
}

type Props = {
  conversacionId: string;
  autorId: string;
  /** El mensaje ya quedó guardado en el backend. */
  onEnviado: (mensaje: Mensaje) => void;
  /** El backend respondió 409 CONVERSACION_CERRADA: la reserva cambió de estado. */
  onCerrada?: () => void;
};

/**
 * Caja para escribir (H15 y H16): de 1 a 1000 caracteres con contador.
 * "Enviar" queda deshabilitado con el texto vacío o de más y durante el
 * envío, no manda dos veces el mismo envío y mantiene el texto si falla.
 */
export function CajaMensaje({
  conversacionId,
  autorId,
  onEnviado,
  onCerrada,
}: Props) {
  const idCampo = useId();
  const idAyuda = useId();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Corta un segundo envío que llegue antes de que React actualice `enviando`.
  const enviandoRef = useRef(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviandoRef.current) return;
    const problema = validarMensaje(texto);
    if (problema) {
      setError(problema);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    const contenido = texto.trim();
    try {
      const creado = await enviarMensaje(conversacionId, contenido);
      setTexto("");
      onEnviado({
        id: creado.id,
        createdAt: creado.createdAt,
        autorId,
        contenido,
      });
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      if (
        e instanceof ErrorDeApi &&
        e.status === 409 &&
        e.codigo === "CONVERSACION_CERRADA"
      ) {
        onCerrada?.();
        return;
      }
      if (e instanceof ErrorDeApi && e.status === 400 && e.detalle)
        setError(e.detalle);
      else if (e instanceof ErrorDeRed)
        setError("No se pudo enviar. Revisa tu conexión.");
      else setError("No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const largo = texto.trim().length;
  // Enviar queda deshabilitado con el texto vacío o de más (FE-15.1) y durante el envío.
  const invalido = validarMensaje(texto) !== null;
  const excedido = largo > MAX_CARACTERES;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2" noValidate>
      <label htmlFor={idCampo} className="text-sm font-medium">
        Mensaje
      </label>
      <textarea
        id={idCampo}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (error) setError(null);
        }}
        rows={3}
        aria-describedby={idAyuda}
        aria-invalid={error || excedido ? true : undefined}
        disabled={enviando}
        className="w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
      />
      <div className="flex items-center justify-between gap-4">
        <p
          id={idAyuda}
          className={`text-xs ${largo > MAX_CARACTERES ? "text-red-700 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          {largo}/{MAX_CARACTERES}
        </p>
        <button
          type="submit"
          disabled={enviando || invalido}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar"}
        </button>
      </div>
      {excedido && !error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          El mensaje no puede pasar de {MAX_CARACTERES} caracteres.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
