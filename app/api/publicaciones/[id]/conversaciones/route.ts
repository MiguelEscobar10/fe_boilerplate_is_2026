import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

/**
 * Abre o recupera la conversación previa con el arrendador (BE-15.1). No
 * lleva cuerpo: el arrendatario lo pone el backend con el token.
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/publicaciones/[id]/conversaciones">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(
    `publicaciones/${encodeURIComponent(id)}/conversaciones`,
    {
      method: "POST",
    },
  );
}
