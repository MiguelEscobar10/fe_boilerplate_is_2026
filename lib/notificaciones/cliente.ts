import { irALogin } from "./navegacion";
import type { Bandeja, ConteoNoLeidas, Notificacion } from "./tipos";

// Llamadas del navegador a los route handlers de /api/notificaciones. Nunca
// van directo al backend: el token está en una cookie httpOnly.

/** El backend respondió 404: la notificación no existe o ya no es del usuario. */
export class NoEncontradaError extends Error {
  constructor() {
    super("La notificación ya no está disponible.");
    this.name = "NoEncontradaError";
  }
}

/** No hubo respuesta (sin conexión o backend caído, 502 del route handler). */
export class ErrorDeRed extends Error {
  constructor() {
    super("No se pudo conectar con el servidor.");
    this.name = "ErrorDeRed";
  }
}

/** La sesión expiró. Ya se inició la navegación a /login. */
export class SesionExpiradaError extends Error {
  constructor() {
    super("La sesión expiró.");
    this.name = "SesionExpiradaError";
  }
}

export function esAbortado(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function pedir<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (error) {
    if (esAbortado(error)) throw error;
    throw new ErrorDeRed();
  }

  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status === 404) {
    throw new NoEncontradaError();
  }
  if (res.status >= 502 && res.status <= 504) {
    throw new ErrorDeRed();
  }
  if (!res.ok) {
    throw new Error(`La solicitud respondió ${res.status}.`);
  }
  return (await res.json()) as T;
}

export function obtenerConteo(signal?: AbortSignal) {
  return pedir<ConteoNoLeidas>("/api/notificaciones/no-leidas/conteo", {
    signal,
  });
}

export function obtenerBandeja(
  { soloNoLeidas, page, limit }: { soloNoLeidas: boolean; page: number; limit: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    soloNoLeidas: String(soloNoLeidas),
    page: String(page),
    limit: String(limit),
  });
  return pedir<Bandeja>(`/api/notificaciones?${query}`, { signal });
}

export function marcarComoLeida(id: string) {
  return pedir<Notificacion>(
    `/api/notificaciones/${encodeURIComponent(id)}/leida`,
    { method: "PATCH" },
  );
}
