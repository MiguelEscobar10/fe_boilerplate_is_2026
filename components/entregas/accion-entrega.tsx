"use client";

import { useEffect, useState } from "react";
import { obtenerEntrega, SesionExpiradaError } from "@/lib/entregas/cliente";
import { nombreAccion, type Entrega, type ReservaParaEntrega } from "@/lib/entregas/tipos";
import { DetalleEntrega } from "./detalle-entrega";
import { FormularioEntrega } from "./formulario-entrega";
import { fecha, mensajeGeneral } from "./mensajes";

type Props = {
  reserva: ReservaParaEntrega;
  /** Para pruebas: la hora actual. */
  ahora?: Date;
  /** La reserva cambió de estado (entregada o conflicto): el panel la vuelve a pedir. */
  onCambio?: () => void;
};

/**
 * Control de entrega para el panel de reservas del arrendador (FE-04.1).
 *
 * - CONFIRMADA antes del inicio: acción deshabilitada con la fecha desde la que se habilita.
 * - CONFIRMADA desde el inicio: el formulario.
 * - EN_CURSO o COMPLETADA: el detalle de la entrega.
 * - Cualquier otro estado: nada (reserva no elegible).
 */
export function AccionEntrega({ reserva, ahora, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [entregada, setEntregada] = useState(false);
  const accion = nombreAccion(reserva.tipoBien);

  const conEntrega =
    entregada || reserva.estado === "EN_CURSO" || reserva.estado === "COMPLETADA";
  if (conEntrega) return <DetalleCargado reservaId={reserva.id} />;
  if (reserva.estado !== "CONFIRMADA") return null;

  const habilitada = (ahora ?? new Date()) >= new Date(reserva.inicio);
  if (!habilitada) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {accion}
        </button>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Disponible desde el {fecha(reserva.inicio)}.
        </p>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        {accion}
      </button>
    );
  }

  return (
    <FormularioEntrega
      reservaId={reserva.id}
      tipoBien={reserva.tipoBien}
      onEntregada={() => {
        setEntregada(true);
        onCambio?.();
      }}
      onConflicto={onCambio}
    />
  );
}

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; entrega: Entrega | null };

/** Pide la entrega y muestra DetalleEntrega. */
export function DetalleCargado({ reservaId, aviso }: { reservaId: string; aviso?: string }) {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });

  useEffect(() => {
    let vigente = true;
    obtenerEntrega(reservaId)
      .then((entrega) => vigente && setCarga({ tipo: "listo", entrega }))
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        setCarga({ tipo: "error", mensaje: mensajeGeneral(e, "cargar la entrega") });
      });
    return () => {
      vigente = false;
    };
  }, [reservaId]);

  if (carga.tipo === "cargando") return <p role="status">Cargando la entrega...</p>;
  if (carga.tipo === "error") return <p role="alert">{carga.mensaje}</p>;
  if (!carga.entrega) return <p>La reserva todavía no tiene entrega.</p>;
  return (
    <div className="flex flex-col gap-2">
      {aviso && (
        <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
          {aviso}
        </p>
      )}
      <DetalleEntrega entrega={carga.entrega} />
    </div>
  );
}
