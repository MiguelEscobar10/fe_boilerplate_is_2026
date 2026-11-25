import Link from "next/link";

type Props = {
  /** `message` del 422 VERIFICACION_REQUERIDA, tal cual lo manda el backend. */
  mensaje: string;
};

/**
 * Aviso para el formulario de solicitud de reserva (FE-03.1) cuando el
 * backend responde 422 VERIFICACION_REQUERIDA: el motivo y el enlace a la
 * pantalla de verificación de identidad (FE-07.1).
 *
 *   if (esVerificacionRequerida(res.status, cuerpo)) {
 *     return <AvisoVerificacionRequerida mensaje={cuerpo.message} />;
 *   }
 */
export function AvisoVerificacionRequerida({ mensaje }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <p className="font-medium">No puedes solicitar esta publicación todavía</p>
      <p>{mensaje}</p>
      <Link href="/verificacion" className="self-start font-medium underline">
        Verificar mi identidad
      </Link>
    </div>
  );
}
