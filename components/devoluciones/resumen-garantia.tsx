"use client";

import { useState } from "react";
import { ErrorDeApi, SesionExpiradaError, resolverDeposito } from "@/lib/devoluciones/cliente";
import {
  DEVOLUCION_NO_REGISTRADA,
  LARGO_MAXIMO_MOTIVO,
  calcularResolucion,
  dinero,
  type EstadoFinal,
  type Garantia,
} from "@/lib/devoluciones/tipos";
import { mensajeGeneral } from "@/components/entregas/mensajes";
import { ConfirmacionCierre } from "./confirmacion-cierre";

const CLASE_CAMPO =
  "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm dark:border-zinc-700";

const NOTA_SIMULADO = "Importes simulados: no son devoluciones bancarias reales.";

function Importes({
  original,
  retenido,
  liberado,
  estado,
}: {
  original: number;
  retenido: number | null;
  liberado: number | null;
  estado: string;
}) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
      <dt className="text-zinc-500">Depósito original</dt>
      <dd className="tabular-nums">{dinero(original)}</dd>
      <dt className="text-zinc-500">Monto retenido</dt>
      <dd className="tabular-nums">{retenido === null ? "—" : dinero(retenido)}</dd>
      <dt className="text-zinc-500">Monto liberado</dt>
      <dd className="tabular-nums">{liberado === null ? "—" : dinero(liberado)}</dd>
      <dt className="text-zinc-500">Estado de la garantía</dt>
      <dd className="font-medium">{estado}</dd>
    </dl>
  );
}

type Props = {
  reservaId: string;
  garantia: Garantia;
  /** Estado final de la devolución: sin observaciones no se puede retener. */
  estadoFinal: EstadoFinal;
  /** Solo el arrendador resuelve; el arrendatario ve el resumen. */
  puedeResolver: boolean;
  /** 200: la garantía quedó resuelta y la reserva COMPLETADA. */
  onResuelta: (garantia: Garantia) => void;
  /** 409, o 422 sin devolución: el estado cambió y hay que volver a consultar. */
  onDesactualizada: (mensaje: string) => void;
};

/**
 * Segundo paso de H09: depósito original, retenido y liberado, y el estado de
 * la garantía. Mientras está PENDIENTE el arrendador indica cuánto retiene y
 * ve el liberado calculado antes de confirmar el cierre.
 */
export function ResumenGarantia({
  reservaId,
  garantia,
  estadoFinal,
  puedeResolver,
  onResuelta,
  onDesactualizada,
}: Props) {
  const [monto, setMonto] = useState("0");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const resuelta = garantia.estadoGarantia !== "PENDIENTE";
  const sinObservaciones = estadoFinal === "SIN_OBSERVACIONES";
  const calculo = calcularResolucion(garantia.depositoOriginal, monto);
  const valido = !("error" in calculo);

  if (resuelta || !puedeResolver) {
    return (
      <section aria-label="Resumen de la garantía" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Depósito de garantía</h2>
        <Importes
          original={garantia.depositoOriginal}
          retenido={garantia.montoRetenido}
          liberado={garantia.montoLiberado}
          estado={garantia.estadoGarantia}
        />
        {garantia.motivo && (
          <p className="text-sm">
            <span className="text-zinc-500">Motivo de la retención: </span>
            {garantia.motivo}
          </p>
        )}
        {!resuelta && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            El arrendador todavía no ha resuelto el depósito.
          </p>
        )}
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{NOTA_SIMULADO}</p>
      </section>
    );
  }

  function revisar() {
    if (!valido) return setError(calculo.error);
    if (calculo.retenido > 0 && !motivo.trim()) {
      return setError("Escribe el motivo de la retención.");
    }
    setError(null);
    setConfirmando(true);
  }

  async function confirmar() {
    if (!valido || procesando) return;
    setProcesando(true);
    setError(null);
    try {
      const resultado = await resolverDeposito(reservaId, {
        montoRetenido: calculo.retenido,
        ...(calculo.retenido > 0 ? { motivo: motivo.trim() } : {}),
      });
      onResuelta(resultado);
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      // La reserva no se muestra cerrada: se vuelve al formulario con el error.
      setProcesando(false);
      setConfirmando(false);
      if (e instanceof ErrorDeApi && [400, 403, 404, 409, 422].includes(e.status)) {
        const mensaje = e.detalle ?? "No se pudo resolver el depósito.";
        setError(mensaje);
        // Ya resuelta por otra vía o sin devolución: lo que se ve está viejo.
        if (e.status === 409 || e.codigo === DEVOLUCION_NO_REGISTRADA) onDesactualizada(mensaje);
      } else {
        setError(mensajeGeneral(e, "resolver el depósito"));
      }
    }
  }

  return (
    <section aria-label="Resumen de la garantía" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Depósito de garantía</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="garantia-retenido" className="text-sm font-medium">
          Monto a retener (USD)
        </label>
        <input
          id="garantia-retenido"
          type="text"
          inputMode="decimal"
          value={monto}
          disabled={sinObservaciones || confirmando}
          onChange={(e) => {
            setMonto(e.target.value);
            setError(null);
          }}
          className={`${CLASE_CAMPO} disabled:opacity-60`}
        />
        {sinObservaciones && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            La devolución se registró sin observaciones, así que el depósito se libera completo.
          </p>
        )}
      </div>

      {valido && calculo.retenido > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="garantia-motivo" className="text-sm font-medium">
            Motivo de la retención
          </label>
          <textarea
            id="garantia-motivo"
            value={motivo}
            maxLength={LARGO_MAXIMO_MOTIVO}
            rows={2}
            disabled={confirmando}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            className={`${CLASE_CAMPO} disabled:opacity-60`}
          />
          <p className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
            {motivo.length}/{LARGO_MAXIMO_MOTIVO}
          </p>
        </div>
      )}

      <Importes
        original={garantia.depositoOriginal}
        retenido={valido ? calculo.retenido : null}
        liberado={valido ? calculo.liberado : null}
        estado={valido ? `${calculo.estado} (al confirmar)` : "PENDIENTE"}
      />
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{NOTA_SIMULADO}</p>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {confirmando && valido ? (
        <ConfirmacionCierre
          retenido={calculo.retenido}
          liberado={calculo.liberado}
          procesando={procesando}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmando(false)}
        />
      ) : (
        <div>
          <button
            type="button"
            onClick={revisar}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Resolver depósito
          </button>
        </div>
      )}
    </section>
  );
}
