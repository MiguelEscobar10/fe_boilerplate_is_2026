import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarioDisponibilidad } from "@/components/disponibilidad/calendario-disponibilidad";
import { SelectorDisponibilidad } from "@/components/disponibilidad/selector-disponibilidad";
import { DetallePublicacion } from "@/components/publicaciones/detalle-publicacion";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion } from "@/lib/publicaciones/api";

export const metadata: Metadata = {
  title: "Publicación",
};

export default async function PublicacionPage(props: PageProps<"/publicaciones/[id]">) {
  const { id } = await props.params;
  const { nueva } = await props.searchParams;
  const [publicacion, usuario] = await Promise.all([obtenerPublicacion(id), getCurrentUser()]);
  if (!publicacion) notFound();
  const esDueno = usuario?.id === publicacion.arrendadorId;

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="w-full max-w-2xl">
        {nueva === "1" && (
          <p
            role="status"
            className="mb-6 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
          >
            Tu publicación quedó registrada y ya aparece en el catálogo.
          </p>
        )}
        <DetallePublicacion publicacion={publicacion} />
        <section aria-labelledby="titulo-disponibilidad" className="mt-8 flex max-w-sm flex-col gap-2">
          <h2 id="titulo-disponibilidad" className="text-lg font-semibold">
            Disponibilidad
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Los días con solicitudes pendientes se ven libres: una solicitud no aparta fechas
            hasta que el arrendador la aprueba.
          </p>
          {/* Quien puede reservar elige un período; el resto solo lo ve. */}
          {usuario?.rol === "ARRENDATARIO" ? (
            <SelectorDisponibilidad publicacionId={publicacion.id} />
          ) : (
            <CalendarioDisponibilidad publicacionId={publicacion.id} />
          )}
        </section>
        {esDueno && (
          <Link
            href={`/arrendador/publicaciones/${publicacion.id}/bloqueos`}
            className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Bloquear fechas
          </Link>
        )}
        <Link href="/" className="mt-8 inline-block text-sm underline">
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
