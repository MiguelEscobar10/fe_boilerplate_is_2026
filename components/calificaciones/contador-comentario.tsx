import { COMENTARIO_MAX } from "@/lib/calificaciones/tipos";

/** `0/500`, en rojo si se pasa. */
export function ContadorComentario({ largo, id }: { largo: number; id?: string }) {
  const excedido = largo > COMENTARIO_MAX;
  return (
    <p
      id={id}
      className={`text-right text-xs tabular-nums ${
        excedido ? "text-red-600" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      {largo}/{COMENTARIO_MAX}
    </p>
  );
}
