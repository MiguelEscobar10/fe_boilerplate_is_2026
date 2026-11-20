import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";
import { cuerpoInvalido, leerCampos } from "@/lib/devoluciones/json";

const ruta = (id: string) => `reservas/${encodeURIComponent(id)}/deposito/resolucion`;

/** Resuelve el depósito y cierra la reserva (BE-09.2). Solo pasan `montoRetenido` y `motivo`. */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/deposito/resolucion">,
) {
  const { id } = await ctx.params;
  const cuerpo = await leerCampos(request, ["montoRetenido", "motivo"]);
  if (!cuerpo) return cuerpoInvalido();
  return reenviarAlBackend(ruta(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/deposito/resolucion">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(ruta(id));
}
