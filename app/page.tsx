import { logout } from "@/app/actions/auth";
import { requireUser } from "@/lib/dal";

const ROL_LEGIBLE = {
  ARRENDADOR: "arrendador",
  ARRENDATARIO: "arrendatario",
  REVISOR: "revisor",
} as const;

export default async function Home() {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-semibold">Hola, {user.nombre ?? user.email}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Entraste como {ROL_LEGIBLE[user.rol]}.
        </p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
