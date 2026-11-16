import { deleteSession, getSession } from "@/lib/session";

// Solo para route handlers: el token vive en una cookie httpOnly, así que el
// navegador llama a /api/... y este helper reenvía al backend con el Bearer.

function errorJson(status: number, message: string) {
  return Response.json({ statusCode: status, message }, { status });
}

/**
 * Reenvía una request al backend (`API_URL` + `ruta`) con el token de la
 * sesión y devuelve su status y body tal cual, salvo:
 * - sin sesión → 401;
 * - el backend responde 401 → borra la cookie y responde 401 (si la cookie
 *   quedara, el proxy rebotaría /login de vuelta a /);
 * - el backend no responde o falta API_URL → 502.
 */
export async function reenviarAlBackend(
  ruta: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getSession();
  if (!token) {
    return errorJson(401, "No hay una sesión activa.");
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("Falta la variable de entorno API_URL.");
    return errorJson(502, "No se pudo conectar con el servidor.");
  }

  let res: Response;
  try {
    res = await fetch(new URL(ruta, apiUrl.replace(/\/?$/, "/")), {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Error al llamar a ${ruta}:`, error);
    return errorJson(502, "No se pudo conectar con el servidor.");
  }

  if (res.status === 401) {
    await deleteSession();
    return errorJson(401, "La sesión expiró.");
  }

  const body = await res.text();
  return new Response(body || null, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
