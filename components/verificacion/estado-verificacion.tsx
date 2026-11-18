import type { EstadoVerificacion as Estado, Verificacion } from "@/lib/verificacion/tipos";
import { fecha } from "./mensajes";

const TEXTO: Record<Estado, { titulo: string; detalle: string; clase: string }> = {
  PENDIENTE: {
    titulo: "En revisión",
    detalle: "Recibimos tu documento. Te avisaremos cuando el revisor lo revise.",
    clase: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  },
  APROBADA: {
    titulo: "Identidad verificada",
    detalle: "Ya puedes solicitar publicaciones que exigen verificación.",
    clase: "border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100",
  },
  RECHAZADA: {
    titulo: "Verificación rechazada",
    detalle: "Puedes enviar un documento nuevo.",
    clase: "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100",
  },
};

type Props = {
  /** null = todavía no envió ninguna solicitud. */
  verificacion: Verificacion | null;
};

/** Estado de la última solicitud propia (H07). Nunca muestra el documento. */
export function EstadoVerificacion({ verificacion }: Props) {
  if (!verificacion) {
    return (
      <section aria-label="Estado de la verificación" className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="font-medium">Todavía no has verificado tu identidad.</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Algunas publicaciones solo aceptan arrendatarios verificados.
        </p>
      </section>
    );
  }

  const texto = TEXTO[verificacion.estado];
  return (
    <section aria-label="Estado de la verificación" className={`rounded-lg border p-4 ${texto.clase}`}>
      <p className="font-medium">
        {texto.titulo} <span className="sr-only">({verificacion.estado})</span>
      </p>
      <p className="mt-1 text-sm">{texto.detalle}</p>
      {verificacion.estado === "RECHAZADA" && verificacion.motivoRechazo && (
        <p className="mt-2 text-sm">
          <span className="font-medium">Motivo:</span> {verificacion.motivoRechazo}
        </p>
      )}
      <p className="mt-2 text-xs opacity-80">
        Enviada el {fecha(verificacion.enviadaAt)}
        {verificacion.revisadaAt && ` · Revisada el ${fecha(verificacion.revisadaAt)}`}
      </p>
    </section>
  );
}
