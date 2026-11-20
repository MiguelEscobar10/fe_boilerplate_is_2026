"use client";

import { useId, useState } from "react";
import { ErrorDeApi, SesionExpiradaError } from "@/lib/verificacion/cliente";
import { cambiarRequiereVerificacion } from "@/lib/verificacion/requisito";
import { mensajeGeneral } from "./mensajes";

type Props = {
  publicacionId: string;
  /** Valor actual de la publicación (`requiereVerificacion`). */
  valorInicial: boolean;
};

/**
 * Opción "requiere verificación" para el arrendador dueño (H19, BE-19.1). Va
 * en la gestión de la publicación.
 *
 * Mientras guarda, el interruptor queda desactivado (sin doble envío). Si el
 * backend responde 403, se muestra como acceso restringido y se vuelve al
 * valor guardado.
 */
export function InterruptorRequiereVerificacion({ publicacionId, valorInicial }: Props) {
  const idAyuda = useId();
  const [valor, setValor] = useState(valorInicial);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar() {
    if (guardando) return;
    const nuevo = !valor;
    setGuardando(true);
    setAviso(null);
    setError(null);
    try {
      const guardado = await cambiarRequiereVerificacion(publicacionId, nuevo);
      setValor(guardado.requiereVerificacion);
      setAviso(
        guardado.requiereVerificacion
          ? "Guardado: solo arrendatarios verificados podrán solicitarla."
          : "Guardado: cualquier arrendatario podrá solicitarla.",
      );
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      if (e instanceof ErrorDeApi && e.status === 403) {
        setError("Acceso restringido: solo el dueño de la publicación puede cambiar esta opción.");
      } else if (e instanceof ErrorDeApi && e.status === 404) {
        setError("La publicación ya no existe.");
      } else {
        setError(mensajeGeneral(e, "guardar el cambio"));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={valor}
          aria-describedby={idAyuda}
          disabled={guardando}
          onClick={cambiar}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            valor ? "bg-green-700" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <span className="sr-only">Requiere verificación de identidad</span>
          <span
            aria-hidden="true"
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              valor ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium" aria-hidden="true">
          Requiere verificación de identidad
        </span>
      </div>
      <p id={idAyuda} className="text-xs text-zinc-600 dark:text-zinc-400">
        Si la activas, solo podrán solicitarla arrendatarios con su identidad verificada.
      </p>
      {guardando && (
        <p role="status" className="text-xs">
          Guardando...
        </p>
      )}
      {aviso && (
        <p role="status" className="text-xs text-green-700 dark:text-green-400">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
