"use client";

import { useRef, useState } from "react";
import { pagarReserva } from "@/lib/pagos/cliente";
import type { ErrorPago } from "@/lib/pagos/errores";
import { intentosRestantes, type DatosTarjeta, type PagoSimulado } from "@/lib/pagos/tipos";
import { FormularioTarjeta } from "./formulario-tarjeta";
import { ResultadoPago } from "./resultado-pago";
import { ResumenCobro } from "./resumen-cobro";

type Props = {
  reservaId: string;
  alquiler: string;
  deposito: string;
};

/**
 * Estados de la pantalla. `procesando` dura lo que tarda la petición: la
 * espera simulada de 2 segundos la hace el backend, no el navegador.
 */
type Estado =
  | { fase: "listo" }
  | { fase: "procesando" }
  | { fase: "aprobado"; pago: PagoSimulado }
  | { fase: "rechazado"; pago: PagoSimulado }
  | { fase: "error"; error: ErrorPago };

/** Si después de este estado se puede volver a intentar el pago. */
function admiteOtroIntento(estado: Estado) {
  switch (estado.fase) {
    case "listo":
    case "procesando":
      return true;
    case "rechazado":
      return intentosRestantes(estado.pago.intento) > 0;
    case "error":
      return estado.error.reintentable;
    case "aprobado":
      return false;
  }
}

export function PantallaPago({ reservaId, alquiler, deposito }: Props) {
  const [estado, setEstado] = useState<Estado>({ fase: "listo" });
  // Además del botón deshabilitado: dos clics muy seguidos pueden llegar
  // antes de que React vuelva a renderizar.
  const enVuelo = useRef(false);

  async function pagar(datos: DatosTarjeta) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setEstado({ fase: "procesando" });

    try {
      const respuesta = await pagarReserva(reservaId, datos);
      if (respuesta.tipo === "sesion-expirada") return; // ya se navega a /login
      if (respuesta.tipo === "error") {
        setEstado({ fase: "error", error: respuesta.error });
      } else if (respuesta.pago.estado === "APROBADO") {
        setEstado({ fase: "aprobado", pago: respuesta.pago });
      } else {
        setEstado({ fase: "rechazado", pago: respuesta.pago });
      }
    } finally {
      enVuelo.current = false;
    }
  }

  const procesando = estado.fase === "procesando";

  return (
    <div className="space-y-6">
      <p
        role="note"
        data-testid="aviso-pago-simulado"
        className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        Pago simulado: no se realizará ningún cargo real.
      </p>

      <ResumenCobro alquiler={alquiler} deposito={deposito} />

      <div aria-live="polite" className="empty:hidden">
        {estado.fase === "aprobado" && (
          <ResultadoPago resultado={{ tipo: "aprobado", pago: estado.pago }} />
        )}
        {estado.fase === "rechazado" && (
          <ResultadoPago resultado={{ tipo: "rechazado", pago: estado.pago }} />
        )}
        {estado.fase === "error" && (
          <ResultadoPago resultado={{ tipo: "error", error: estado.error }} />
        )}
        {procesando && (
          <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
            Procesando el pago con la pasarela de prueba…
          </p>
        )}
      </div>

      {admiteOtroIntento(estado) && (
        <section aria-labelledby="formulario-tarjeta-titulo">
          <h2 id="formulario-tarjeta-titulo" className="mb-3 text-base font-semibold">
            Datos de la tarjeta
          </h2>
          <FormularioTarjeta onPagar={pagar} procesando={procesando} />
        </section>
      )}
    </div>
  );
}
