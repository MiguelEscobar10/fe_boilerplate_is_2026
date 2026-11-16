import type { ReactNode } from "react";
import { requireUser, type Rol } from "@/lib/dal";

type Props = {
  /** Roles que pueden ver el contenido. */
  roles: Rol[];
  children: ReactNode;
};

/**
 * Envuelve una página que solo ciertos roles pueden ver.
 *
 * - Sin sesión: manda al login.
 * - Con otro rol: muestra "Acceso restringido".
 *
 * Esconder pantallas es solo comodidad: el backend vuelve a revisar el rol en
 * cada petición (@Roles) y responde 403 si no corresponde.
 *
 * Uso, en una página (Server Component):
 *
 *   <RutaProtegida roles={["ARRENDADOR"]}>...</RutaProtegida>
 */
export async function RutaProtegida({ roles, children }: Props) {
  const user = await requireUser();

  if (!roles.includes(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <main className="max-w-sm text-center">
          <h1 className="mb-2 text-2xl font-semibold">Acceso restringido</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tu cuenta no tiene permiso para ver esta página.
          </p>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
