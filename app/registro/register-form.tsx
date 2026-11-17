"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type RegisterState } from "@/app/actions/auth";

const initialState: RegisterState = {};

const inputClass =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-100";

type Props = {
  rol: "ARRENDADOR" | "ARRENDATARIO";
};

export function RegisterForm({ rol }: Props) {
  const [state, formAction, pending] = useActionState(register, initialState);
  const otro = rol === "ARRENDADOR" ? "arrendatario" : "arrendador";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="rol" value={rol} />

      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          autoComplete="name"
          required
          maxLength={100}
          defaultValue={state.fields?.nombre}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="telefono" className="text-sm font-medium">
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          required
          placeholder="70001234"
          defaultValue={state.fields?.telefono}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
          defaultValue={state.fields?.email}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿Querés registrarte como {otro}?{" "}
        <Link href={`/registro/${otro}`} className="underline">
          Registrate aquí
        </Link>
        <br />
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
