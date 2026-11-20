import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

// El backend responde 400 a cualquier parámetro que no conozca
// (forbidNonWhitelisted), así que solo se reenvían estos.
const PARAMETROS_PERMITIDOS = [
  "buscar",
  "tipo",
  "ubicacion",
  "precioMin",
  "precioMax",
  "fechaInicio",
  "fechaFin",
  "page",
  "limit",
] as const;

/** Catálogo público con búsqueda, filtros y paginación (BE-02.1, BE-11.1). */
export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const nombre of PARAMETROS_PERMITIDOS) {
    const valor = request.nextUrl.searchParams.get(nombre);
    if (valor !== null) query.set(nombre, valor);
  }
  const qs = query.toString();
  return reenviarAlBackend(`publicaciones${qs ? `?${qs}` : ""}`);
}
