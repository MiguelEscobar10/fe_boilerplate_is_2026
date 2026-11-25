"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatearDia, formatearHora } from "@/lib/solicitudes/formato";
import { formatearMonto } from "@/lib/pagos/montos";
import type { UltimoPago } from "@/lib/pagos/tipos";
import { consultarUltimoPago } from "@/lib/pagos/ultimo";
import { MensajeSinPago } from "./mensaje-sin-pago";

type Vista =
  | { tipo: "cargando" }
  | { tipo: "pago"; pago: UltimoPago }
  | { tipo: "sin_registro" }
  | { tipo: "no_disponible" }
  | { tipo: "error" };

function formatearFecha(iso: string) {
  if (Number.isNaN(new Date(iso).getTime())) return iso;
  return `${formatearDia(iso)}, ${formatearHora(iso)}`;
}

const ESTILO = {
  APROBADO: "border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
  RECHAZADO: "border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
  PENDIENTE: "border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
} as const;

const NOMBRE = { APROBADO: "Aprobado", RECHAZADO: "Rechazado", PENDIENTE: "En proceso" } as const;

/**
 * Estado del último pago de la reserva (H06). Consulta al abrirse y vuelve a
 * consultar con "Actualizar estado", sin recargar la página.
 */
export function EstadoPago({ reservaId }: { reservaId: string }) {
  const [vista, setVista] = useState<Vista>({ tipo: "cargando" });
  // Solo cuenta la respuesta de la última consulta (dos clics seguidos).
  const ultimaConsulta = useRef(0);

  const consultar = useCallback(async () => {
    const numero = ++ultimaConsulta.current;
    setVista({ tipo: "cargando" });
    const resultado = await consultarUltimoPago(reservaId);
    if (numero !== ultimaConsulta.current) return;
    switch (resultado.tipo) {
      case "pago":
        setVista({ tipo: "pago", pago: resultado.pago });
        break;
      case "sin-registro":
        setVista({ tipo: "sin_registro" });
        break;
      case "no-disponible":
        setVista({ tipo: "no_disponible" });
        break;
      case "error":
        setVista({ tipo: "error" });
        break;
      // sesion-expirada: irALogin() ya redirigió.
    }
  }, [reservaId]);

  useEffect(() => {
    // La consulta inicial al montar: el estado solo cambia al responder.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el servidor
    void consultar();
  }, [consultar]);

  const cargando = vista.tipo === "cargando";

  return (
    <section aria-labelledby="titulo-pago" className="flex flex-col gap-3">
      <h2 id="titulo-pago" className="text-lg font-semibold">
        Pago
      </h2>

      {vista.tipo === "cargando" && (
        <p role="status" data-testid="pago-cargando" className="text-sm text-zinc-600 dark:text-zinc-400">
          Consultando el pago…
        </p>
      )}

      {vista.tipo === "pago" && <DetallePago pago={vista.pago} />}
      {vista.tipo === "sin_registro" && <MensajeSinPago />}
      {vista.tipo === "no_disponible" && (
        <p role="alert" data-testid="reserva-no-disponible" className="text-sm">
          Reserva no disponible
        </p>
      )}
      {vista.tipo === "error" && (
        <p
          role="alert"
          data-testid="error-pago"
          className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm"
        >
          No se pudo consultar el estado del pago. Intenta de nuevo.
        </p>
      )}

      <button
        type="button"
        onClick={() => void consultar()}
        disabled={cargando}
        className="self-start rounded-md border border-zinc-400 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        Actualizar estado
      </button>
    </section>
  );
}

function DetallePago({ pago }: { pago: UltimoPago }) {
  return (
    <div
      data-testid="detalle-pago"
      className={`rounded-lg border p-4 text-sm ${ESTILO[pago.estado]}`}
    >
      <p className="mb-2 text-base font-semibold" data-testid="estado-pago">
        {NOMBRE[pago.estado]}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt>Reserva</dt>
        <dd className="break-all font-mono text-xs" data-testid="pago-reserva">
          {pago.reservaId}
        </dd>
        <dt>Importe</dt>
        <dd className="tabular-nums" data-testid="pago-importe">
          ${formatearMonto(pago.montoTotal)}
        </dd>
        <dt>Fecha</dt>
        <dd data-testid="pago-fecha">{formatearFecha(pago.fechaRegistro)}</dd>
        {pago.estado === "RECHAZADO" && pago.motivo && (
          <>
            <dt>Motivo</dt>
            <dd data-testid="pago-motivo">{pago.motivo}</dd>
          </>
        )}
      </dl>
      <p className="mt-2 text-xs">Pago simulado: no se realizó ningún cargo real.</p>
    </div>
  );
}
