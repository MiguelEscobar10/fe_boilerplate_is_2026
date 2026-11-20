import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/publicaciones/[id]/requiere-verificacion">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(
    `publicaciones/${encodeURIComponent(id)}/requiere-verificacion`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
}
