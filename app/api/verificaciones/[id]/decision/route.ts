import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/verificaciones/[id]/decision">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(`verificaciones/${encodeURIComponent(id)}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
