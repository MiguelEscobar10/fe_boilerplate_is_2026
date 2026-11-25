"use client";

import { useEffect, useState } from "react";
import {
  ErrorDeApi,
  SesionExpiradaError,
  obtenerUltima,
} from "@/lib/verificacion/cliente";
import type { Verificacion } from "@/lib/verificacion/tipos";
import { EstadoVerificacion } from "./estado-verificacion";
import { FormularioVerificacion } from "./formulario-verificacion";
import { mensajeGeneral } from "./mensajes";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "restringido" }
  | { tipo: "listo"; verificacion: Verificacion | null };

/**
 * Pantalla del arrendatario: el estado de su última solicitud y, si no tiene
 * una en revisión ni está verificado, el formulario para enviar el documento.
 */
export function PanelVerificacion() {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerUltima()
      .then((verificacion) => {
        if (vigente) setCarga({ tipo: "listo", verificacion });
      })
      .catch((e: unknown) => {
        if (!vigente || e instanceof SesionExpiradaError) return;
        setCarga(
          e instanceof ErrorDeApi && e.status === 403
            ? { tipo: "restringido" }
            : { tipo: "error", mensaje: mensajeGeneral(e, "consultar tu verificación") },
        );
      });
    return () => {
      vigente = false;
    };
  }, [recarga]);

  function recargar() {
    setCarga({ tipo: "cargando" });
    setRecarga((n) => n + 1);
  }

  if (carga.tipo === "cargando") {
    return <p role="status">Cargando tu verificación...</p>;
  }
  if (carga.tipo === "restringido") {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-xl font-semibold">Acceso restringido</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Solo las cuentas de arrendatario verifican su identidad.
        </p>
      </div>
    );
  }
  if (carga.tipo === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>{carga.mensaje}</p>
        <button type="button" onClick={recargar} className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Reintentar
        </button>
      </div>
    );
  }

  const { verificacion } = carga;
  const puedeEnviar = !verificacion || verificacion.estado === "RECHAZADA";
  return (
    <div className="flex flex-col gap-4">
      {aviso && (
        <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
          {aviso}
        </p>
      )}
      <EstadoVerificacion verificacion={verificacion} />
      {puedeEnviar && (
        <FormularioVerificacion
          onEnviada={() => {
            setAviso("Documento enviado. Quedó en revisión.");
            recargar();
          }}
        />
      )}
    </div>
  );
}
