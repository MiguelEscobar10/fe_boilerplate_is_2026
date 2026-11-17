import "server-only";

import { apiUrl } from "@/lib/api";
import { getSession } from "@/lib/session";

export type Publicacion = {
  id: string;
  tipo: "EQUIPO" | "ESPACIO";
  nombre: string;
  activo: boolean;
  arrendadorId: string;
  descripcion: string | null;
  ubicacion: string;
  tarifaMonto: string;
  tarifaUnidad: "HORA" | "DIA" | "NOCHE" | "SEMANA";
  depositoMonto: string;
  condiciones: string | null;
  createdAt: string;
  imagenes: { orden: number; url: string }[];
};

/** GET /publicaciones/{id}. Devuelve null si no existe o está desactivada. */
export async function obtenerPublicacion(id: string): Promise<Publicacion | null> {
  const token = await getSession();
  const res = await fetch(apiUrl(`publicaciones/${encodeURIComponent(id)}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`publicaciones/${id} respondió ${res.status}`);
  return (await res.json()) as Publicacion;
}
