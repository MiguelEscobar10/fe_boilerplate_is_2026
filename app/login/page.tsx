import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="w-full max-w-sm rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="mb-6 text-2xl font-semibold">Iniciar sesión</h1>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tenés cuenta? Registrate como{" "}
          <Link href="/registro/arrendador" className="underline">
            arrendador
          </Link>{" "}
          o como{" "}
          <Link href="/registro/arrendatario" className="underline">
            arrendatario
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
