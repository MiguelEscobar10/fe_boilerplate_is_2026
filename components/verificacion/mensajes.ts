import { ErrorDeApi, ErrorDeRed } from "@/lib/verificacion/cliente";

/** Fecha corta en español, en la zona horaria del navegador. */
export function fecha(iso: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Mensaje comprensible para los errores comunes del módulo. */
export function mensajeGeneral(error: unknown, accion: string) {
  if (error instanceof ErrorDeRed) {
    return `No se pudo ${accion}. Revisa tu conexión.`;
  }
  if (error instanceof ErrorDeApi && error.status === 403) {
    return "Tu cuenta no tiene permiso para esta acción.";
  }
  return `No se pudo ${accion}. Inténtalo de nuevo.`;
}
