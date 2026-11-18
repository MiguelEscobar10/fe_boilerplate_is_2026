"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ErrorDeRed,
  POR_PAGINA,
  SesionExpiradaError,
  obtenerMensajes,
} from "@/lib/mensajeria/cliente";
import type { Mensaje } from "@/lib/mensajeria/tipos";
import { CajaMensaje } from "./caja-mensaje";

const HORA = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/El_Salvador",
});

export function fechaMensaje(iso: string) {
  return HORA.format(new Date(iso));
}

type Historial = {
  mensajes: Mensaje[];
  /** Página más vieja que ya está cargada (el backend pagina del más viejo al más nuevo). */
  primeraPagina: number;
};

type Props = {
  conversacionId: string;
  usuarioId: string;
  /** Cómo se llama a la otra persona: "Arrendador" o "Arrendatario". */
  otraPersona: string;
  /** Sin caja de texto: solo historial (reserva cerrada). */
  puedeEscribir: boolean;
  onCerrada?: () => void;
};

/**
 * Historial y caja de una conversación (H15 y H16). Abre en los mensajes más
 * recientes; los anteriores se cargan con "Ver mensajes anteriores".
 */
export function ConversacionChat({
  conversacionId,
  usuarioId,
  otraPersona,
  puedeEscribir,
  onCerrada,
}: Props) {
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const [recarga, setRecarga] = useState(0);

  // Primera carga y "Actualizar": la última página (los más recientes).
  useEffect(() => {
    let vigente = true;
    (async () => {
      const primera = await obtenerMensajes(conversacionId, 1);
      const ultima = Math.max(1, Math.ceil(primera.total / POR_PAGINA));
      const pagina =
        ultima === 1 ? primera : await obtenerMensajes(conversacionId, ultima);
      if (vigente) {
        setHistorial({ mensajes: pagina.items, primeraPagina: ultima });
        setError(null);
      }
    })().catch((e: unknown) => {
      if (!vigente || e instanceof SesionExpiradaError) return;
      setError(
        e instanceof ErrorDeRed
          ? "No se pudieron cargar los mensajes. Revisa tu conexión."
          : "No se pudieron cargar los mensajes. Inténtalo de nuevo.",
      );
    });
    return () => {
      vigente = false;
    };
  }, [conversacionId, recarga]);

  const cargarAnteriores = useCallback(async () => {
    if (!historial || historial.primeraPagina <= 1) return;
    setCargandoAnteriores(true);
    try {
      const pagina = await obtenerMensajes(
        conversacionId,
        historial.primeraPagina - 1,
      );
      setHistorial(
        (h) =>
          h && {
            mensajes: [...pagina.items, ...h.mensajes],
            primeraPagina: h.primeraPagina - 1,
          },
      );
    } catch (e) {
      if (!(e instanceof SesionExpiradaError)) {
        setError("No se pudieron cargar los mensajes anteriores.");
      }
    } finally {
      setCargandoAnteriores(false);
    }
  }, [conversacionId, historial]);

  if (!historial && !error) return <p role="status">Cargando mensajes...</p>;

  return (
    <section aria-label="Conversación" className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {historial && (
        <>
          <div className="flex items-center justify-between gap-2">
            {historial.primeraPagina > 1 ? (
              <button
                type="button"
                onClick={cargarAnteriores}
                disabled={cargandoAnteriores}
                className="text-sm underline disabled:opacity-60"
              >
                {cargandoAnteriores ? "Cargando..." : "Ver mensajes anteriores"}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setRecarga((n) => n + 1)}
              className="text-sm underline"
            >
              Actualizar
            </button>
          </div>

          {historial.mensajes.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Todavía no hay mensajes.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {historial.mensajes.map((m) => {
                const propio = m.autorId === usuarioId;
                return (
                  <li
                    key={m.id}
                    className={`flex max-w-[85%] flex-col gap-1 rounded-lg px-3 py-2 text-sm ${
                      propio
                        ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "self-start bg-zinc-100 dark:bg-zinc-800"
                    }`}
                  >
                    <span className="text-xs font-medium opacity-80">
                      {propio ? "Tú" : otraPersona} ·{" "}
                      {fechaMensaje(m.createdAt)}
                    </span>
                    <p className="whitespace-pre-wrap break-words">
                      {m.contenido}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      {puedeEscribir && (
        <CajaMensaje
          conversacionId={conversacionId}
          autorId={usuarioId}
          onEnviado={(mensaje) =>
            setHistorial(
              (h) => h && { ...h, mensajes: [...h.mensajes, mensaje] },
            )
          }
          onCerrada={onCerrada}
        />
      )}
    </section>
  );
}
