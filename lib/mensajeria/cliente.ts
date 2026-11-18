import { ErrorDeRed, SesionExpiradaError } from "@/lib/notificaciones/cliente";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type {
  ConversacionDeReserva,
  MensajeCreado,
  PaginaMensajes,
} from "./tipos";

// Llamadas del navegador a los route handlers de mensajería. Nunca van
// directo al backend: el token está en una cookie httpOnly.

export { ErrorDeRed, SesionExpiradaError };

/** El backend respondió con error: `status`, `codigo` (409) y su `message`. */
export class ErrorDeApi extends Error {
  constructor(
    readonly status: number,
    readonly detalle?: string,
    readonly codigo?: string,
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
    };
    const mensaje = Array.isArray(body.message)
      ? body.message[0]
      : body.message;
    return new ErrorDeApi(res.status, mensaje, body.codigo);
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

/** Abre o recupera la conversación de la reserva (H16). */
export function abrirConversacionDeReserva(reservaId: string) {
  return pedir<ConversacionDeReserva>(
    `/api/reservas/${encodeURIComponent(reservaId)}/conversacion`,
    { method: "POST" },
  );
}

const mensajes = (conversacionId: string) =>
  `/api/conversaciones/${encodeURIComponent(conversacionId)}/mensajes`;

export const POR_PAGINA = 50;

/** Una página del historial, en orden cronológico. */
export function obtenerMensajes(conversacionId: string, page = 1) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(POR_PAGINA),
  });
  return pedir<PaginaMensajes>(`${mensajes(conversacionId)}?${query}`);
}

export function enviarMensaje(conversacionId: string, contenido: string) {
  return pedir<MensajeCreado>(mensajes(conversacionId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contenido }),
  });
}
