import type { Metadata } from "next";
import Link from "next/link";
import { CalendarioDisponibilidad } from "@/components/disponibilidad/calendario-disponibilidad";
import { FormularioSolicitud } from "@/components/reservas/formulario-solicitud";
import { BotonPreguntarArrendador } from "@/components/mensajeria/boton-preguntar-arrendador";
import { DetallePublicacionCompleto } from "@/components/publicaciones/detalle-publicacion-completo";
import { InsigneVerificacionRequerida } from "@/components/verificacion/insigne-verificacion-requerida";
import { InterruptorRequiereVerificacion } from "@/components/verificacion/interruptor-requiere-verificacion";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion } from "@/lib/publicaciones/api";

export const metadata: Metadata = {
  title: "Publicación",
};

export default async function PublicacionPage(props: PageProps<"/publicaciones/[id]">) {
  const { id } = await props.params;
  const { nueva } = await props.searchParams;
  const [publicacion, usuario] = await Promise.all([obtenerPublicacion(id), getCurrentUser()]);
  // 404 PUBLICACION_NO_DISPONIBLE: desactivada o inexistente (H12).
  if (!publicacion) {
    return (
      <div className="flex flex-1 justify-center px-4 py-8">
        <main className="flex w-full max-w-2xl flex-col items-start gap-3">
          <h1 className="text-2xl font-semibold">Publicación no disponible</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Esta publicación fue desactivada o ya no existe.
          </p>
          <Link
            href="/publicaciones"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Volver al catálogo
          </Link>
        </main>
      </div>
    );
  }
  const esDueno = usuario?.id === publicacion.arrendadorId;
  // FE-15.1: solo un arrendatario que no es el dueño puede preguntar.
  const puedePreguntar = usuario?.rol === "ARRENDATARIO" && !esDueno;

  return (
    <div className="flex flex-1 justify-center px-4 py-8">
      <main className="w-full max-w-2xl">
        {nueva === "1" && (
          <p
            role="status"
            className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 p-3 text-sm"
          >
            Tu publicación quedó registrada y ya aparece en el catálogo.
          </p>
        )}
        <DetallePublicacionCompleto publicacion={publicacion} />
        {/* H19 (FE-19.1): se avisa antes de reservar, no al fallar la solicitud. */}
        {publicacion.requiereVerificacion && (
          <p className="mt-3">
            <InsigneVerificacionRequerida requiereVerificacion />
          </p>
        )}
        <section aria-labelledby="titulo-disponibilidad" className="mt-8 flex max-w-sm flex-col gap-2">
          <h2 id="titulo-disponibilidad" className="text-lg font-semibold">
            Disponibilidad
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Los días con solicitudes pendientes se ven libres: una solicitud no aparta fechas
            hasta que el arrendador la aprueba.
          </p>
          {/* Quien puede reservar elige un período y lo solicita; el resto solo lo ve. */}
          {usuario?.rol === "ARRENDATARIO" ? (
            <FormularioSolicitud
              publicacionId={publicacion.id}
              tarifaMonto={publicacion.tarifaMonto}
              tarifaUnidad={publicacion.tarifaUnidad}
              depositoMonto={publicacion.depositoMonto}
              condiciones={publicacion.condiciones}
            />
          ) : (
            <CalendarioDisponibilidad publicacionId={publicacion.id} />
          )}
        </section>
        {esDueno && (
          <section aria-labelledby="titulo-gestion" className="mt-8 flex flex-col items-start gap-4">
            <h2 id="titulo-gestion" className="text-lg font-semibold">
              Gestión de la publicación
            </h2>
            {/* H19 (FE-19.1): el dueño exige verificación de identidad para reservar. */}
            <InterruptorRequiereVerificacion
              publicacionId={publicacion.id}
              valorInicial={publicacion.requiereVerificacion ?? false}
            />
            <Link
              href={`/arrendador/publicaciones/${publicacion.id}/bloqueos`}
              className="inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Bloquear fechas
            </Link>
          </section>
        )}
        {puedePreguntar && usuario && (
          <BotonPreguntarArrendador publicacionId={publicacion.id} usuarioId={usuario.id} />
        )}
        <Link href="/publicaciones" className="mt-8 inline-block text-sm underline">
          Volver al catálogo
        </Link>
      </main>
    </div>
  );
}
