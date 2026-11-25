"use client";

import { useEffect, useState } from "react";
import { ErrorDeApi, SesionExpiradaError, obtenerEntrega } from "@/lib/entregas/cliente";
import type { Entrega, TipoBien } from "@/lib/entregas/tipos";
import { DetalleEntrega } from "./detalle-entrega";
import { FormularioEntrega } from "./formulario-entrega";
import { mensajeGeneral } from "./mensajes";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "sin-entrega" }
  | { tipo: "con-entrega"; entrega: Entrega; aviso?: string };

/**
 * Pantalla /reservas/{id}/entrega mientras no exista el panel de reservas
 * (FE-04.1): si la reserva ya tiene entrega muestra el detalle; si no, el
 * formulario. Que la reserva sea del arrendador, esté CONFIRMADA y haya
 * llegado su inicio lo decide el backend (403, 409 y 422 en el formulario).
 */
export function PantallaEntrega({
  reservaId,
  tipoBien = "EQUIPO",
}: {
  reservaId: string;
  tipoBien?: TipoBien;
}) {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<string | undefined>();

  useEffect(() => {
    let vigente = true;
    obtenerEntrega(reservaId)
      .then((entrega) => {
        if (!vigente) return;
        setCarga(entrega ? { tipo: "con-entrega", entrega } : { tipo: "sin-entrega" });
      })
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        setCarga({
          tipo: "error",
          mensaje:
            e instanceof ErrorDeApi && e.status === 400
              ? "La dirección de la reserva no es válida."
              : mensajeGeneral(e, "consultar la reserva"),
        });
      });
    return () => {
      vigente = false;
    };
  }, [reservaId, recarga]);

  if (carga.tipo === "cargando") return <p role="status">Cargando...</p>;
  if (carga.tipo === "error") return <p role="alert">{carga.mensaje}</p>;
  if (carga.tipo === "con-entrega") {
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
  return (
    <FormularioEntrega
      reservaId={reservaId}
      tipoBien={tipoBien}
      onEntregada={() => {
        setAviso("Entrega registrada. La reserva pasó a EN_CURSO.");
        setCarga({ tipo: "cargando" });
        setRecarga((n) => n + 1);
      }}
      onConflicto={() => setRecarga((n) => n + 1)}
    />
  );
}
