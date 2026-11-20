// Contrato de GET /publicaciones (BE-02.1, docs/modulos/catalogo.md en el backend).

export const POR_PAGINA = 12;
/** Largo máximo que el backend acepta en `buscar`. */
export const BUSCAR_MAX = 100;

export type PublicacionResumen = {
  id: string;
  nombre: string;
  /** Tarifa por unidad, como número (15, 15.5). */
  precio: number;
  tipo: "EQUIPO" | "ESPACIO";
  tarifaUnidad: "HORA" | "DIA" | "NOCHE" | "SEMANA";
  ubicacion: string;
  /** Ruta de la foto principal en el backend, o null si no tiene. */
  imagenUrl: string | null;
};

export type PaginaCatalogo = {
  items: PublicacionResumen[];
  page: number;
  /** Total de coincidencias, no solo las de esta página. */
  total: number;
};

export type ConsultaCatalogo = {
  buscar: string;
  page: number;
};
