import { logout } from "@/app/actions/auth";
import { IconoNotificaciones } from "@/components/notificaciones/icono-notificaciones";

// Encabezado mínimo para usuarios con sesión. El layout raíz lo muestra solo
// si hay sesión, así /login queda sin él.
export function Encabezado() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-background dark:border-zinc-800">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <span className="truncate font-semibold">SI Boilerplate</span>
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
