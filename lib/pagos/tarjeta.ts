import type { DatosTarjeta } from "./tipos";

// Validación en el navegador, con las mismas reglas que el DTO del backend
// (CrearPagoSimuladoDto) más la de las tarjetas de prueba. Los mensajes nunca
// incluyen lo que escribió el usuario.

/** Últimos 4 dígitos que acepta la pasarela de prueba. */
export const TARJETAS_DE_PRUEBA = {
  APRUEBA: "4242",
  RECHAZA: "0002",
} as const;

export type CampoTarjeta = keyof DatosTarjeta;
export type ErroresTarjeta = Partial<Record<CampoTarjeta, string>>;

/** Quita los espacios que el usuario escribe para agrupar los dígitos. */
export function sinEspacios(valor: string) {
  return valor.replace(/\s+/g, "");
}

export function normalizarTarjeta(datos: DatosTarjeta): DatosTarjeta {
  return {
    numeroTarjeta: sinEspacios(datos.numeroTarjeta),
    vencimiento: sinEspacios(datos.vencimiento),
    cvv: sinEspacios(datos.cvv),
  };
}

export function esTarjetaDePrueba(numero: string) {
  const ultimos4 = sinEspacios(numero).slice(-4);
  return ultimos4 === TARJETAS_DE_PRUEBA.APRUEBA || ultimos4 === TARJETAS_DE_PRUEBA.RECHAZA;
}

/** Valida los datos ya normalizados. Devuelve un objeto vacío si están bien. */
export function validarTarjeta(datos: DatosTarjeta): ErroresTarjeta {
  const errores: ErroresTarjeta = {};

  if (!datos.numeroTarjeta) {
    errores.numeroTarjeta = "Ingresa el número de tarjeta.";
  } else if (!/^\d{13,19}$/.test(datos.numeroTarjeta)) {
    errores.numeroTarjeta = "El número de tarjeta debe tener de 13 a 19 dígitos.";
  } else if (!esTarjetaDePrueba(datos.numeroTarjeta)) {
    errores.numeroTarjeta =
      "Solo se aceptan tarjetas de prueba: usa una terminada en 4242 (aprueba) o 0002 (rechaza).";
  }

  if (!datos.vencimiento) {
    errores.vencimiento = "Ingresa el vencimiento.";
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(datos.vencimiento)) {
    errores.vencimiento = "El vencimiento debe tener el formato MM/AA, con mes de 01 a 12.";
  }

  if (!datos.cvv) {
    errores.cvv = "Ingresa el código de seguridad.";
  } else if (!/^\d{3,4}$/.test(datos.cvv)) {
    errores.cvv = "El código de seguridad debe tener 3 o 4 dígitos.";
  }

  return errores;
}
