import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";
import { cuerpoInvalido, leerCampos } from "@/lib/devoluciones/json";

const ruta = (id: string) => `reservas/${encodeURIComponent(id)}/devolucion`;

/** Registra la devolución (BE-09.1). Solo pasan `fechaReal`, `estadoFinal` y `danos`. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/devolucion">,
) {
  const { id } = await ctx.params;
  const cuerpo = await leerCampos(request, ["fechaReal", "estadoFinal", "danos"]);
  if (!cuerpo) return cuerpoInvalido();
  return reenviarAlBackend(ruta(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/devolucion">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(ruta(id));
}
