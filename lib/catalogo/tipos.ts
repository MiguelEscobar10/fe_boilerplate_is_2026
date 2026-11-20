// Contrato de GET /publicaciones (BE-02.1 y BE-11.1, docs/modulos/catalogo.md en el backend).

export const POR_PAGINA = 12;
/** Largo máximo que el backend acepta en `buscar`. */
export const BUSCAR_MAX = 100;
/** Largo máximo que el backend acepta en `ubicacion`. */
export const UBICACION_MAX = 200;

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

/** Filtros del catálogo (H11, BE-11.1). Texto vacío significa "sin ese filtro". */
export type FiltrosCatalogo = {
  tipo: "" | "EQUIPO" | "ESPACIO";
  ubicacion: string;
  precioMin: string;
  precioMax: string;
  /** Días `AAAA-MM-DD`; van los dos o ninguno. */
  fechaInicio: string;
  fechaFin: string;
};

export const SIN_FILTROS: FiltrosCatalogo = {
  tipo: "",
  ubicacion: "",
  precioMin: "",
  precioMax: "",
  fechaInicio: "",
  fechaFin: "",
};

export const CAMPOS_FILTRO = Object.keys(SIN_FILTROS) as (keyof FiltrosCatalogo)[];

export type ConsultaCatalogo = {
  buscar: string;
  page: number;
  filtros: FiltrosCatalogo;
};
