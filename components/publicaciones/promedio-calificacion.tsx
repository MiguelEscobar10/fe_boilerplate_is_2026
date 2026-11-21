type Props = {
  promedioBien?: number | null;
  promedioArrendador?: number | null;
  /** Calificaciones de esta publicación. */
  total?: number;
};

const sobreCinco = (promedio: number) => `${promedio.toFixed(1)} de 5`;

/**
 * Promedio del bien y del arrendador (H12, H17), o "Sin calificaciones". El
 * arrendador puede tener promedio por otras publicaciones aunque esta no
 * tenga calificaciones todavía.
 */
export function PromedioCalificacion({ promedioBien, promedioArrendador, total = 0 }: Props) {
  const hayBien = typeof promedioBien === "number";
  const hayArrendador = typeof promedioArrendador === "number";

  if (!hayBien && !hayArrendador) {
    return (
      <p aria-label="Calificaciones" className="text-sm text-zinc-600 dark:text-zinc-400">
        Sin calificaciones
      </p>
    );
  }

  return (
    <dl aria-label="Calificaciones" className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
      <dt className="text-zinc-500">Calificación del bien</dt>
      <dd>
        {hayBien ? (
          <>
            <span className="font-medium">★ {sobreCinco(promedioBien)}</span>{" "}
            <span className="text-zinc-600 dark:text-zinc-400">
              ({total === 1 ? "1 calificación" : `${total} calificaciones`})
            </span>
          </>
        ) : (
          "Sin calificaciones"
        )}
      </dd>
      <dt className="text-zinc-500">Calificación del arrendador</dt>
      <dd>
        {hayArrendador ? (
          <span className="font-medium">★ {sobreCinco(promedioArrendador)}</span>
        ) : (
          "Sin calificaciones"
        )}
      </dd>
    </dl>
  );
}
