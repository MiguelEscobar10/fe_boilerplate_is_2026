// Contrato de la solicitud y la consulta de reservas (backend, BE-03.1 /
// MP4-49, docs/modulos/reservas.md). No agregar campos que el backend no envía.

import type { EstadoReserva } from "@/lib/solicitudes/tipos";

export type { EstadoReserva };

export type UnidadTarifa = "HORA" | "DIA" | "NOCHE" | "SEMANA";

/** Respuesta 201 de POST /reservas y 200 de GET /reservas/{id}. */
export type Reserva = {
  id: string;
  estado: EstadoReserva;
  publicacion: { id: string; nombre: string };
  /** Con su desfase: `2026-11-12T09:00:00-06:00`. */
  inicio: string;
  fin: string;
  /** Costo estimado con dos decimales, como texto ("45.00"). No incluye el depósito. */
  costoAlquiler: string;
  /** Depósito, aparte del costo. Texto con dos decimales. */
  depositoMonto: string;
  creadaAt: string;
  decididaAt: string | null;
  motivoRechazo: string | null;
};

/** Lo único que se envía: el monto lo calcula el backend. */
export type DatosSolicitud = {
  publicacionId: string;
  inicio: string;
  fin: string;
};

/** Valores del campo `codigo` en los errores de la solicitud. */
export const FECHA_PASADA = "FECHA_PASADA";
export const PERIODO_NO_DISPONIBLE = "PERIODO_NO_DISPONIBLE";
