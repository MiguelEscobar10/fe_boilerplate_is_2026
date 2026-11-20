import "server-only";

import { apiUrl } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Reserva } from "./tipos";

/**
 * GET /reservas/{id} (BE-03.1). Devuelve null si no existe o no es de quien
 * la pide: el backend responde 404 en los dos casos, así que no se sabe cuál.
 */
export async function obtenerReserva(id: string): Promise<Reserva | null> {
  const token = await getSession();
  const res = await fetch(apiUrl(`reservas/${encodeURIComponent(id)}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`reservas/${id} respondió ${res.status}`);
  return (await res.json()) as Reserva;
}
