import type { Metadata } from "next";
import { RutaProtegida } from "@/components/ruta-protegida";
import { PanelSolicitudes } from "@/components/solicitudes/panel-solicitudes";
import { ESTADOS, type EstadoReserva } from "@/lib/solicitudes/tipos";

export const metadata: Metadata = {
  title: "Mis solicitudes",
};

/** `?estado=PENDIENTE&page=2` de la URL, ignorando valores que no sirven. */
function leerFiltro(params: Record<string, string | string[] | undefined>) {
  const estado = typeof params.estado === "string" ? params.estado : undefined;
  const page = Number(typeof params.page === "string" ? params.page : 1);
  return {
    estado: ESTADOS.includes(estado as EstadoReserva) ? (estado as EstadoReserva) : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export default async function SolicitudesPage({
  searchParams,
}: PageProps<"/arrendador/solicitudes">) {
  const { estado, page } = leerFiltro(await searchParams);

  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      <div className="flex flex-1 justify-center px-4 py-8">
        <main className="w-full min-w-0 max-w-5xl">
          <h1 className="mb-1 text-2xl font-semibold">Mis solicitudes</h1>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            Solicitudes de reserva de tus publicaciones. Al aprobar una, sus fechas quedan
            ocupadas; las demás solicitudes que se cruzan siguen pendientes y solo se pueden
            rechazar.
          </p>
          <PanelSolicitudes estadoInicial={estado} paginaInicial={page} />
        </main>
      </div>
    </RutaProtegida>
  );
}
