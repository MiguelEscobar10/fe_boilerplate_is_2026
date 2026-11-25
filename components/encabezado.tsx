import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MenuNavegacion } from "@/components/navegacion/menu-navegacion";
import { IconoNotificaciones } from "@/components/notificaciones/icono-notificaciones";
import { getCurrentUser } from "@/lib/dal";
import { enlacesPara } from "@/lib/navegacion";

// Encabezado mínimo para usuarios con sesión. El layout raíz lo muestra solo
// si hay sesión, así /login queda sin él.
export async function Encabezado() {
  // El rol viene del backend (GET /auth/me); si la sesión ya no vale, no hay menú.
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-background dark:border-zinc-800">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {user && <MenuNavegacion enlaces={enlacesPara(user.rol)} />}
          <Link href="/" className="truncate font-semibold">
            SI Boilerplate
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <IconoNotificaciones />
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
