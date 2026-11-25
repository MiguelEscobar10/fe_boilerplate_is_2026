import type { Metadata } from "next";
import Link from "next/link";
import { EnlacesReserva } from "@/components/navegacion/enlaces-reserva";
import { notFound } from "next/navigation";
import { SeccionCalificacion } from "@/components/calificaciones/seccion-calificacion";
import { EstadoPago } from "@/components/pagos/estado-pago";
import { EstadoReserva } from "@/components/reservas/estado-reserva";
import { ResumenReserva } from "@/components/reservas/resumen-reserva";
import { RutaProtegida } from "@/components/ruta-protegida";
import { getCurrentUser } from "@/lib/dal";
import { obtenerReserva } from "@/lib/reservas/api";

export const metadata: Metadata = {
  title: "Reserva",
};

export default async function ReservaPage(props: PageProps<"/reservas/[id]">) {
  const { id } = await props.params;

  return (
    <RutaProtegida roles={["ARRENDATARIO", "ARRENDADOR"]}>
      <ContenidoReserva id={id} />
    </RutaProtegida>
  );
}

// Separado para leer la reserva solo después de comprobar el rol.
async function ContenidoReserva({ id }: { id: string }) {
  const [reserva, usuario] = await Promise.all([obtenerReserva(id), getCurrentUser()]);
  if (!reserva) notFound();
  const esArrendatario = usuario?.rol === "ARRENDATARIO";

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="flex w-full max-w-lg flex-col gap-5">
        <h1 className="text-2xl font-semibold">Reserva</h1>
        <p className="text-sm">
          <Link
            href={`/publicaciones/${encodeURIComponent(reserva.publicacion.id)}`}
            className="font-medium underline"
          >
            {reserva.publicacion.nombre}
          </Link>
        </p>
        <EstadoReserva estado={reserva.estado} numero={reserva.id} />
        {reserva.estado === "RECHAZADA" && reserva.motivoRechazo && (
          <p className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm">
            Motivo del rechazo: {reserva.motivoRechazo}
          </p>
        )}
        <ResumenReserva
          inicio={reserva.inicio}
          fin={reserva.fin}
          costo={reserva.costoAlquiler}
          deposito={reserva.depositoMonto}
        />
        <EnlacesReserva reservaId={reserva.id} estado={reserva.estado} />
        {esArrendatario && <EstadoPago reservaId={reserva.id} />}
        {esArrendatario && reserva.estado === "COMPLETADA" && (
          <SeccionCalificacion reservaId={reserva.id} nombreBien={reserva.publicacion.nombre} />
        )}
        {esArrendatario && reserva.estado === "CONFIRMADA" && (
          <Link
            href={`/reservas/${encodeURIComponent(reserva.id)}/pago`}
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Pagar reserva
          </Link>
        )}
      </main>
    </div>
  );
}
