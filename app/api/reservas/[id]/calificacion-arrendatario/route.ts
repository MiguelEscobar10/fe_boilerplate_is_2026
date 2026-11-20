import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

function cuerpoInvalido() {
  return Response.json(
    { statusCode: 400, message: "El cuerpo debe ser un JSON." },
    { status: 400 },
  );
}

/**
 * Reenvía la calificación del arrendatario. Solo pasan `puntaje` y
 * `comentario`: el backend responde 400 a cualquier propiedad de más.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/calificacion-arrendatario">,
) {
  const { id } = await ctx.params;

  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    return cuerpoInvalido();
  }
  if (typeof entrada !== "object" || entrada === null) {
    return cuerpoInvalido();
  }

  const { puntaje, comentario } = entrada as Record<string, unknown>;
  const body: Record<string, unknown> = { puntaje };
  if (comentario !== undefined) body.comentario = comentario;

  return reenviarAlBackend(
    `reservas/${encodeURIComponent(id)}/calificacion-arrendatario`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}
