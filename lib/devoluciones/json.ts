import "server-only";

/**
 * Lee el cuerpo JSON de un route handler y deja solo los campos indicados,
 * porque el backend responde 400 a cualquier propiedad de más. Devuelve null
 * si el cuerpo no es un objeto JSON.
 */
export async function leerCampos(
  request: Request,
  campos: readonly string[],
): Promise<Record<string, unknown> | null> {
  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    return null;
  }
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) return null;
  const salida: Record<string, unknown> = {};
  for (const campo of campos) {
    const valor = (entrada as Record<string, unknown>)[campo];
    if (valor !== undefined) salida[campo] = valor;
  }
  return salida;
}

export function cuerpoInvalido() {
  return Response.json({ statusCode: 400, message: "El cuerpo debe ser un JSON." }, { status: 400 });
}
