"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { obtenerConteo } from "@/lib/notificaciones/cliente";
import { BandejaNotificaciones } from "./bandeja-notificaciones";

/** Cada cuánto se vuelve a pedir el conteo de no leídas (brief FE-10.1). */
export const INTERVALO_CONTEO_MS = 30_000;

export function IconoNotificaciones() {
  const [noLeidas, setNoLeidas] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  // Cambia con «Actualizar»: vuelve a pedir el conteo y reinicia el intervalo.
  const [reinicio, setReinicio] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const cargarConteo = useCallback((signal?: AbortSignal) => {
    obtenerConteo(signal)
      .then((conteo) => setNoLeidas(conteo.noLeidas))
      .catch(() => {
        // Si falla un tick (o se abortó), el badge conserva el último valor y
        // el siguiente tick lo vuelve a intentar. Un 401 ya navegó a /login.
      });
  }, []);

  // Conteo al montar y cada 30 s. El cleanup corre al desmontar (al salir de
  // la pantalla) y antes de cada reinicio, así nunca quedan dos intervalos.
  useEffect(() => {
    const controller = new AbortController();
    cargarConteo(controller.signal);
    const intervalo = setInterval(
      () => cargarConteo(controller.signal),
      INTERVALO_CONTEO_MS,
    );
    return () => {
      clearInterval(intervalo);
      controller.abort();
    };
  }, [cargarConteo, reinicio]);

  // Cerrar con Esc o con un clic fuera del panel.
  useEffect(() => {
    if (!abierto) return;
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }
    function alHacerClic(e: PointerEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("keydown", alPresionarTecla);
    document.addEventListener("pointerdown", alHacerClic);
    return () => {
      document.removeEventListener("keydown", alPresionarTecla);
      document.removeEventListener("pointerdown", alHacerClic);
    };
  }, [abierto]);

  const etiqueta =
    noLeidas === null
      ? "Notificaciones"
      : noLeidas === 0
        ? "Notificaciones, ninguna sin leer"
        : `Notificaciones, ${noLeidas} sin leer`;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        onClick={() => setAbierto((a) => !a)}
        className="relative flex size-9 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {noLeidas !== null && noLeidas > 0 && (
          <span
            data-testid="contador-no-leidas"
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
          >
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {noLeidas ? `${noLeidas} notificaciones sin leer` : ""}
      </span>

      {abierto && (
        <div className="fixed inset-x-2 top-16 z-20 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-xl border border-zinc-200 bg-background shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[min(36rem,calc(100dvh-5rem))] dark:border-zinc-800 dark:shadow-black/50">
          <BandejaNotificaciones
            id={panelId}
            onActualizar={() => setReinicio((n) => n + 1)}
            onMarcada={() => setNoLeidas((n) => (n === null ? n : Math.max(0, n - 1)))}
            onCaducada={() => cargarConteo()}
          />
        </div>
      )}
    </div>
  );
}
