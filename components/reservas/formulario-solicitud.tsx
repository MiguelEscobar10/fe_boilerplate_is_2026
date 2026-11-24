"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AvisoVerificacionRequerida } from "@/components/verificacion/aviso-verificacion-requerida";
import type { PeriodoElegido } from "@/components/disponibilidad/selector-disponibilidad";
import { BloqueCondiciones } from "@/components/publicaciones/bloque-condiciones";
import { formatearMonto } from "@/lib/pagos/montos";
import { costoEstimado, NOMBRE_UNIDAD, unidadesDeCobro } from "@/lib/reservas/costo";
import {
  ErrorDeApi,
  ErrorDeRed,
  SesionExpiradaError,
  solicitarReserva,
} from "@/lib/reservas/cliente";
import {
  HORA_FIN_POR_DEFECTO,
  HORA_INICIO_POR_DEFECTO,
  armarPeriodo,
  errorDePeriodo,
} from "@/lib/reservas/periodo";
import {
  FECHA_PASADA,
  PERIODO_NO_DISPONIBLE,
  type Reserva,
  type UnidadTarifa,
} from "@/lib/reservas/tipos";
import { esErrorVerificacionRequerida } from "@/lib/verificacion/requisito";
import { EstadoReserva } from "./estado-reserva";
import { ResumenReserva } from "./resumen-reserva";
import { SelectorPeriodo } from "./selector-periodo";

type Props = {
  publicacionId: string;
  tarifaMonto: string;
  tarifaUnidad: UnidadTarifa;
  depositoMonto: string;
  /** Condiciones de uso de la publicación (H12); null si no tiene. */
  condiciones?: string | null;
};

type Fallo =
  | { tipo: "verificacion"; mensaje: string }
  | { tipo: "mensaje"; mensaje: string };

/** Qué le dice la pantalla a la persona según cómo falló el envío. */
function falloDe(error: unknown): Fallo {
  if (esErrorVerificacionRequerida(error)) {
    return { tipo: "verificacion", mensaje: (error as ErrorDeApi).detalle ?? "" };
  }
  if (error instanceof ErrorDeRed) {
    return { tipo: "mensaje", mensaje: "No se pudo enviar la solicitud. Revisa tu conexión." };
  }
  if (error instanceof ErrorDeApi) {
    if (error.status === 409 || error.codigo === PERIODO_NO_DISPONIBLE) {
      return {
        tipo: "mensaje",
        mensaje: "El período elegido ya no está disponible. Elige otras fechas.",
      };
    }
    if (error.status === 400) {
      return {
        tipo: "mensaje",
        mensaje:
          error.codigo === FECHA_PASADA
            ? "La fecha de inicio ya pasó. Elige un período a partir de ahora."
            : (error.detalle ?? "Las fechas elegidas no son válidas."),
      };
    }
    if (error.status === 403) {
      return { tipo: "mensaje", mensaje: "Solo un arrendatario puede solicitar una reserva." };
    }
    if (error.status === 404) {
      return { tipo: "mensaje", mensaje: "Esta publicación ya no está disponible." };
    }
  }
  return { tipo: "mensaje", mensaje: "No se pudo enviar la solicitud. Inténtalo de nuevo." };
}

/**
 * Formulario de solicitud de reserva (H03): elegir el período, ver el costo
 * estimado y el depósito por separado, y enviar. Una solicitud nueva queda
 * PENDIENTE: no aparta las fechas hasta que el arrendador la aprueba.
 */
export function FormularioSolicitud({
  publicacionId,
  tarifaMonto,
  tarifaUnidad,
  depositoMonto,
  condiciones = null,
}: Props) {
  const [dias, setDias] = useState<PeriodoElegido | null>(null);
  const [horaInicio, setHoraInicio] = useState(HORA_INICIO_POR_DEFECTO);
  const [horaFin, setHoraFin] = useState(HORA_FIN_POR_DEFECTO);
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  // Cambiarla vuelve a montar el calendario: tras un 409 recarga los días.
  const [version, setVersion] = useState(0);
  // Además del botón deshabilitado: dos clics muy seguidos pueden llegar
  // antes de que React vuelva a renderizar.
  const enVuelo = useRef(false);

  const periodo = armarPeriodo(
    dias?.desde ?? null,
    dias?.hasta ?? null,
    tarifaUnidad,
    horaInicio,
    horaFin,
  );
  // El aviso solo aparece cuando ya hay días elegidos.
  const errorPeriodo = dias ? errorDePeriodo(periodo, tarifaUnidad) : null;
  const puedeEnviar = periodo !== null && errorPeriodo === null && !enviando;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!periodo || errorPeriodo || enVuelo.current) return;
    enVuelo.current = true;
    setEnviando(true);
    setFallo(null);
    try {
      setReserva(
        await solicitarReserva({ publicacionId, inicio: periodo.inicio, fin: periodo.fin }),
      );
    } catch (error) {
      if (error instanceof SesionExpiradaError) return;
      setFallo(falloDe(error));
      // El período ya no sirve: se vuelve a elegir con los días al día.
      if (error instanceof ErrorDeApi && error.status === 409) {
        setDias(null);
        setVersion((v) => v + 1);
      }
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  }

  if (reserva) {
    return (
      <div className="flex flex-col gap-4" data-testid="solicitud-enviada">
        <p
          role="status"
          className="rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 p-3 text-sm"
        >
          Enviamos tu solicitud al arrendador.
        </p>
        <EstadoReserva estado={reserva.estado} numero={reserva.id} />
        <ResumenReserva
          inicio={reserva.inicio}
          fin={reserva.fin}
          costo={reserva.costoAlquiler}
          deposito={reserva.depositoMonto}
        />
        <Link
          href={`/reservas/${encodeURIComponent(reserva.id)}`}
          className="self-start text-sm font-medium underline"
        >
          Ver mi solicitud
        </Link>
      </div>
    );
  }

  const unidades = periodo ? unidadesDeCobro(periodo.inicioMs, periodo.finMs, tarifaUnidad) : 0;
  const nombre = NOMBRE_UNIDAD[tarifaUnidad];

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <SelectorPeriodo
        key={version}
        publicacionId={publicacionId}
        unidad={tarifaUnidad}
        horaInicio={horaInicio}
        horaFin={horaFin}
        deshabilitado={enviando}
        onDias={setDias}
        onHoraInicio={setHoraInicio}
        onHoraFin={setHoraFin}
      />

      {errorPeriodo && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm"
        >
          {errorPeriodo}
        </p>
      )}

      {periodo && !errorPeriodo && (
        <ResumenReserva
          estimado
          inicio={periodo.inicio}
          fin={periodo.fin}
          costo={costoEstimado(tarifaMonto, tarifaUnidad, periodo.inicioMs, periodo.finMs)}
          deposito={formatearMonto(depositoMonto)}
          detalle={`${unidades} ${unidades === 1 ? nombre.singular : nombre.plural} × $${formatearMonto(tarifaMonto)}`}
        />
      )}

      {fallo?.tipo === "verificacion" && <AvisoVerificacionRequerida mensaje={fallo.mensaje} />}
      {fallo?.tipo === "mensaje" && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm"
        >
          {fallo.mensaje}
        </p>
      )}

      {/* H12: las condiciones y el depósito se leen antes de pulsar el botón. */}
      <BloqueCondiciones condiciones={condiciones} depositoMonto={depositoMonto} />

      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Al enviar, tu solicitud queda <strong>pendiente</strong> hasta que el arrendador la
        apruebe. No aparta las fechas.
      </p>

      <button
        type="submit"
        disabled={!puedeEnviar}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Solicitar reserva"}
      </button>
    </form>
  );
}
