"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeApi,
  SesionExpiradaError,
  obtenerDevolucion,
  obtenerGarantia,
} from "@/lib/devoluciones/cliente";
import type { Devolucion, Garantia } from "@/lib/devoluciones/tipos";
import { fecha, mensajeGeneral } from "@/components/entregas/mensajes";
import { FormularioDevolucion } from "./formulario-devolucion";
import { ResumenGarantia } from "./resumen-garantia";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "lista"; devolucion: Devolucion | null; garantia: Garantia };

function mensajeDeCarga(error: unknown) {
  if (error instanceof ErrorDeApi) {
    if (error.status === 400) return "La dirección de la reserva no es válida.";
    if (error.status === 404) return "La reserva no existe.";
    if (error.status === 403) return "Esta reserva no es tuya.";
  }
  return mensajeGeneral(error, "consultar la reserva");
}

/**
 * Pantalla /reservas/{id}/devolucion (H09). Dos pasos en orden: primero se
 * registra la devolución y solo después se habilita la resolución del
 * depósito, que cierra la reserva. El arrendatario ve lo mismo sin acciones.
 * Que la reserva sea del arrendador y esté EN_CURSO lo decide el backend.
 */
export function PantallaDevolucion({
  reservaId,
  esArrendador,
}: {
  reservaId: string;
  esArrendador: boolean;
}) {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  // Error que debe seguir a la vista aunque la pantalla se vuelva a cargar.
  const [conflicto, setConflicto] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerGarantia(reservaId), obtenerDevolucion(reservaId)])
      .then(([garantia, devolucion]) => {
        if (vigente) setCarga({ tipo: "lista", devolucion, garantia });
      })
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        setCarga({ tipo: "error", mensaje: mensajeDeCarga(e) });
      });
    return () => {
      vigente = false;
    };
  }, [reservaId, recarga]);

  const recargar = () => setRecarga((n) => n + 1);

  if (carga.tipo === "cargando") return <p role="status">Cargando...</p>;
  if (carga.tipo === "error") return <p role="alert">{carga.mensaje}</p>;

  const { devolucion, garantia } = carga;
  const cerrada = garantia.estadoGarantia !== "PENDIENTE";

  return (
    <div className="flex flex-col gap-6">
      {aviso && (
        <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
          {aviso}
        </p>
      )}

      {conflicto && (
        <p role="alert" className="text-sm text-red-600">
          {conflicto}
        </p>
      )}

      <p className="text-sm">
        <span className="text-zinc-500">Estado de la reserva: </span>
        <span className="font-medium">{garantia.estadoReserva}</span>
      </p>

      <section aria-label="Devolución" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">1. Devolución</h2>
        {devolucion ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-zinc-500">Fecha real</dt>
            <dd>{fecha(devolucion.fechaReal)}</dd>
            <dt className="text-zinc-500">Estado final</dt>
            <dd>
              {devolucion.estadoFinal === "CON_OBSERVACIONES"
                ? "Con observaciones"
                : "Sin observaciones"}
            </dd>
            {devolucion.danos && (
              <>
                <dt className="text-zinc-500">Daños o faltantes</dt>
                <dd className="whitespace-pre-line">{devolucion.danos}</dd>
              </>
            )}
          </dl>
        ) : esArrendador ? (
          <FormularioDevolucion
            reservaId={reservaId}
            onRegistrada={() => {
              setAviso("Devolución registrada. Ahora resuelve el depósito para cerrar la reserva.");
              recargar();
            }}
            onConflicto={recargar}
          />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            El arrendador todavía no ha registrado la devolución.
          </p>
        )}
      </section>

      {devolucion ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            2. Resolución del depósito
          </p>
          <ResumenGarantia
            // Otra consulta de la garantía: el formulario empieza de cero.
            key={`${garantia.estadoGarantia}-${recarga}`}
            reservaId={reservaId}
            garantia={garantia}
            estadoFinal={devolucion.estadoFinal}
            puedeResolver={esArrendador}
            onResuelta={(resuelta) => {
              setConflicto(null);
              setAviso("Depósito resuelto. La reserva quedó COMPLETADA.");
              setCarga({ tipo: "lista", devolucion, garantia: resuelta });
            }}
            onDesactualizada={(mensaje) => {
              setAviso(null);
              setConflicto(mensaje);
              recargar();
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          2. La resolución del depósito se habilita después de registrar la devolución.
        </p>
      )}

      {cerrada && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          La reserva está cerrada. No quedan acciones pendientes.
        </p>
      )}
    </div>
  );
}
