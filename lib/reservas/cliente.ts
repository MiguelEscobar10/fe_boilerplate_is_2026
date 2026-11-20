import { pedirJson } from "@/lib/verificacion/cliente";
import type { DatosSolicitud, Reserva } from "./tipos";

// Llamadas del navegador a los route handlers de /api/reservas. Reutiliza el
// cliente de verificación: sus errores (ErrorDeApi con `status` y `codigo`,
// ErrorDeRed, SesionExpiradaError) son los que ya conoce el resto de pantallas.

export { ErrorDeApi, ErrorDeRed, SesionExpiradaError } from "@/lib/verificacion/cliente";

/** POST /reservas: registra la solicitud PENDIENTE. */
export function solicitarReserva(datos: DatosSolicitud) {
  return pedirJson<Reserva>("/api/reservas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}
