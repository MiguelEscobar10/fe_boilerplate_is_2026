import { COMENTARIO_MAX, PUNTAJE_MAX, PUNTAJE_MIN } from "./tipos";

export type ErroresCalificacion = { puntaje?: string; comentario?: string };

/**
 * Las mismas reglas que el backend, para avisar antes de enviar (H18,
 * criterio 5): puntaje entero de 1 a 5 y comentario de hasta 500 caracteres.
 */
export function validarCalificacion(
  puntaje: number | null,
  comentario: string,
): ErroresCalificacion {
  const errores: ErroresCalificacion = {};
  if (
    puntaje === null ||
    !Number.isInteger(puntaje) ||
    puntaje < PUNTAJE_MIN ||
    puntaje > PUNTAJE_MAX
  ) {
    errores.puntaje = `Elige de ${PUNTAJE_MIN} a ${PUNTAJE_MAX} estrellas.`;
  }
  if (comentario.trim().length > COMENTARIO_MAX) {
    errores.comentario = `El comentario no puede pasar de ${COMENTARIO_MAX} caracteres.`;
  }
  return errores;
}

export type ErroresCalificacionBien = {
  puntajeBien?: string;
  puntajeArrendador?: string;
  comentario?: string;
};

function puntajeValido(p: number | null): p is number {
  return p !== null && Number.isInteger(p) && p >= PUNTAJE_MIN && p <= PUNTAJE_MAX;
}

/**
 * Las mismas reglas que el backend (BE-17.1) para avisar antes de enviar:
 * dos puntajes enteros de 1 a 5 y un comentario de hasta 500 caracteres.
 */
export function validarCalificacionBien(
  puntajeBien: number | null,
  puntajeArrendador: number | null,
  comentario: string,
): ErroresCalificacionBien {
  const errores: ErroresCalificacionBien = {};
  if (!puntajeValido(puntajeBien)) {
    errores.puntajeBien = `Califica el bien de ${PUNTAJE_MIN} a ${PUNTAJE_MAX} estrellas.`;
  }
  if (!puntajeValido(puntajeArrendador)) {
    errores.puntajeArrendador = `Califica al arrendador de ${PUNTAJE_MIN} a ${PUNTAJE_MAX} estrellas.`;
  }
  if (comentario.trim().length > COMENTARIO_MAX) {
    errores.comentario = `El comentario no puede pasar de ${COMENTARIO_MAX} caracteres.`;
  }
  return errores;
}
