import type { Publicacion } from "@/lib/publicaciones/api";
import { TIPOS } from "@/lib/publicaciones/reglas";
import { BloqueCondiciones } from "./bloque-condiciones";
import { BloqueTarifaDeposito } from "./bloque-tarifa-deposito";
import { GaleriaFotos } from "./galeria-fotos";
import { PromedioCalificacion } from "./promedio-calificacion";

/**
 * Detalle completo de una publicación (H12): fotos, descripción, ubicación,
 * tarifa con su unidad, depósito, condiciones y promedios de calificaciones.
 */
export function DetallePublicacionCompleto({ publicacion: p }: { publicacion: Publicacion }) {
  const tipo = TIPOS.find((t) => t.valor === p.tipo)?.etiqueta ?? p.tipo;

  return (
    <article className="flex flex-col gap-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">{tipo}</p>
        <h1 className="text-2xl font-semibold">{p.nombre}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{p.ubicacion}</p>
      </header>

      <GaleriaFotos publicacionId={p.id} nombre={p.nombre} imagenes={p.imagenes} />

      <PromedioCalificacion
        promedioBien={p.promedioBien}
        promedioArrendador={p.promedioArrendador}
        total={p.totalCalificaciones}
      />

      <section aria-label="Descripción" className="text-sm">
        <h2 className="mb-1 text-lg font-semibold">Descripción</h2>
        {p.descripcion ? (
          <p className="whitespace-pre-line">{p.descripcion}</p>
        ) : (
          <p className="text-zinc-600 dark:text-zinc-400">Sin descripción.</p>
        )}
      </section>

      <BloqueTarifaDeposito
        tarifaMonto={p.tarifaMonto}
        tarifaUnidad={p.tarifaUnidad}
        depositoMonto={p.depositoMonto}
      />

      <BloqueCondiciones condiciones={p.condiciones} depositoMonto={p.depositoMonto} />
    </article>
  );
}
