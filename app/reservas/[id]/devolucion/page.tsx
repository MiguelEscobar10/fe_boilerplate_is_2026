import type { Metadata } from "next";
import { PantallaDevolucion } from "@/components/devoluciones/pantalla-devolucion";
import { RutaProtegida } from "@/components/ruta-protegida";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Devolución y garantía" };

export default async function DevolucionPage({
  params,
}: PageProps<"/reservas/[id]/devolucion">) {
  const { id } = await params;
  const user = await requireUser();
  return (
    <RutaProtegida roles={["ARRENDADOR", "ARRENDATARIO"]}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold">Devolución y garantía</h1>
        <PantallaDevolucion reservaId={id} esArrendador={user.rol === "ARRENDADOR"} />
      </main>
    </RutaProtegida>
  );
}
