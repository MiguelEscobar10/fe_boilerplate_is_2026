"use server";

import { redirect } from "next/navigation";
import { apiErrorMessage, apiUrl } from "@/lib/api";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = {
  error?: string;
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Llama a la API de autenticación. Devuelve el token si las credenciales son
// válidas, o null si la API responde 401/403.
async function authenticate(email: string, password: string) {
  const res = await fetch(apiUrl("auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`auth/login respondió ${res.status}`);
  }

  // Ajustar al formato de respuesta real de la API.
  const data = await res.json();
  const token: string | undefined =
    data.token ?? data.accessToken ?? data.access_token;
  if (!token) {
    throw new Error("La respuesta de auth/login no incluye un token.");
  }
  return token;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña.", email };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Ingresa un correo válido.", email };
  }

  let token: string | null;
  try {
    token = await authenticate(email, password);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { error: "No se pudo iniciar sesión. Intenta más tarde.", email };
  }
  if (!token) {
    return { error: "Correo o contraseña incorrectos.", email };
  }

  await createSession(token);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export type RegisterState = {
  error?: string;
  fields?: { email?: string; nombre?: string; telefono?: string };
};

const ROLES_REGISTRO = ["ARRENDADOR", "ARRENDATARIO"] as const;
const TELEFONO_REGEX = /^\d{8,15}$/;

// Registra la cuenta (POST /users) y abre la sesión de una vez, para que la
// persona no tenga que volver a escribir su correo y contraseña.
export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const rol = String(formData.get("rol") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  // Se aceptan espacios o guiones al escribir; al backend van solo dígitos.
  const telefono = String(formData.get("telefono") ?? "").replace(/[\s-]/g, "");
  const fields = { email, nombre, telefono };

  if (!ROLES_REGISTRO.includes(rol as (typeof ROLES_REGISTRO)[number])) {
    return { error: "Elegí si te registrás como arrendador o arrendatario.", fields };
  }
  if (!email || !password || !nombre || !telefono) {
    return { error: "Completá todos los campos.", fields };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Ingresa un correo válido.", fields };
  }
  if (nombre.length > 100) {
    return { error: "El nombre no puede pasar de 100 caracteres.", fields };
  }
  if (!TELEFONO_REGEX.test(telefono)) {
    return { error: "El teléfono debe tener solo dígitos, entre 8 y 15.", fields };
  }

  let token: string | null;
  try {
    const res = await fetch(apiUrl("users"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rol, nombre, telefono }),
      cache: "no-store",
    });
    if (res.status === 409) {
      return { error: "Ya existe una cuenta con ese correo.", fields };
    }
    if (res.status === 400) {
      const message = await apiErrorMessage(res);
      return { error: message ?? "Revisá los datos del formulario.", fields };
    }
    if (!res.ok) {
      throw new Error(`users respondió ${res.status}`);
    }
    token = await authenticate(email, password);
  } catch (error) {
    console.error("Error al registrarse:", error);
    return { error: "No se pudo crear la cuenta. Intenta más tarde.", fields };
  }
  if (!token) {
    // La cuenta se creó pero no se pudo entrar: que inicie sesión a mano.
    redirect("/login");
  }

  await createSession(token);
  redirect("/");
}
