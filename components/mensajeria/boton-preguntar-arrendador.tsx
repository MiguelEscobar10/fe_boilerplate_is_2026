"use client";

import { useState } from "react";
import {
  ErrorDeApi,
  ErrorDeRed,
  SesionExpiradaError,
  abrirConversacionDePublicacion,
} from "@/lib/mensajeria/cliente";
import { ConversacionChat } from "./conversacion-chat";

export const TEXTO_NO_DISPONIBLE = "Conversación no disponible";

type Estado =
  | { tipo: "cerrado" }
  | { tipo: "abriendo" }
  | { tipo: "abierta"; conversacionId: string }
  | { tipo: "no-disponible" }
  | { tipo: "error"; mensaje: string };

type Props = { publicacionId: string; usuarioId: string };

/**
 * Chat con el arrendador antes de reservar (H15, FE-15.1). Al pulsar el botón
 * abre (o recupera) la conversación y muestra el historial con la caja.
 *
 * Vive por ahora en el detalle de la publicación; cuando exista el detalle
 * completo de FE-12.1 se mueve ahí sin cambios.
 */
export function BotonPreguntarArrendador({ publicacionId, usuarioId }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cerrado" });

  async function abrir() {
    setEstado({ tipo: "abriendo" });
    try {
      const { id } = await abrirConversacionDePublicacion(publicacionId);
      setEstado({ tipo: "abierta", conversacionId: id });
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      if (e instanceof ErrorDeApi && (e.status === 404 || e.status === 400)) {
        setEstado({ tipo: "no-disponible" });
      } else if (e instanceof ErrorDeApi && e.status === 403) {
        setEstado({
          tipo: "error",
          mensaje: "Solo un arrendatario puede preguntar.",
        });
      } else {
        setEstado({
          tipo: "error",
          mensaje:
            e instanceof ErrorDeRed
              ? "No se pudo abrir la conversación. Revisa tu conexión."
              : "No se pudo abrir la conversación. Inténtalo de nuevo.",
        });
      }
    }
  }

  if (estado.tipo === "abierta") {
    return (
      <section className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">
          Conversación con el arrendador
        </h2>
        <ConversacionChat
          conversacionId={estado.conversacionId}
          usuarioId={usuarioId}
          otraPersona="Arrendador"
          puedeEscribir
        />
      </section>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {estado.tipo !== "no-disponible" && (
        <button
          type="button"
          onClick={abrir}
          disabled={estado.tipo === "abriendo"}
          className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60 dark:border-zinc-700"
        >
          {estado.tipo === "abriendo"
            ? "Abriendo..."
            : estado.tipo === "error"
              ? "Reintentar"
              : "Contactar al arrendador"}
        </button>
      )}
      {estado.tipo === "no-disponible" && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          {TEXTO_NO_DISPONIBLE}.
        </p>
      )}
      {estado.tipo === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
