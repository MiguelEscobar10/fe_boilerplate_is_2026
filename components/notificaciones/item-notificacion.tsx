"use client";

import { useState } from "react";
import {
  ErrorDeRed,
  NoEncontradaError,
  SesionExpiradaError,
  marcarComoLeida,
} from "@/lib/notificaciones/cliente";
import type { ModuloOrigen, Notificacion } from "@/lib/notificaciones/tipos";

const ETIQUETA_MODULO: Record<ModuloOrigen, string> = {
  CATALOGO: "Catálogo",
  BUSQUEDA: "Búsqueda",
  RESERVAS: "Reservas",
  PAGOS_GARANTIA: "Pagos y garantía",
  MENSAJERIA: "Mensajería",
  RESENAS: "Reseñas",
  VERIFICACION: "Verificación",
  NOTIFICACIONES: "Notificaciones",
  REPORTES: "Reportes",
};

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

function fechaRelativa(iso: string) {
  const segundos = (new Date(iso).getTime() - Date.now()) / 1000;
  const formato = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  for (const [unidad, tamaño] of UNIDADES) {
    if (Math.abs(segundos) >= tamaño) {
      return formato.format(Math.round(segundos / tamaño), unidad);
    }
  }
  return "hace un momento";
}

type Props = {
  notificacion: Notificacion;
  /** El PATCH respondió 200: llega la notificación con `leidaAt` puesto. */
  onMarcada: (actualizada: Notificacion) => void;
  /** El PATCH respondió 404: ya no existe o no es del usuario. */
  onCaducada: (id: string) => void;
};

export function ItemNotificacion({ notificacion, onMarcada, onCaducada }: Props) {
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendiente = notificacion.leidaAt === null;

  async function marcar() {
    setMarcando(true);
    setError(null);
    try {
      const actualizada = await marcarComoLeida(notificacion.id);
      onMarcada(actualizada);
    } catch (e) {
      if (e instanceof NoEncontradaError) {
        onCaducada(notificacion.id);
        return;
      }
      if (e instanceof SesionExpiradaError) return;
      setError(
        e instanceof ErrorDeRed
          ? "Sin conexión. No se pudo marcar como leída."
          : "No se pudo marcar como leída. Inténtalo de nuevo.",
      );
    } finally {
      setMarcando(false);
    }
  }

  return (
    <li
      data-estado={pendiente ? "pendiente" : "leida"}
      className={`flex gap-3 px-4 py-3 ${
        pendiente ? "bg-zinc-100 dark:bg-zinc-900" : "opacity-70"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          pendiente ? "bg-foreground" : "border border-zinc-400 dark:border-zinc-600"
        }`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>{ETIQUETA_MODULO[notificacion.moduloOrigen] ?? notificacion.moduloOrigen}</span>
          <time
            dateTime={notificacion.creadaAt}
            title={new Date(notificacion.creadaAt).toLocaleString("es")}
            className="shrink-0"
          >
            {fechaRelativa(notificacion.creadaAt)}
          </time>
        </div>
        <p className={`break-words text-sm ${pendiente ? "font-semibold" : "font-medium"}`}>
          {notificacion.titulo}
        </p>
        <p className="break-words text-sm text-zinc-700 dark:text-zinc-300">
          {notificacion.mensaje}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {pendiente ? "Pendiente" : "Leída"}
          </span>
          {pendiente && (
            <button
              type="button"
              onClick={marcar}
              disabled={marcando}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium transition-opacity disabled:opacity-60 dark:border-zinc-700"
            >
              {marcando ? "Marcando..." : "Marcar como leída"}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
