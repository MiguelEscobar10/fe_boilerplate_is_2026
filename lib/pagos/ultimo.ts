import { irALogin } from "@/lib/notificaciones/navegacion";
import type { UltimoPago } from "./tipos";

// Llamada del navegador al route handler de /api/reservas/{id}/pagos/ultimo.
// Nunca va directo al backend: el token está en una cookie httpOnly.

export type ResultadoUltimoPago =
  | { tipo: "pago"; pago: UltimoPago }
  /** 404 con PAGO_NO_REGISTRADO: la reserva es del usuario pero sin pagos. */
  | { tipo: "sin-registro" }
  /** Cualquier otro 404: la reserva no existe o no es suya. */
  | { tipo: "no-disponible" }
  | { tipo: "error" }
  | { tipo: "sesion-expirada" };

/** Consulta el intento de pago más reciente de la reserva. */
export async function consultarUltimoPago(reservaId: string): Promise<ResultadoUltimoPago> {
  let res: Response;
  try {
    res = await fetch(`/api/reservas/${encodeURIComponent(reservaId)}/pagos/ultimo`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { tipo: "error" };
  }

  if (res.status === 401) {
    irALogin();
    return { tipo: "sesion-expirada" };
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await res.json();
  } catch {
    // Sin body JSON: se decide solo por status.
  }

  if (res.status === 404) {
    const codigo = (cuerpo as { codigo?: unknown } | null)?.codigo;
    return codigo === "PAGO_NO_REGISTRADO" ? { tipo: "sin-registro" } : { tipo: "no-disponible" };
  }
  if (res.ok && esUltimoPago(cuerpo)) return { tipo: "pago", pago: cuerpo };
  return { tipo: "error" };
}

const ESTADOS = ["PENDIENTE", "APROBADO", "RECHAZADO"];

function esUltimoPago(valor: unknown): valor is UltimoPago {
  if (typeof valor !== "object" || valor === null) return false;
  const v = valor as Record<string, unknown>;
  return (
    typeof v.pagoId === "string" &&
    typeof v.reservaId === "string" &&
    typeof v.montoTotal === "string" &&
    typeof v.fechaRegistro === "string" &&
    typeof v.estado === "string" &&
    ESTADOS.includes(v.estado)
  );
}
