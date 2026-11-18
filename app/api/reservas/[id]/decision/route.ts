import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

function cuerpoInvalido() {
  return Response.json(
    { statusCode: 400, message: "El cuerpo debe ser un JSON." },
    { status: 400 },
  );
}

/**
 * Reenvía la decisión del arrendador. Solo pasan `decision` y `motivo`: el
 * backend responde 400 a cualquier propiedad de más (forbidNonWhitelisted).
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/decision">,
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

  const { decision, motivo } = entrada as Record<string, unknown>;
  const body: Record<string, unknown> = { decision };
  if (motivo !== undefined) body.motivo = motivo;

  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
