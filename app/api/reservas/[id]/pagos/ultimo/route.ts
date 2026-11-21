import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

/**
 * Reenvía la consulta del último pago al backend con el token de la sesión.
 * Devuelve su status y body tal cual (200, 404 con o sin PAGO_NO_REGISTRADO).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/pagos/ultimo">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/pagos/ultimo`);
}
