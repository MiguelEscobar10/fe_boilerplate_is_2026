// URL de la API del backend. API_URL ya incluye el prefijo (p. ej. .../api/v1).
export function apiUrl(path: string): URL {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error("Falta la variable de entorno API_URL.");
  }
  return new URL(path, base.replace(/\/?$/, "/"));
}

/**
 * Mensaje de error de una respuesta de NestJS. Las validaciones devuelven
 * `message` como arreglo; se muestra el primero.
 */
export async function apiErrorMessage(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    return Array.isArray(body.message) ? body.message[0] : body.message;
  } catch {
    return undefined;
  }
}
