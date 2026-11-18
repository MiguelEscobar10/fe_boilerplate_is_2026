import { irALogin } from "@/lib/notificaciones/navegacion";
import type {
  Decision,
  DecisionGuardada,
  EstadoReserva,
  PaginaSolicitudes,
} from "./tipos";

// Llamadas del navegador a los route handlers de /api/arrendador/solicitudes
// y /api/reservas/:id/decision. Nunca van directo al backend: el token está
// en una cookie httpOnly.

/** No hubo respuesta (sin conexión o backend caído, 502 del route handler). */
export class ErrorDeRed extends Error {
  constructor() {
    super("No se pudo conectar con el servidor.");
    this.name = "ErrorDeRed";
  }
}

/** La sesión expiró. Ya se inició la navegación a /login. */
export class SesionExpiradaError extends Error {
  constructor() {
    super("La sesión expiró.");
    this.name = "SesionExpiradaError";
  }
}

/**
 * El backend rechazó la decisión. `status` y `codigo` dicen por qué:
 * - 409 `SOLICITUD_YA_DECIDIDA` o `CONFLICTO_DISPONIBILIDAD`;
 * - 403 la solicitud es de otro arrendador;
 * - 404 la reserva ya no existe;
 * - 400 datos inválidos (`message` del backend).
 */
export class DecisionRechazadaError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string | undefined,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "DecisionRechazadaError";
  }
}

export function esAbortado(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function leerError(res: Response) {
  try {
    const body = (await res.json()) as {
      codigo?: string;
      message?: string | string[];
    };
    const mensaje = Array.isArray(body.message) ? body.message[0] : body.message;
    return { codigo: body.codigo, mensaje: mensaje ?? "" };
  } catch {
    return { codigo: undefined, mensaje: "" };
  }
}

async function enviar(url: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      cache: "no-store",
    });
  } catch (error) {
    if (esAbortado(error)) throw error;
    throw new ErrorDeRed();
  }
  if (res.status === 401) {
    irALogin();
    throw new SesionExpiradaError();
  }
  if (res.status >= 502 && res.status <= 504) {
    throw new ErrorDeRed();
  }
  return res;
}

export async function obtenerSolicitudes(
  { estado, page, limit }: { estado: EstadoReserva | null; page: number; limit: number },
  signal?: AbortSignal,
): Promise<PaginaSolicitudes> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (estado) query.set("estado", estado);
  const res = await enviar(`/api/arrendador/solicitudes?${query}`, { signal });
  if (!res.ok) {
    throw new Error(`La solicitud respondió ${res.status}.`);
  }
  return (await res.json()) as PaginaSolicitudes;
}

export async function decidirSolicitud(
  id: string,
  decision: Decision,
  motivo?: string,
): Promise<DecisionGuardada> {
  const body: { decision: Decision; motivo?: string } = { decision };
  if (decision === "RECHAZAR" && motivo) body.motivo = motivo;

  const res = await enviar(`/api/reservas/${encodeURIComponent(id)}/decision`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return (await res.json()) as DecisionGuardada;

  const { codigo, mensaje } = await leerError(res);
  throw new DecisionRechazadaError(res.status, codigo, mensaje);
}
