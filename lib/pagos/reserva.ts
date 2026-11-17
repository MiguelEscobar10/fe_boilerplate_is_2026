import "server-only";

import type { ResumenReserva } from "./tipos";

/**
 * ⚠️ DATOS DE PRUEBA. Cambiar antes de la entrega.
 *
 * Todavía no existe un endpoint que devuelva el alquiler y el depósito de una
 * reserva (BE-03.1, de Mario, no está en main), ni la pantalla de reservas
 * (FE-03.1). Mientras tanto, la pantalla de pago muestra estos importes fijos.
 *
 * El backend NO usa estos valores: cobra con los importes guardados en la
 * reserva, y la pantalla muestra el `montoTotal` que devuelve al pagar.
 */
const DATOS_DE_PRUEBA = {
  alquiler: "45.00",
  deposito: "5.05",
} as const;

/**
 * Importes de la reserva para el resumen de cobro. Devuelve null si la
 * reserva no existe.
 *
 * Es el único punto de la pantalla de pago que lee la reserva: al cambiarlo
 * por la llamada real no hay que tocar nada más.
 */
export async function obtenerResumenReserva(id: string): Promise<ResumenReserva | null> {
  // TODO(BE-03.1 / FE-03.1): reemplazar por la llamada real al backend, p. ej.
  //   const res = await fetch(apiUrl(`reservas/${encodeURIComponent(id)}`), {
  //     headers: { Authorization: `Bearer ${await getSession()}` },
  //     cache: "no-store",
  //   });
  //   if (res.status === 404) return null;
  // y mapear el alquiler y el depósito de la respuesta.
  return { id, ...DATOS_DE_PRUEBA };
}
