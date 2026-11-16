// Reglas de una publicación (H01). Las usan el formulario (antes de enviar) y
// la Server Action (otra vez, en el servidor). El backend las vuelve a revisar.

export const TIPOS = [
  { valor: "EQUIPO", etiqueta: "Equipo" },
  { valor: "ESPACIO", etiqueta: "Espacio" },
] as const;

export const UNIDADES = [
  { valor: "HORA", etiqueta: "por hora" },
  { valor: "DIA", etiqueta: "por día" },
  { valor: "NOCHE", etiqueta: "por noche" },
  { valor: "SEMANA", etiqueta: "por semana" },
] as const;

export const MAX_FOTOS = 10;
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;
const TIPOS_FOTO = ["image/jpeg", "image/png"];
const MONTO = /^\d{1,10}(\.\d{1,2})?$/;

export type CampoPublicacion =
  | "tipo"
  | "nombre"
  | "descripcion"
  | "ubicacion"
  | "tarifaMonto"
  | "tarifaUnidad"
  | "depositoMonto"
  | "condiciones"
  | "imagenes";

export type ErroresCampos = Partial<Record<CampoPublicacion, string>>;

type Datos = {
  tipo: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  tarifaMonto: string;
  tarifaUnidad: string;
  depositoMonto: string;
  condiciones: string;
  imagenes: { name: string; size: number; type: string }[];
};

/** Lee el formulario con los textos recortados y solo las fotos con contenido. */
export function leerFormulario(formData: FormData): Datos {
  const texto = (campo: string) => String(formData.get(campo) ?? "").trim();
  return {
    tipo: texto("tipo"),
    nombre: texto("nombre"),
    descripcion: texto("descripcion"),
    ubicacion: texto("ubicacion"),
    tarifaMonto: texto("tarifaMonto"),
    tarifaUnidad: texto("tarifaUnidad"),
    depositoMonto: texto("depositoMonto"),
    condiciones: texto("condiciones"),
    imagenes: formData
      .getAll("imagenes")
      .filter((f): f is File => typeof f === "object" && f !== null && "size" in f && f.size > 0),
  };
}

export function validarPublicacion(d: Datos): ErroresCampos {
  const e: ErroresCampos = {};

  if (!TIPOS.some((t) => t.valor === d.tipo)) e.tipo = "Elegí si es un equipo o un espacio.";

  if (!d.nombre) e.nombre = "El nombre es obligatorio.";
  else if (d.nombre.length > 100) e.nombre = "El nombre no puede pasar de 100 caracteres.";

  if (d.descripcion.length > 1000)
    e.descripcion = "La descripción no puede pasar de 1000 caracteres.";

  if (!d.ubicacion) e.ubicacion = "La ubicación es obligatoria.";
  else if (d.ubicacion.length > 200) e.ubicacion = "La ubicación no puede pasar de 200 caracteres.";

  if (!d.tarifaMonto) e.tarifaMonto = "La tarifa es obligatoria.";
  else if (!MONTO.test(d.tarifaMonto) || Number(d.tarifaMonto) <= 0)
    e.tarifaMonto = "La tarifa debe ser mayor que 0, con hasta dos decimales.";

  if (!UNIDADES.some((u) => u.valor === d.tarifaUnidad))
    e.tarifaUnidad = "Elegí la unidad de cobro.";

  if (d.depositoMonto && !MONTO.test(d.depositoMonto))
    e.depositoMonto = "El depósito debe ser 0 o más, con hasta dos decimales.";

  if (d.condiciones.length > 1000)
    e.condiciones = "Las condiciones no pueden pasar de 1000 caracteres.";

  if (d.imagenes.length === 0) e.imagenes = "Agregá al menos una fotografía.";
  else if (d.imagenes.length > MAX_FOTOS)
    e.imagenes = `Se permiten como máximo ${MAX_FOTOS} fotografías.`;
  else {
    const mala = d.imagenes.find((f) => !TIPOS_FOTO.includes(f.type));
    const grande = d.imagenes.find((f) => f.size > MAX_BYTES_FOTO);
    if (mala) e.imagenes = `"${mala.name}" no es JPG ni PNG.`;
    else if (grande) e.imagenes = `"${grande.name}" pesa más de 5 MB.`;
  }

  return e;
}

/**
 * Ubica en qué campo va un mensaje 400 del backend (BE-01.1 responde en
 * español, empezando por el campo). Si no se reconoce, va como error general.
 */
export function campoDeMensaje(mensaje: string): CampoPublicacion | null {
  const m = mensaje.toLowerCase();
  if (m.includes("tipo")) return "tipo";
  if (m.includes("nombre")) return "nombre";
  if (m.includes("descripción")) return "descripcion";
  if (m.includes("ubicación")) return "ubicacion";
  if (m.includes("unidad")) return "tarifaUnidad";
  if (m.includes("tarifa")) return "tarifaMonto";
  if (m.includes("depósito")) return "depositoMonto";
  if (m.includes("condiciones")) return "condiciones";
  if (m.includes("imagen") || m.includes("fotograf")) return "imagenes";
  return null;
}
