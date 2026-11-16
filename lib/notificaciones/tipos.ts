// Contrato de la bandeja (backend, BE-10.1 / MP4-107,
// docs/modulos/notificaciones.md). No agregar campos que el backend no envía.

export type ModuloOrigen =
  | "CATALOGO"
  | "BUSQUEDA"
  | "RESERVAS"
  | "PAGOS_GARANTIA"
  | "MENSAJERIA"
  | "RESENAS"
  | "VERIFICACION"
  | "NOTIFICACIONES"
  | "REPORTES";

export type Notificacion = {
  id: string;
  moduloOrigen: ModuloOrigen;
  titulo: string;
  mensaje: string;
  referencia: { tipo: string; id: string } | null;
  /** ISO 8601 UTC. null = pendiente. */
  leidaAt: string | null;
  /** ISO 8601 UTC. */
  creadaAt: string;
};

/** Respuesta de GET /notificaciones. `total` cuenta todas las del filtro. */
export type Bandeja = {
  items: Notificacion[];
  total: number;
};

/** Respuesta de GET /notificaciones/no-leidas/conteo. */
export type ConteoNoLeidas = {
  noLeidas: number;
};

/** Tamaño de página que pide la bandeja (el backend acepta de 1 a 100). */
export const LIMITE_PAGINA = 20;
