import { TIPOS, UNIDADES } from "@/lib/publicaciones/reglas";
import type { PublicacionResumen } from "./tipos";

export const etiquetaTipo = (tipo: string) =>
  TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;

/** "$15.50 por día". */
export function tarifaLegible(p: Pick<PublicacionResumen, "precio" | "tarifaUnidad">) {
  const unidad = UNIDADES.find((u) => u.valor === p.tarifaUnidad)?.etiqueta ?? p.tarifaUnidad;
  return `$${p.precio.toFixed(2)} ${unidad}`;
}

/**
 * El backend da la foto como `/api/v1/publicaciones/{id}/imagenes/{orden}`,
 * relativa a la API. El navegador la pide a nuestra ruta
 * `/publicaciones/{id}/imagenes/{orden}`, que la reenvía (FE-01.1).
 */
export function rutaDeImagen(imagenUrl: string | null): string | null {
  const ruta = imagenUrl?.match(/\/publicaciones\/[^/]+\/imagenes\/\d+$/)?.[0];
  return ruta ?? null;
}
