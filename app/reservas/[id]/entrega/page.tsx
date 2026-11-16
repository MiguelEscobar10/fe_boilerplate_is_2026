import type { Metadata } from "next";
import { PantallaEntrega } from "@/components/entregas/pantalla-entrega";

export const metadata: Metadata = { title: "Entrega de la reserva" };

// `?tipo=ESPACIO` cambia el texto a "Registrar inicio de uso". Lo pasa el
// panel de reservas (FE-04.1), que conoce el tipo del bien.
export default async function EntregaPage({
  params,
  searchParams,
}: PageProps<"/reservas/[id]/entrega">) {
  const { id } = await params;
  const { tipo } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Entrega de la reserva</h1>
      <PantallaEntrega reservaId={id} tipoBien={tipo === "ESPACIO" ? "ESPACIO" : "EQUIPO"} />
    </main>
  );
}
