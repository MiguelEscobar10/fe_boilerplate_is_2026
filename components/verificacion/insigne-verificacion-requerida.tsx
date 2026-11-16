type Props = {
  /** `requiereVerificacion` de la publicación. */
  requiereVerificacion: boolean;
};

/**
 * Insignia del detalle de la publicación (H19). El nombre sigue el del
 * documento de historias (FE-19.1). No muestra nada si la publicación no
 * exige verificación.
 */
export function InsigneVerificacionRequerida({ requiereVerificacion }: Props) {
  if (!requiereVerificacion) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
        <path d="M8 1 2.5 3.2v4.2c0 3.4 2.3 6.4 5.5 7.6 3.2-1.2 5.5-4.2 5.5-7.6V3.2L8 1Zm-1 9.6L4.6 8.2l1-1L7 8.6l3.4-3.4 1 1L7 10.6Z" />
      </svg>
      Requiere verificación de identidad
    </span>
  );
}
