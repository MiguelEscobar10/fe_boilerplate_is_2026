import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { getSession } from "@/lib/session";

export type Rol = "ARRENDADOR" | "ARRENDATARIO" | "REVISOR";

export type UsuarioActual = {
  id: string;
  email: string;
  rol: Rol;
  nombre: string | null;
  telefono: string | null;
};

/**
 * Usuario de la sesión, leído del backend (GET /auth/me) con el token de la
 * cookie httpOnly. El rol viene siempre del backend, nunca de algo guardado en
 * el navegador. `cache` evita repetir la llamada en un mismo render.
 *
 * Devuelve null si no hay sesión o el token ya no es válido.
 */
export const getCurrentUser = cache(async (): Promise<UsuarioActual | null> => {
  const token = await getSession();
  if (!token) return null;

  const res = await fetch(apiUrl("auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error(`auth/me respondió ${res.status}`);
  }
  return (await res.json()) as UsuarioActual;
});

/**
 * Igual que getCurrentUser, pero sin sesión válida manda al login.
 *
 * - Sin cookie: directo a /login.
 * - Con cookie pero token vencido o inválido: a /api/sesion/expirada, que
 *   borra la cookie antes de ir a /login (si no, proxy.ts rebotaría a / y se
 *   formaría un bucle de redirecciones).
 */
export async function requireUser(): Promise<UsuarioActual> {
  const user = await getCurrentUser();
  if (user) return user;

  const token = await getSession();
  redirect(token ? "/api/sesion/expirada" : "/login");
}
