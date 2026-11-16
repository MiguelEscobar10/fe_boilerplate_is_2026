import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

// El backend responde 400 a cualquier parámetro que no conozca
// (forbidNonWhitelisted), así que solo se reenvían estos.
const PARAMETROS_PERMITIDOS = ["soloNoLeidas", "page", "limit"] as const;

export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const nombre of PARAMETROS_PERMITIDOS) {
    const valor = request.nextUrl.searchParams.get(nombre);
    if (valor !== null) query.set(nombre, valor);
  }
  const qs = query.toString();
  return reenviarAlBackend(`notificaciones${qs ? `?${qs}` : ""}`);
}
