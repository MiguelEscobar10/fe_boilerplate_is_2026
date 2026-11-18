// TODO: irALogin vive en el módulo de notificaciones (FE-10.1). Conviene
// moverlo a un lugar común (p. ej. lib/navegacion.ts) cuando se ordene el
// código compartido; aquí solo se importa, sin modificarlo.
import { irALogin } from "@/lib/notificaciones/navegacion";
import { ERROR_DE_CONEXION, traducirErrorPago, type ErrorPago } from "./errores";
import type { DatosTarjeta, PagoSimulado } from "./tipos";

// Llamada del navegador al route handler de /api/reservas/{id}/pagos/simulados.
// Nunca va directo al backend: el token está en una cookie httpOnly.

export type ResultadoPeticionPago =
  | { tipo: "pago"; pago: PagoSimulado }
  | { tipo: "error"; error: ErrorPago }
  | { tipo: "sesion-expirada" };

/**
 * Envía la tarjeta para pagar la reserva. El body lleva solo los tres datos
 * de la tarjeta: ni montos ni escenario (el backend saca el monto de la
 * reserva y rechaza cualquier campo extra).
 */
export async function pagarReserva(
  reservaId: string,
  { numeroTarjeta, vencimiento, cvv }: DatosTarjeta,
): Promise<ResultadoPeticionPago> {
  let res: Response;
  try {
    res = await fetch(`/api/reservas/${encodeURIComponent(reservaId)}/pagos/simulados`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ numeroTarjeta, vencimiento, cvv }),
      cache: "no-store",
    });
  } catch {
    return { tipo: "error", error: ERROR_DE_CONEXION };
  }

  if (res.status === 401) {
    irALogin();
    return { tipo: "sesion-expirada" };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await res.json();
  } catch {
    // Sin body JSON: se traduce solo por status.
  }

  if (res.ok && esPagoSimulado(cuerpo)) {
    return { tipo: "pago", pago: cuerpo };
  }
  return {
    tipo: "error",
    error: traducirErrorPago(res.ok ? 500 : res.status, (cuerpo as object | null) ?? null),
  };
}

function esPagoSimulado(valor: unknown): valor is PagoSimulado {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    (v.estado === "APROBADO" || v.estado === "RECHAZADO") &&
    typeof v.intento === "number" &&
    typeof v.montoTotal === "string"
  );
}
