import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetallePublicacion } from "@/components/publicaciones/detalle-publicacion";
import { obtenerPublicacion } from "@/lib/publicaciones/api";

export const metadata: Metadata = {
  title: "Publicación",
};

export default async function PublicacionPage(props: PageProps<"/publicaciones/[id]">) {
  const { id } = await props.params;
  const { nueva } = await props.searchParams;
  const publicacion = await obtenerPublicacion(id);
  if (!publicacion) notFound();

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
        <Link href="/" className="mt-8 inline-block text-sm underline">
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
