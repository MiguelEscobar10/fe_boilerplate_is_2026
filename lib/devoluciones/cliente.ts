import { ErrorDeRed, SesionExpiradaError } from "@/lib/notificaciones/cliente";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { Devolucion, EstadoFinal, Garantia } from "./tipos";

// Llamadas del navegador a los route handlers de /api/reservas/{id}/devolucion
// y /api/reservas/{id}/deposito/resolucion. Nunca van directo al backend: el
// token está en una cookie httpOnly.

export { ErrorDeRed, SesionExpiradaError };

/** El backend rechazó la operación. `status` y `codigo` dicen por qué. */
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
    const body = (await res.json()) as { message?: string | string[]; codigo?: string };
    const mensaje = Array.isArray(body.message) ? body.message[0] : body.message;
    return new ErrorDeApi(res.status, mensaje, body.codigo);
  } catch {
    return new ErrorDeApi(res.status);
  }
}

async function pedir<T>(url: string, cuerpo?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: cuerpo === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
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

const base = (reservaId: string) => `/api/reservas/${encodeURIComponent(reservaId)}`;

/** La devolución de la reserva, o null si todavía no tiene (404). */
export async function obtenerDevolucion(reservaId: string): Promise<Devolucion | null> {
  try {
    return await pedir<Devolucion>(`${base(reservaId)}/devolucion`);
  } catch (error) {
    if (error instanceof ErrorDeApi && error.status === 404) return null;
    throw error;
  }
}

/** Registra la devolución. `fechaReal` es ISO 8601; `danos` solo con observaciones. */
export function registrarDevolucion(
  reservaId: string,
  datos: { fechaReal: string; estadoFinal: EstadoFinal; danos?: string },
) {
  return pedir<{ devolucionId: string }>(`${base(reservaId)}/devolucion`, datos);
}

/** Estado de la garantía. Un 404 es que la reserva no existe. */
export function obtenerGarantia(reservaId: string) {
  return pedir<Garantia>(`${base(reservaId)}/deposito/resolucion`);
}

/** Resuelve el depósito y cierra la reserva. `motivo` solo si se retiene algo. */
export function resolverDeposito(
  reservaId: string,
  datos: { montoRetenido: number; motivo?: string },
) {
  return pedir<Garantia>(`${base(reservaId)}/deposito/resolucion`, datos);
}
