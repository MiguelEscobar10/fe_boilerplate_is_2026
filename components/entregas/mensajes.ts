import { ErrorDeRed } from "@/lib/entregas/cliente";

export function fecha(iso: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function mensajeGeneral(error: unknown, accion: string) {
  return error instanceof ErrorDeRed
    ? `No se pudo ${accion}. Revisa tu conexión.`
    : `No se pudo ${accion}. Inténtalo de nuevo.`;
}
