import type { CodigoErrorPago } from "./tipos";

/** Error del pago ya traducido para mostrar al usuario. */
export type ErrorPago = {
  mensaje: string;
  /** true si tiene sentido volver a mostrar el formulario. */
  reintentable: boolean;
};

const POR_CODIGO: Record<CodigoErrorPago, ErrorPago> = {
  TARJETA_NO_VALIDA: {
    mensaje:
      "La tarjeta no es válida para la pasarela de prueba. Usa una terminada en 4242 (aprueba) o 0002 (rechaza).",
    reintentable: true,
  },
  PAGO_EN_PROCESO: {
    mensaje: "Ya hay un pago en proceso para esta reserva. Espera unos segundos y vuelve a intentarlo.",
    reintentable: true,
  },
  PAGO_YA_APROBADO: {
    mensaje: "Esta reserva ya tiene un pago aprobado. No hace falta volver a pagar.",
    reintentable: false,
  },
  INTENTOS_AGOTADOS: {
    mensaje: "Ya usaste los 3 intentos de pago de esta reserva. El cobro sigue pendiente.",
    reintentable: false,
  },
  RESERVA_NO_CONFIRMADA: {
    mensaje: "Solo se puede pagar una reserva confirmada por el arrendador.",
    reintentable: false,
  },
};

const POR_STATUS: Record<number, ErrorPago> = {
  400: {
    mensaje: "Revisa los datos de la tarjeta e inténtalo de nuevo.",
    reintentable: true,
  },
  403: {
    mensaje: "Solo el arrendatario de la reserva puede pagarla.",
    reintentable: false,
  },
  404: {
    mensaje: "La reserva no existe o no es tuya.",
    reintentable: false,
  },
};

export const ERROR_DE_CONEXION: ErrorPago = {
  mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo en unos segundos.",
  reintentable: true,
};

const ERROR_INESPERADO: ErrorPago = {
  mensaje: "Ocurrió un error inesperado al procesar el pago. Inténtalo de nuevo.",
  reintentable: true,
};

type CuerpoError = {
  codigo?: unknown;
  message?: unknown;
};

function esCodigoConocido(codigo: unknown): codigo is CodigoErrorPago {
  return typeof codigo === "string" && codigo in POR_CODIGO;
}

/**
 * Traduce un error del backend. Primero por `codigo` (400 y 409 del pago);
 * si no viene, por status. En un 400 de validación sin código se muestra el
 * `message` del backend: sus mensajes son fijos y nunca repiten la tarjeta.
 * (El 401 no llega aquí: el cliente manda al login antes.)
 */
export function traducirErrorPago(status: number, cuerpo: CuerpoError | null): ErrorPago {
  if (esCodigoConocido(cuerpo?.codigo)) {
    return POR_CODIGO[cuerpo.codigo];
  }
  if (status === 400) {
    const message = Array.isArray(cuerpo?.message) ? cuerpo.message[0] : cuerpo?.message;
    return typeof message === "string" && message
      ? { mensaje: message, reintentable: true }
      : POR_STATUS[400];
  }
  if (status >= 502 && status <= 504) {
    return ERROR_DE_CONEXION;
  }
  return POR_STATUS[status] ?? ERROR_INESPERADO;
}
