"use server";

import { redirect } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { getSession } from "@/lib/session";
import {
  campoDeMensaje,
  leerFormulario,
  validarPublicacion,
  type ErroresCampos,
} from "@/lib/publicaciones/reglas";

export type EstadoPublicacion = {
  estado: "inicial" | "error" | "restringido";
  errores?: ErroresCampos;
  error?: string;
};

/**
 * Envía la publicación a POST /publicaciones como multipart/form-data, con el
 * token de la cookie httpOnly. Con 201 redirige al detalle (estado "exito").
 */
export async function crearPublicacion(
  _prev: EstadoPublicacion,
  formData: FormData,
): Promise<EstadoPublicacion> {
  const datos = leerFormulario(formData);
  const errores = validarPublicacion(datos);
  if (Object.keys(errores).length > 0) {
    return { estado: "error", errores, error: "Revisá los campos marcados." };
  }

  const token = await getSession();
  if (!token) redirect("/login");

  // Se arma de nuevo para mandar solo los campos esperados (el backend rechaza
  // campos de más) y sin los opcionales vacíos.
  const body = new FormData();
  for (const campo of ["tipo", "nombre", "ubicacion", "tarifaMonto", "tarifaUnidad"] as const) {
    body.set(campo, datos[campo]);
  }
  for (const campo of ["descripcion", "depositoMonto", "condiciones"] as const) {
    if (datos[campo]) body.set(campo, datos[campo]);
  }
  for (const foto of formData.getAll("imagenes")) {
    if (foto instanceof File && foto.size > 0) body.append("imagenes", foto, foto.name);
  }

  let id: string;
  try {
    const res = await fetch(apiUrl("publicaciones"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return { estado: "restringido" };
    }
    if (res.status === 400) {
      const { message } = (await res.json()) as { message?: string | string[] };
      const mensajes = Array.isArray(message) ? message : message ? [message] : [];
      const porCampo: ErroresCampos = {};
      const generales: string[] = [];
      for (const m of mensajes) {
        const campo = campoDeMensaje(m);
        if (campo && !porCampo[campo]) porCampo[campo] = m;
        else if (!campo) generales.push(m);
      }
      return {
        estado: "error",
        errores: porCampo,
        error: generales[0] ?? "Revisá los campos marcados.",
      };
    }
    if (!res.ok) throw new Error(`publicaciones respondió ${res.status}`);

    ({ id } = (await res.json()) as { id: string });
  } catch (error) {
    console.error("Error al publicar:", error);
    return { estado: "error", error: "No se pudo publicar. Intentá más tarde." };
  }

  redirect(`/publicaciones/${id}?nueva=1`);
}
