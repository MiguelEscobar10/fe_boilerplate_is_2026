// Fechas y montos del panel de solicitudes. El backend responde en UTC; la
// pantalla muestra la hora de El Salvador, que es donde está el bien.

const ZONA_HORARIA = "America/El_Salvador";

const DIA = new Intl.DateTimeFormat("es-SV", {
  timeZone: ZONA_HORARIA,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const HORA = new Intl.DateTimeFormat("es-SV", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** `12 nov 2026` (sin el punto que algunos navegadores agregan al mes). */
export function formatearDia(iso: string) {
  return DIA.format(new Date(iso)).replace(".", "");
}

export function formatearHora(iso: string) {
  return HORA.format(new Date(iso));
}

/**
 * Período de una reserva: `12 nov 2026, 09:00 – 12:00` si empieza y termina
 * el mismo día, y `20 nov 2026, 00:00 – 21 nov 2026, 00:00` si no.
 */
export function formatearPeriodo(inicio: string, fin: string) {
  const diaInicio = formatearDia(inicio);
  const diaFin = formatearDia(fin);
  return diaInicio === diaFin
    ? `${diaInicio}, ${formatearHora(inicio)} – ${formatearHora(fin)}`
    : `${diaInicio}, ${formatearHora(inicio)} – ${diaFin}, ${formatearHora(fin)}`;
}

/** `"45.00"` → `$45.00`. */
export function formatearMonto(monto: string) {
  return `$${monto}`;
}
