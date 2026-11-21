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
  // Detalle completo (BE-12.1). Opcionales por si el backend aún no los envía.
  /** Promedio de las calificaciones de esta publicación; null si no tiene. */
  promedioBien?: number | null;
  /** Promedio del arrendador en todas sus publicaciones; null si no tiene. */
  promedioArrendador?: number | null;
  totalCalificaciones?: number;
  /** Solo la pueden solicitar arrendatarios con identidad verificada (H19). */
  requiereVerificacion?: boolean;
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
