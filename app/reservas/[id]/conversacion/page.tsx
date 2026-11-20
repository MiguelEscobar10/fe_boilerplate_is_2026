import type { Metadata } from "next";
import { ConversacionReserva } from "@/components/mensajeria/conversacion-reserva";
import { RutaProtegida } from "@/components/ruta-protegida";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Conversación de la reserva" };

// Página propia mientras no exista el detalle de la reserva: cuando esté,
// ese detalle renderiza <ConversacionReserva /> y esta ruta puede quedar como
// enlace directo (por ejemplo desde el aviso de "Mensaje nuevo").
export default async function ConversacionPage({
  params,
}: PageProps<"/reservas/[id]/conversacion">) {
  const { id } = await params;
  return (
    <RutaProtegida roles={["ARRENDADOR", "ARRENDATARIO"]}>
      <Contenido reservaId={id} />
    </RutaProtegida>
  );
}

async function Contenido({ reservaId }: { reservaId: string }) {
  // RutaProtegida ya dejó pasar solo a ARRENDADOR o ARRENDATARIO.
  const usuario = await requireUser();
  const rol = usuario.rol === "ARRENDADOR" ? "ARRENDADOR" : "ARRENDATARIO";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Conversación de la reserva</h1>
      <ConversacionReserva
        reservaId={reservaId}
        usuarioId={usuario.id}
        rol={rol}
      />
    </main>
  );
}
