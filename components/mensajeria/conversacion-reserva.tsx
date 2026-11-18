"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeApi,
  ErrorDeRed,
  SesionExpiradaError,
  abrirConversacionDeReserva,
} from "@/lib/mensajeria/cliente";
import { ConversacionChat } from "./conversacion-chat";

export const TEXTO_NO_HABILITADA =
  "La conversación se habilita cuando la reserva esté CONFIRMADA";
export const TEXTO_CERRADA = "Conversación cerrada";

type Estado =
  | { tipo: "cargando" }
  | { tipo: "abierta"; conversacionId: string; puedeEscribir: boolean }
  | { tipo: "no-habilitada" }
  | { tipo: "cerrada-sin-historial" }
  | { tipo: "no-encontrada" }
  | { tipo: "error"; mensaje: string };

type Props = {
  reservaId: string;
  usuarioId: string;
  /** El rol de quien mira, para nombrar a la otra persona. */
  rol: "ARRENDADOR" | "ARRENDATARIO";
};

/**
 * Conversación dentro de la reserva (H16, FE-16.1).
 *
 * - CONFIRMADA o EN_CURSO: historial y caja para escribir.
 * - RECHAZADA, CANCELADA o COMPLETADA: solo el historial y "Conversación cerrada".
 * - PENDIENTE: el aviso de que se habilita al confirmarse.
 *
 * Lo decide la respuesta del backend al abrirla (`puedeEscribir`, o el 409
 * con su código), no el navegador.
 */
export function ConversacionReserva({ reservaId, usuarioId, rol }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    let vigente = true;
    abrirConversacionDeReserva(reservaId)
      .then((c) => {
        if (vigente) {
          setEstado({
            tipo: "abierta",
            conversacionId: c.id,
            puedeEscribir: c.puedeEscribir,
          });
        }
      })
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        if (e instanceof ErrorDeApi && e.status === 409) {
          setEstado(
            e.codigo === "CONVERSACION_NO_HABILITADA"
              ? { tipo: "no-habilitada" }
              : { tipo: "cerrada-sin-historial" },
          );
        } else if (
          e instanceof ErrorDeApi &&
          (e.status === 404 || e.status === 400)
        ) {
          setEstado({ tipo: "no-encontrada" });
        } else if (e instanceof ErrorDeApi && e.status === 403) {
          setEstado({
            tipo: "error",
            mensaje: "Tu cuenta no puede ver esta conversación.",
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
      });
    return () => {
      vigente = false;
    };
  }, [reservaId]);

  switch (estado.tipo) {
    case "cargando":
      return <p role="status">Cargando...</p>;
    case "no-habilitada":
      return <Aviso>{TEXTO_NO_HABILITADA}.</Aviso>;
    case "cerrada-sin-historial":
      return <Aviso>{TEXTO_CERRADA}. Esta reserva no tuvo mensajes.</Aviso>;
    case "no-encontrada":
      return <Aviso>Reserva no encontrada.</Aviso>;
    case "error":
      return <p role="alert">{estado.mensaje}</p>;
    case "abierta":
      return (
        <div className="flex flex-col gap-4">
          {!estado.puedeEscribir && (
            <Aviso>
              {TEXTO_CERRADA}. Puedes leer el historial, pero ya no se pueden
              enviar mensajes.
            </Aviso>
          )}
          <ConversacionChat
            conversacionId={estado.conversacionId}
            usuarioId={usuarioId}
            otraPersona={rol === "ARRENDATARIO" ? "Arrendador" : "Arrendatario"}
            puedeEscribir={estado.puedeEscribir}
            onCerrada={() => setEstado({ ...estado, puedeEscribir: false })}
          />
        </div>
      );
  }
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-md border border-zinc-300 px-4 py-3 text-sm dark:border-zinc-700"
    >
      {children}
    </p>
  );
}
