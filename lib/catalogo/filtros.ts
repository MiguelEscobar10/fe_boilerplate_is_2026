import { hoyEnElSalvador } from "@/lib/ingresos/fechas";
import { etiquetaTipo } from "./formato";
import {
  CAMPOS_FILTRO,
  SIN_FILTROS,
  UBICACION_MAX,
  type FiltrosCatalogo,
} from "./tipos";

const MONTO = /^\d{1,10}(\.\d{1,2})?$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Recorta los textos; es lo que se valida y lo que se manda. */
export function normalizarFiltros(f: FiltrosCatalogo): FiltrosCatalogo {
  return {
    ...f,
    ubicacion: f.ubicacion.trim(),
    precioMin: f.precioMin.trim(),
    precioMax: f.precioMax.trim(),
  };
}

/**
 * Revisa los filtros antes de consultar (las mismas reglas de BE-11.1).
 * Devuelve el mensaje del primer problema, o null si se pueden enviar.
 */
export function validarFiltros(f: FiltrosCatalogo, hoy = hoyEnElSalvador()): string | null {
  for (const [campo, nombre] of [
    ["precioMin", "El precio mínimo"],
    ["precioMax", "El precio máximo"],
  ] as const) {
    if (f[campo] && !MONTO.test(f[campo])) {
      return `${nombre} debe ser un número de 0 en adelante, con hasta dos decimales.`;
    }
  }
  if (f.precioMin && f.precioMax && Number(f.precioMin) > Number(f.precioMax)) {
    return "El precio mínimo no puede ser mayor que el máximo.";
  }
  if (f.ubicacion.length > UBICACION_MAX) {
    return `La ubicación no puede pasar de ${UBICACION_MAX} caracteres.`;
  }
  if (Boolean(f.fechaInicio) !== Boolean(f.fechaFin)) {
    return "Para filtrar por fechas elige la fecha de inicio y la de fin.";
  }
  if (f.fechaInicio && f.fechaFin) {
    if (f.fechaInicio < hoy) return "La fecha de inicio no puede estar en el pasado.";
    if (f.fechaFin < f.fechaInicio) {
      return "La fecha de fin no puede ser anterior a la de inicio.";
    }
  }
  return null;
}

/**
 * Filtros que vienen de la URL. Lo que no sirve se ignora en vez de mandarlo
 * al backend, que respondería 400: un valor mal formado, un rango de precios
 * al revés o unas fechas incompletas o pasadas.
 */
export function leerFiltros(
  params: Record<string, string | string[] | undefined>,
  hoy = hoyEnElSalvador(),
): FiltrosCatalogo {
  const texto = (campo: string) => {
    const valor = params[campo];
    return typeof valor === "string" ? valor.trim() : "";
  };
  const monto = (campo: string) => (MONTO.test(texto(campo)) ? texto(campo) : "");
  const fecha = (campo: string) => (FECHA.test(texto(campo)) ? texto(campo) : "");
  const tipo = texto("tipo");

  const f: FiltrosCatalogo = {
    tipo: tipo === "EQUIPO" || tipo === "ESPACIO" ? tipo : "",
    ubicacion: texto("ubicacion").slice(0, UBICACION_MAX),
    precioMin: monto("precioMin"),
    precioMax: monto("precioMax"),
    fechaInicio: fecha("fechaInicio"),
    fechaFin: fecha("fechaFin"),
  };
  if (f.precioMin && f.precioMax && Number(f.precioMin) > Number(f.precioMax)) {
    f.precioMin = "";
    f.precioMax = "";
  }
  if (!f.fechaInicio || !f.fechaFin || f.fechaInicio < hoy || f.fechaFin < f.fechaInicio) {
    f.fechaInicio = "";
    f.fechaFin = "";
  }
  return f;
}

export function hayFiltros(f: FiltrosCatalogo): boolean {
  return CAMPOS_FILTRO.some((campo) => f[campo] !== "");
}

/** `2026-12-01` → `01/12/2026`. */
function fechaCorta(dia: string) {
  const [anio, mes, d] = dia.split("-");
  return `${d}/${mes}/${anio}`;
}

export type FiltroActivo = {
  clave: string;
  etiqueta: string;
  /** Los filtros que quedan al quitar este. */
  sinEl: FiltrosCatalogo;
};

/** Un elemento por cada filtro aplicado, para mostrarlo y poder quitarlo. */
export function filtrosActivos(f: FiltrosCatalogo): FiltroActivo[] {
  const activos: FiltroActivo[] = [];
  if (f.tipo) {
    activos.push({
      clave: "tipo",
      etiqueta: `Tipo: ${etiquetaTipo(f.tipo)}`,
      sinEl: { ...f, tipo: "" },
    });
  }
  if (f.ubicacion) {
    activos.push({
      clave: "ubicacion",
      etiqueta: `Ubicación: ${f.ubicacion}`,
      sinEl: { ...f, ubicacion: "" },
    });
  }
  if (f.precioMin || f.precioMax) {
    const etiqueta =
      f.precioMin && f.precioMax
        ? `Precio: $${f.precioMin} a $${f.precioMax}`
        : f.precioMin
          ? `Precio: desde $${f.precioMin}`
          : `Precio: hasta $${f.precioMax}`;
    activos.push({
      clave: "precio",
      etiqueta,
      sinEl: { ...f, precioMin: SIN_FILTROS.precioMin, precioMax: SIN_FILTROS.precioMax },
    });
  }
  if (f.fechaInicio && f.fechaFin) {
    activos.push({
      clave: "fechas",
      etiqueta: `Disponible: ${fechaCorta(f.fechaInicio)} a ${fechaCorta(f.fechaFin)}`,
      sinEl: { ...f, fechaInicio: "", fechaFin: "" },
    });
  }
  return activos;
}
