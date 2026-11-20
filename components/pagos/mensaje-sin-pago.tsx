/** Reserva propia que todavía no tiene ningún intento de pago. */
export function MensajeSinPago() {
  return (
    <p
      data-testid="mensaje-sin-pago"
      className="rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      Aún no hay un pago registrado para esta reserva
    </p>
  );
}
