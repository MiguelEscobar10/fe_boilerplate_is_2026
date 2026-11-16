import type { Metadata } from "next";
import { RegisterForm } from "../register-form";

export const metadata: Metadata = {
  title: "Registrate como arrendador",
};

export default function RegistroArrendadorPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <main className="w-full max-w-sm rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
        <h1 className="mb-1 text-2xl font-semibold">Registrate como arrendador</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">Publicá tus equipos y espacios para alquilarlos.</p>
        <RegisterForm rol="ARRENDADOR" />
      </main>
    </div>
  );
}
