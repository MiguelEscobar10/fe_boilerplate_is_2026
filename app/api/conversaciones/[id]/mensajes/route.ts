import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

type Ctx = RouteContext<"/api/conversaciones/[id]/mensajes">;

const ruta = (id: string) =>
  `conversaciones/${encodeURIComponent(id)}/mensajes`;

/** Historial. Solo pasan `page` y `limit`: el backend responde 400 a otros. */
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const query = new URLSearchParams();
  for (const nombre of ["page", "limit"]) {
    const valor = request.nextUrl.searchParams.get(nombre);
    if (valor !== null) query.set(nombre, valor);
  }
  const sufijo = query.size > 0 ? `?${query}` : "";
  return reenviarAlBackend(`${ruta(id)}${sufijo}`);
}

/** Envía un mensaje. Solo pasa `contenido`: el autor lo pone el backend. */
export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    entrada = null;
  }
  if (typeof entrada !== "object" || entrada === null) {
    return Response.json(
      { statusCode: 400, message: "Escribe un mensaje." },
      { status: 400 },
    );
  }

  const { contenido } = entrada as Record<string, unknown>;
  return reenviarAlBackend(ruta(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}
