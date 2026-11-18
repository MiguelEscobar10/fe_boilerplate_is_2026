import { ErrorDeRed, SesionExpiradaError } from "@/lib/notificaciones/cliente";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { Entrega, EntregaCreada } from "./tipos";

// Llamadas del navegador a los route handlers de /api/reservas/{id}/entrega.
// Nunca van directo al backend: el token está en una cookie httpOnly.

export { ErrorDeRed, SesionExpiradaError };

export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    readonly detalle?: string,
    readonly codigo?: string,
    /** Solo en el 422 ENTREGA_NO_HABILITADA. */
    readonly disponibleDesde?: string,
  ) {
    super(detalle ?? `La solicitud respondió ${status}.`);
    this.name = "ErrorDeApi";
  }
}

async function errorDe(res: Response) {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      codigo?: string;
      disponibleDesde?: string;
    };
    const mensaje = Array.isArray(body.message) ? body.message[0] : body.message;
    return new ErrorDeApi(res.status, mensaje, body.codigo, body.disponibleDesde);
  } catch {
    return new ErrorDeApi(res.status);
  }
}

async function pedir<T>(url: string, init: RequestInit = {}): Promise<T> {
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
  if (res.status >= 502 && res.status <= 504) throw new ErrorDeRed();
  if (!res.ok) throw await errorDe(res);
  return (await res.json()) as T;
}

const base = (reservaId: string) =>
  `/api/reservas/${encodeURIComponent(reservaId)}/entrega`;

/** Registra la entrega: `nota` y hasta 5 fotos en `fotos`. */
export function registrarEntrega(reservaId: string, nota: string, fotos: File[]) {
  const datos = new FormData();
  datos.append("nota", nota);
  for (const foto of fotos) datos.append("fotos", foto);
  return pedir<EntregaCreada>(base(reservaId), { method: "POST", body: datos });
}

/** La entrega de la reserva, o null si todavía no tiene (404). */
export async function obtenerEntrega(reservaId: string): Promise<Entrega | null> {
  try {
    return await pedir<Entrega>(base(reservaId));
  } catch (error) {
    if (error instanceof ErrorDeApi && error.status === 404) return null;
    throw error;
  }
}

/** Ruta del route handler que sirve una foto de la entrega. */
export function urlFoto(reservaId: string, orden: number) {
  return `${base(reservaId)}/fotos/${orden}`;
}
