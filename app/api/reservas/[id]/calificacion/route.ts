import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

function cuerpoInvalido() {
  return Response.json(
    { statusCode: 400, message: "El cuerpo debe ser un JSON." },
    { status: 400 },
  );
}

/**
 * Reenvía la calificación del bien y del arrendador. Solo pasan
 * `puntajeBien`, `puntajeArrendador` y `comentario`: el backend responde 400
 * a cualquier propiedad de más, así que las demás se descartan aquí.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/calificacion">,
) {
  const { id } = await ctx.params;

  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    return cuerpoInvalido();
  }
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    return cuerpoInvalido();
  }

  const { puntajeBien, puntajeArrendador, comentario } = entrada as Record<string, unknown>;
  const body: Record<string, unknown> = { puntajeBien, puntajeArrendador };
  if (comentario !== undefined) body.comentario = comentario;

  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/calificacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Consulta la calificación que el arrendatario dejó en su reserva. Devuelve
 * el status y el body del backend tal cual (200, o 404 con o sin
 * CALIFICACION_NO_REGISTRADA).
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/calificacion">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(`reservas/${encodeURIComponent(id)}/calificacion`);
}
