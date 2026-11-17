import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

const CAMPOS = ["numeroTarjeta", "vencimiento", "cvv"] as const;

/**
 * Reenvía el pago simulado al backend con el token de la sesión.
 *
 * Solo pasan los tres datos de la tarjeta: cualquier otro campo (un monto,
 * un escenario...) se descarta, porque el monto lo decide el backend.
 *
 * Los datos de la tarjeta no se registran en ningún log: este handler no
 * escribe en console, y reenviarAlBackend solo registra errores de red, que
 * no incluyen el body.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/pagos/simulados">,
) {
  const { id } = await ctx.params;

  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    return Response.json(
      { statusCode: 400, message: "Los datos de la tarjeta no son válidos." },
      { status: 400 },
    );
  }

  const datos: Record<string, string> = {};
  if (typeof entrada === "object" && entrada !== null) {
    for (const campo of CAMPOS) {
      const valor = (entrada as Record<string, unknown>)[campo];
      if (typeof valor === "string") datos[campo] = valor;
    }
  }

  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/pagos/simulados`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}
