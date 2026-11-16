import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

export async function PATCH(
  _request: NextRequest,
  ctx: RouteContext<"/api/notificaciones/[id]/leida">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(
    `notificaciones/${encodeURIComponent(id)}/leida`,
    { method: "PATCH" },
  );
}
