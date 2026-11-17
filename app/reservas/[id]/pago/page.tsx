import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PantallaPago } from "@/components/pagos/pantalla-pago";
import { RutaProtegida } from "@/components/ruta-protegida";
import { obtenerResumenReserva } from "@/lib/pagos/reserva";

export const metadata: Metadata = {
  title: "Pagar reserva",
};

export default async function PagoReservaPage(props: PageProps<"/reservas/[id]/pago">) {
  const { id } = await props.params;

  return (
    <RutaProtegida roles={["ARRENDATARIO"]}>
      <ContenidoPago id={id} />
    </RutaProtegida>
  );
}

// Separado para leer la reserva solo después de comprobar el rol.
async function ContenidoPago({ id }: { id: string }) {
  const reserva = await obtenerResumenReserva(id);
  if (!reserva) notFound();

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="w-full max-w-lg">
        <h1 className="mb-1 text-2xl font-semibold">Pagar reserva</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Revisa el cobro y paga con una tarjeta de prueba.
        </p>
        <PantallaPago
          reservaId={reserva.id}
          alquiler={reserva.alquiler}
          deposito={reserva.deposito}
        />
      </main>
    </div>
  );
}
