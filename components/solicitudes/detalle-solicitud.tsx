"use client";

import { useEffect, useRef, useState } from "react";
import {
  DecisionRechazadaError,
  ErrorDeRed,
  SesionExpiradaError,
  decidirSolicitud,
} from "@/lib/solicitudes/cliente";
import {
  formatearDia,
  formatearHora,
  formatearMonto,
  formatearPeriodo,
} from "@/lib/solicitudes/formato";
import type { Decision, DecisionGuardada, Solicitud } from "@/lib/solicitudes/tipos";
import { ConfirmacionDecision } from "./confirmacion-decision";
import { EstadoReservaBadge } from "./estado-reserva";

/** FE-04.1: el texto que se muestra ante cualquier 409. */
export const MENSAJE_CONFLICTO =
  "La solicitud ya fue atendida o el período dejó de estar disponible.";

type Error = {
  /** Lo principal, en el idioma de la pantalla. */
  mensaje: string;
  /** El detalle que mandó el backend, si aporta algo (p. ej. el del 409). */
  detalle?: string;
};

function errorDeDecision(e: unknown): Error {
  if (e instanceof DecisionRechazadaError) {
    if (e.status === 409) {
      return { mensaje: MENSAJE_CONFLICTO, detalle: e.message || undefined };
    }
    if (e.status === 403) return { mensaje: "Esta solicitud no se puede modificar." };
    if (e.status === 404) return { mensaje: "Esta solicitud ya no existe." };
    if (e.status === 400 && e.message) return { mensaje: e.message };
  }
  if (e instanceof ErrorDeRed) {
    return { mensaje: "No se pudo enviar la decisión. Revisa tu conexión." };
  }
  return { mensaje: "No se pudo enviar la decisión. Inténtalo de nuevo." };
}

function fechaYHora(iso: string) {
  return `${formatearDia(iso)}, ${formatearHora(iso)}`;
}

type Props = {
  solicitud: Solicitud;
  /** La decisión con la que se abrió desde la tabla (ya en confirmar). */
  decisionInicial?: Decision;
  /** 200: el panel actualiza la fila con lo que devolvió el backend. */
  onDecidida: (resultado: DecisionGuardada) => void;
  /** 409 o 404: lo que se ve ya no es el estado real; el panel recarga. */
  onDesactualizada: () => void;
  onCerrar: () => void;
};

/**
 * Detalle de una solicitud con la decisión (H04). La decisión pasa por un paso
 * de confirmación; mientras se envía no se puede volver a pulsar, así no se
 * duplica.
 */
export function DetalleSolicitud({
  solicitud,
  decisionInicial,
  onDecidida,
  onDesactualizada,
  onCerrar,
}: Props) {
  const [decision, setDecision] = useState<Decision | null>(
    solicitud.estado === "PENDIENTE" ? (decisionInicial ?? null) : null,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  // El estado de React se actualiza después del render: este ref corta un
  // segundo clic que llegue antes.
  const enviandoRef = useRef(false);
  const pendiente = solicitud.estado === "PENDIENTE";
  const seccionRef = useRef<HTMLElement>(null);

  // En el teléfono el detalle queda debajo de la tabla: se lleva a la vista al
  // abrirlo. `?.` porque jsdom no implementa scrollIntoView.
  useEffect(() => {
    seccionRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, []);

  async function confirmar(motivo?: string) {
    if (!decision || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await decidirSolicitud(solicitud.id, decision, motivo);
      setDecision(null);
      setExito(
        resultado.estado === "CONFIRMADA"
          ? "Solicitud aprobada. Avisamos al arrendatario."
          : "Solicitud rechazada. Avisamos al arrendatario.",
      );
      onDecidida(resultado);
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setError(errorDeDecision(e));
      setDecision(null);
      if (
        e instanceof DecisionRechazadaError &&
        (e.status === 409 || e.status === 404)
      ) {
        onDesactualizada();
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  const filas: [string, React.ReactNode][] = [
    ["Arrendatario", solicitud.arrendatario.nombre],
    ["Bien", solicitud.publicacion.nombre],
    ["Período", formatearPeriodo(solicitud.inicio, solicitud.fin)],
    ["Costo estimado", formatearMonto(solicitud.costoEstimado)],
    ["Depósito", formatearMonto(solicitud.depositoMonto)],
    ["Estado", <EstadoReservaBadge key="estado" estado={solicitud.estado} />],
    ["Solicitada", fechaYHora(solicitud.creadaAt)],
  ];
  if (solicitud.decididaAt) filas.push(["Decidida", fechaYHora(solicitud.decididaAt)]);
  if (solicitud.motivoRechazo) filas.push(["Motivo de rechazo", solicitud.motivoRechazo]);

  return (
    <section
      ref={seccionRef}
      aria-labelledby={`detalle-${solicitud.id}`}
      className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id={`detalle-${solicitud.id}`} className="text-lg font-semibold">
          Solicitud de {solicitud.arrendatario.nombre}
        </h2>
        <button
          type="button"
          onClick={onCerrar}
          disabled={enviando}
          className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Cerrar
        </button>
      </div>

      <dl className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="grid grid-cols-[9rem_1fr] gap-2 py-2">
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">{etiqueta}</dt>
            <dd className="min-w-0 break-words">{valor}</dd>
          </div>
        ))}
      </dl>

      {exito && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          {exito}
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <p>{error.mensaje}</p>
          {error.detalle && <p className="mt-1 text-xs">{error.detalle}</p>}
        </div>
      )}

      {pendiente &&
        (decision ? (
          <ConfirmacionDecision
            key={decision}
            decision={decision}
            enviando={enviando}
            onConfirmar={confirmar}
            onCancelar={() => setDecision(null)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setDecision("APROBAR");
              }}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setDecision("RECHAZAR");
              }}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Rechazar
            </button>
          </div>
        ))}
    </section>
  );
}
