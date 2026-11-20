import "server-only";

import { obtenerReserva } from "@/lib/reservas/api";
import type { ResumenReserva } from "./tipos";

/**
 * Importes de la reserva para el resumen de cobro (alquiler y depósito, los
 * que el backend guardó al solicitarla). Devuelve null si la reserva no existe
 * o no es de quien la pide.
 *
 * El backend NO usa estos valores para cobrar: cobra con los importes de la
 * reserva guardada, y la pantalla muestra el `montoTotal` que devuelve al pagar.
 */
export async function obtenerResumenReserva(id: string): Promise<ResumenReserva | null> {
  const reserva = await obtenerReserva(id);
  if (!reserva) return null;
  return { id: reserva.id, alquiler: reserva.costoAlquiler, deposito: reserva.depositoMonto };
}
