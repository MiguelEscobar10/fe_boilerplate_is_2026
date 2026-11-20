import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

/**
 * Abre o recupera la conversación de la reserva (BE-16.1). No lleva cuerpo:
 * lo que mande el navegador se ignora.
 */
export async function POST(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/conversacion">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/conversacion`, {
    method: "POST",
  });
}
