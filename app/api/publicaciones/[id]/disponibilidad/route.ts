import type { NextRequest } from "next/server";
import { apiUrl } from "@/lib/api";
import { getSession } from "@/lib/session";

/**
 * Reenvía la disponibilidad de una publicación. En el backend es una ruta
 * pública: si hay sesión se manda el token, pero no hace falta. Solo pasan
 * `desde` y `hasta` (el backend responde 400 a un parámetro de más).
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/publicaciones/[id]/disponibilidad">,
) {
  const { id } = await ctx.params;
  const query = new URLSearchParams();
  for (const nombre of ["desde", "hasta"]) {
    const valor = request.nextUrl.searchParams.get(nombre);
    if (valor !== null) query.set(nombre, valor);
  }

  const token = await getSession();
  let res: Response;
  try {
    res = await fetch(
      apiUrl(`publicaciones/${encodeURIComponent(id)}/disponibilidad?${query}`),
      {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Error al consultar la disponibilidad:", error);
    return Response.json(
      { statusCode: 502, message: "No se pudo conectar con el servidor." },
      { status: 502 },
    );
  }

  const body = await res.text();
  return new Response(body || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
