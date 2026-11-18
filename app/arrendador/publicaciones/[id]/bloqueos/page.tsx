import type { Metadata } from "next";
import Link from "next/link";
import { BloqueoFechas } from "@/components/bloqueos/bloqueo-fechas";
import { RutaProtegida } from "@/components/ruta-protegida";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion } from "@/lib/publicaciones/api";

export const metadata: Metadata = {
  title: "Bloquear fechas",
};

function NoEncontrada() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <main className="max-w-sm text-center">
        <h1 className="mb-2 text-2xl font-semibold">Publicación no encontrada</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No existe, está desactivada o no es tuya.
        </p>
      </main>
    </div>
  );
}

export default async function BloqueosPage(
  props: PageProps<"/arrendador/publicaciones/[id]/bloqueos">,
) {
  const { id } = await props.params;

  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      <Contenido id={id} />
    </RutaProtegida>
  );
}

async function Contenido({ id }: { id: string }) {
  const [publicacion, usuario] = await Promise.all([obtenerPublicacion(id), getCurrentUser()]);
  // H14, criterio 5: un bien ajeno se ve como "Publicación no encontrada".
  // El backend lo vuelve a revisar al bloquear (403).
  if (!publicacion || publicacion.arrendadorId !== usuario?.id) return <NoEncontrada />;

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="w-full min-w-0 max-w-5xl">
        <p className="mb-1 text-sm">
          <Link href={`/publicaciones/${publicacion.id}`} className="underline">
            {publicacion.nombre}
          </Link>
        </p>
        <h1 className="mb-1 text-2xl font-semibold">Bloquear fechas</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Marca los días en que tu bien no está disponible: nadie podrá solicitarlos. No se
          puede bloquear un rango que tenga una reserva confirmada o en curso.
        </p>
        <BloqueoFechas publicacionId={publicacion.id} />
      </main>
    </div>
  );
}
