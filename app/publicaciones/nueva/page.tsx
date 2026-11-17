import type { Metadata } from "next";
import { RutaProtegida } from "@/components/ruta-protegida";
import { FormularioPublicacion } from "@/components/publicaciones/formulario-publicacion";

export const metadata: Metadata = {
  title: "Publicar un equipo o espacio",
};

export default function NuevaPublicacionPage() {
  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      <div className="flex flex-1 justify-center px-4 py-8">
        <main className="w-full max-w-lg">
          <h1 className="mb-1 text-2xl font-semibold">Publicar un equipo o espacio</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Completá los datos y agregá fotos para que los arrendatarios lo encuentren.
          </p>
          <FormularioPublicacion />
        </main>
      </div>
    </RutaProtegida>
  );
}
