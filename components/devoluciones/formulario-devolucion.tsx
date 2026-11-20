"use client";

import { useState, type FormEvent } from "react";
import { ErrorDeApi, SesionExpiradaError, registrarDevolucion } from "@/lib/devoluciones/cliente";
import { LARGO_MAXIMO_DANOS, type EstadoFinal } from "@/lib/devoluciones/tipos";
import { mensajeGeneral } from "@/components/entregas/mensajes";

const CLASE_CAMPO =
  "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";

/** Ahora en El Salvador (UTC-6, sin horario de verano), como `AAAA-MM-DDTHH:mm`. */
export function ahoraLocal(ahora = new Date()) {
  return new Date(ahora.getTime() - 6 * 3_600_000).toISOString().slice(0, 16);
}

type Props = {
  reservaId: string;
  /** La devolución quedó registrada. */
  onRegistrada: () => void;
  /** 409: el estado de la reserva cambió; conviene volver a consultarla. */
  onConflicto: () => void;
};

/**
 * Primer paso de H09: fecha y hora real, estado final y, si hay
 * observaciones, los daños o faltantes. No cierra la reserva.
 */
export function FormularioDevolucion({ reservaId, onRegistrada, onConflicto }: Props) {
  const [fecha, setFecha] = useState(() => ahoraLocal());
  const [estadoFinal, setEstadoFinal] = useState<EstadoFinal>("SIN_OBSERVACIONES");
  const [danos, setDanos] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const conObservaciones = estadoFinal === "CON_OBSERVACIONES";

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (!fecha) return setError("Indica la fecha y la hora de la devolución.");
    if (conObservaciones && !danos.trim()) {
      return setError("Describe los daños o faltantes.");
    }

    setEnviando(true);
    setError(null);
    try {
      await registrarDevolucion(reservaId, {
        // La hora del campo es de El Salvador.
        fechaReal: `${fecha}:00-06:00`,
        estadoFinal,
        ...(conObservaciones ? { danos: danos.trim() } : {}),
      });
      onRegistrada();
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setEnviando(false);
      if (e instanceof ErrorDeApi && [400, 403, 404, 409].includes(e.status)) {
        setError(e.detalle ?? "No se pudo registrar la devolución.");
        if (e.status === 409) onConflicto();
      } else {
        setError(mensajeGeneral(e, "registrar la devolución"));
      }
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-label="Registrar devolución" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="devolucion-fecha" className="text-sm font-medium">
          Fecha y hora real de la devolución
        </label>
        <input
          id="devolucion-fecha"
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={CLASE_CAMPO}
        />
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Hora de El Salvador.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Estado final del bien</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="estadoFinal"
            checked={!conObservaciones}
            onChange={() => setEstadoFinal("SIN_OBSERVACIONES")}
          />
          Sin observaciones
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="estadoFinal"
            checked={conObservaciones}
            onChange={() => setEstadoFinal("CON_OBSERVACIONES")}
          />
          Con observaciones (daños o faltantes)
        </label>
      </fieldset>

      {conObservaciones && (
        <div className="flex flex-col gap-1">
          <label htmlFor="devolucion-danos" className="text-sm font-medium">
            Daños o faltantes
          </label>
          <textarea
            id="devolucion-danos"
            value={danos}
            maxLength={LARGO_MAXIMO_DANOS}
            rows={3}
            onChange={(e) => setDanos(e.target.value)}
            className={CLASE_CAMPO}
          />
          <p className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
            {danos.length}/{LARGO_MAXIMO_DANOS}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-60"
        >
          {enviando ? "Registrando..." : "Registrar devolución"}
        </button>
      </div>
    </form>
  );
}
