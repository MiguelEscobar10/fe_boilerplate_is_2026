import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

type Ctx = RouteContext<"/api/publicaciones/[id]/bloqueos">;

const ruta = (id: string) => `publicaciones/${encodeURIComponent(id)}/bloqueos`;

/** Bloqueos de una publicación propia, con su motivo. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return reenviarAlBackend(ruta(id));
}

/**
 * Crea un bloqueo. Solo pasan `inicio`, `fin` y `motivo`: el backend responde
 * 400 a cualquier propiedad de más.
 */
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
      { statusCode: 400, message: "El cuerpo debe ser un JSON." },
      { status: 400 },
    );
  }

  const { inicio, fin, motivo } = entrada as Record<string, unknown>;
  const body: Record<string, unknown> = { inicio, fin };
  if (motivo !== undefined) body.motivo = motivo;

  return reenviarAlBackend(ruta(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
