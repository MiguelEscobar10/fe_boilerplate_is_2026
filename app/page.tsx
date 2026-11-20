import Link from "next/link";
import { requireUser } from "@/lib/dal";

const ROL_LEGIBLE = {
  ARRENDADOR: "arrendador",
  ARRENDATARIO: "arrendatario",
  REVISOR: "revisor",
} as const;

// "Cerrar sesión" vive en el encabezado (components/encabezado.tsx).
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
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/publicaciones"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Buscar equipos y espacios
        </Link>
      </div>
      {user.rol === "ARRENDADOR" && (
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/publicaciones/nueva"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Publicar un equipo o espacio
          </Link>
          <Link
            href="/arrendador/solicitudes?estado=PENDIENTE"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Mis solicitudes
          </Link>
        </div>
      )}
    </div>
  );
}
