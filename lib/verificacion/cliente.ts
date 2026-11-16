import { ErrorDeRed, SesionExpiradaError } from "@/lib/notificaciones/cliente";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type {
  Decision,
  EstadoVerificacion,
  SolicitudEnCola,
  Verificacion,
  VerificacionCreada,
} from "./tipos";

// Llamadas del navegador a los route handlers de /api/... del módulo de
// verificación. Nunca van directo al backend: el token está en una cookie
// httpOnly. Reutiliza los errores de red y de sesión de notificaciones.

export { ErrorDeRed, SesionExpiradaError };

/** El backend respondió con un error que la pantalla debe explicar. */
export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    /** Mensaje del backend, si mandó uno. */
    readonly detalle?: string,
    /** `codigo` del cuerpo, si el backend mandó uno (p. ej. VERIFICACION_REQUERIDA). */
    readonly codigo?: string,
  ) {
    super(detalle ?? `La solicitud respondió ${status}.`);
    this.name = "ErrorDeApi";
  }
}

async function errorDe(res: Response): Promise<ErrorDeApi> {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      codigo?: string;
    };
    const mensaje = Array.isArray(body.message) ? body.message[0] : body.message;
    return new ErrorDeApi(res.status, mensaje, body.codigo);
  } catch {
    return new ErrorDeApi(res.status);
  }
}

/** Uso interno del módulo de verificación (también lo usa requisito.ts). */
export async function pedirJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ErrorDeRed();
  }

  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) {
    throw new ErrorDeRed();
  }
  if (!res.ok) {
    throw await errorDe(res);
  }
  return (await res.json()) as T;
}

/** Envía el documento de identidad. El archivo va en el campo `documento`. */
export function enviarDocumento(archivo: File) {
  const datos = new FormData();
  datos.append("documento", archivo);
  return pedirJson<VerificacionCreada>("/api/usuarios/me/verificaciones", {
    method: "POST",
    body: datos,
  });
}

/** La última solicitud propia, o null si todavía no envió ninguna (404). */
export async function obtenerUltima(): Promise<Verificacion | null> {
  try {
    return await pedirJson<Verificacion>("/api/usuarios/me/verificaciones/ultima");
  } catch (error) {
    if (error instanceof ErrorDeApi && error.status === 404) return null;
    throw error;
  }
}

/** Cola del REVISOR (por defecto, las PENDIENTE). */
export function obtenerCola(estado: EstadoVerificacion = "PENDIENTE") {
  return pedirJson<SolicitudEnCola[]>(
    `/api/verificaciones?${new URLSearchParams({ estado })}`,
  );
}

export function decidir(id: string, decision: Decision, motivo?: string) {
  return pedirJson<VerificacionCreada>(
    `/api/verificaciones/${encodeURIComponent(id)}/decision`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(motivo ? { decision, motivo } : { decision }),
    },
  );
}

/** Ruta del route handler que abre el documento de una solicitud. */
export function urlDocumento(id: string) {
  return `/api/verificaciones/${encodeURIComponent(id)}/documento`;
}
