import type { Metadata } from "next";
import { ListadoCatalogo } from "@/components/catalogo/listado-catalogo";
import { leerFiltros } from "@/lib/catalogo/filtros";
import { BUSCAR_MAX } from "@/lib/catalogo/tipos";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Catálogo",
};

/** `?buscar=taladro&tipo=EQUIPO&page=2` de la URL, ignorando valores que no sirven. */
function leerConsulta(params: Record<string, string | string[] | undefined>) {
  const buscar = typeof params.buscar === "string" ? params.buscar.trim() : "";
  const page = Number(typeof params.page === "string" ? params.page : 1);
  return {
    buscar: buscar.slice(0, BUSCAR_MAX),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    filtros: leerFiltros(params),
  };
}

export default async function CatalogoPage({ searchParams }: PageProps<"/publicaciones">) {
  await requireUser();
  const { buscar, page, filtros } = leerConsulta(await searchParams);

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="w-full min-w-0 max-w-5xl">
        <h1 className="mb-1 text-2xl font-semibold">Catálogo</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Equipos y espacios disponibles para alquilar. Busca por nombre o descripción y
          filtra por tipo, ubicación, precio y fechas.
        </p>
        <ListadoCatalogo buscarInicial={buscar} paginaInicial={page} filtrosIniciales={filtros} />
      </main>
    </div>
  );
}
