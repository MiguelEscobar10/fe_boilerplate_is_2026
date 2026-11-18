import type { NextRequest } from "next/server";
import { deleteSession, getSession } from "@/lib/session";

function errorJson(status: number, message: string) {
  return Response.json({ statusCode: status, message }, { status });
}

/**
 * Abre el documento de una solicitud (solo REVISOR; el backend lo decide).
 *
 * No usa `reenviarAlBackend` porque ese helper lee la respuesta como texto y
 * el documento es binario (PDF o imagen). Mismo manejo de sesión: sin cookie
 * 401; si el backend responde 401 se borra la cookie; sin backend 502.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/verificaciones/[id]/documento">,
) {
  const { id } = await ctx.params;
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
        `verificaciones/${encodeURIComponent(id)}/documento`,
        apiUrl.replace(/\/?$/, "/"),
      ),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
  } catch (error) {
    console.error("Error al pedir el documento:", error);
    return errorJson(502, "No se pudo conectar con el servidor.");
  }

  if (res.status === 401) {
    await deleteSession();
    return errorJson(401, "La sesión expiró.");
  }
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  }

  // Dato personal: que no quede en ninguna caché compartida.
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      // El tipo lo decide el backend: que el navegador no adivine otro.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
