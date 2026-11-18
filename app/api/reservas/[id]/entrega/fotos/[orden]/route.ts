import type { NextRequest } from "next/server";
import { deleteSession, getSession } from "@/lib/session";

function errorJson(status: number, message: string) {
  return Response.json({ statusCode: status, message }, { status });
}

/**
 * Sirve una foto de la entrega. No usa `reenviarAlBackend` porque ese helper
 * lee la respuesta como texto y la foto es binaria. Mismo manejo de sesión:
 * sin cookie 401; si el backend responde 401 se borra la cookie; sin backend 502.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/entrega/fotos/[orden]">,
) {
  const { id, orden } = await ctx.params;
  const token = await getSession();
  if (!token) return errorJson(401, "No hay una sesión activa.");

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("Falta la variable de entorno API_URL.");
    return errorJson(502, "No se pudo conectar con el servidor.");
  }

  let res: Response;
  try {
    res = await fetch(
      new URL(
        `reservas/${encodeURIComponent(id)}/entrega/fotos/${encodeURIComponent(orden)}`,
        apiUrl.replace(/\/?$/, "/"),
      ),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
  } catch (error) {
    console.error("Error al pedir la foto de la entrega:", error);
    return errorJson(502, "No se pudo conectar con el servidor.");
  }

  if (res.status === 401) {
    await deleteSession();
    return errorJson(401, "La sesión expiró.");
  }
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  }
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
