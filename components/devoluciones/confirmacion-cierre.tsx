import { dinero } from "@/lib/devoluciones/tipos";

type Props = {
  retenido: number;
  liberado: number;
  procesando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Último paso de H09: confirmar los importes antes de cerrar la reserva. */
export function ConfirmacionCierre({
  retenido,
  liberado,
  procesando,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Confirmar el cierre"
      className="flex flex-col gap-3 rounded-md border border-zinc-300 p-3 dark:border-zinc-700"
    >
      <p className="text-sm font-medium">¿Resolver el depósito y cerrar la reserva?</p>
      <p className="text-sm">
        Se liberan {dinero(liberado)} y se retienen {dinero(retenido)}. La reserva pasa a
        COMPLETADA y no se puede deshacer.
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Importes simulados: no se hace ninguna devolución bancaria real.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirmar}
          disabled={procesando}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {procesando ? "Procesando..." : "Confirmar y cerrar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={procesando}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-60 dark:border-zinc-700"
        >
          Volver
        </button>
      </div>
    </div>
  );
}
