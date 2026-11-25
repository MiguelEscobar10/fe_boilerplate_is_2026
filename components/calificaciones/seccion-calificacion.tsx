"use client";

import { useCallback, useEffect, useState } from "react";
import { consultarCalificacionPropia } from "@/lib/calificaciones/cliente-bien";
import type { CalificacionPropia } from "@/lib/calificaciones/tipos";
import { FormularioCalificacion, type ResultadoCalificacionBien } from "./formulario-calificacion";

type Vista =
  | { tipo: "cargando" }
  | { tipo: "sin-calificar"; abierto: boolean }
  | { tipo: "calificada"; calificacion: CalificacionPropia | null }
  | { tipo: "no-disponible"; mensaje: string }
  | { tipo: "error" };

const estrellas = (n: number) => `${"★".repeat(n)}${"☆".repeat(5 - n)} (${n} de 5)`;

/**
 * Calificación del bien y del arrendador en el detalle de una reserva
 * COMPLETADA (H17). Consulta si ya se calificó: la acción «Calificar» solo se
 * ofrece si no, y desaparece apenas se guarda.
 */
export function SeccionCalificacion({
  reservaId,
  nombreBien,
}: {
  reservaId: string;
  nombreBien: string;
}) {
  const [vista, setVista] = useState<Vista>({ tipo: "cargando" });

  const consultar = useCallback(async () => {
    setVista({ tipo: "cargando" });
    const resultado = await consultarCalificacionPropia(reservaId);
    switch (resultado.tipo) {
      case "calificada":
        setVista({ tipo: "calificada", calificacion: resultado.calificacion });
        break;
      case "sin-calificar":
        setVista({ tipo: "sin-calificar", abierto: false });
        break;
      case "no-disponible":
        setVista({ tipo: "no-disponible", mensaje: "Reserva no disponible" });
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

  function terminado(resultado: ResultadoCalificacionBien, mensaje?: string) {
    if (resultado === "calificada") {
      // Se vuelve a consultar para mostrar lo que quedó guardado.
      void consultar();
    } else {
      setVista({ tipo: "no-disponible", mensaje: mensaje ?? "Reserva no disponible" });
    }
  }

  return (
    <section aria-labelledby="titulo-calificacion" className="flex flex-col gap-3">
      <h2 id="titulo-calificacion" className="text-lg font-semibold">
        Calificación
      </h2>

      {vista.tipo === "cargando" && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          Consultando la calificación…
        </p>
      )}

      {vista.tipo === "sin-calificar" && !vista.abierto && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            La reserva terminó. Cuéntanos cómo te fue con el bien y con el arrendador.
          </p>
          <button
            type="button"
            onClick={() => setVista({ tipo: "sin-calificar", abierto: true })}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Calificar
          </button>
        </div>
      )}

      {vista.tipo === "sin-calificar" && vista.abierto && (
        <FormularioCalificacion
          reservaId={reservaId}
          nombreBien={nombreBien}
          onTerminado={terminado}
          onCancelar={() => setVista({ tipo: "sin-calificar", abierto: false })}
        />
      )}

      {vista.tipo === "calificada" && (
        <div
          role="status"
          data-testid="calificacion-hecha"
          className="rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 px-3 py-2 text-sm"
        >
          <p className="font-medium">Ya calificaste esta reserva. ¡Gracias!</p>
          {vista.calificacion && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt>Bien</dt>
              <dd data-testid="puntaje-bien">{estrellas(vista.calificacion.puntajeBien)}</dd>
              <dt>Arrendador</dt>
              <dd data-testid="puntaje-arrendador">
                {estrellas(vista.calificacion.puntajeArrendador)}
              </dd>
              {vista.calificacion.comentario && (
                <>
                  <dt>Comentario</dt>
                  <dd>{vista.calificacion.comentario}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}

      {vista.tipo === "no-disponible" && (
        <p role="alert" data-testid="calificacion-no-disponible" className="text-sm">
          {vista.mensaje}
        </p>
      )}

      {vista.tipo === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-transparent text-red-700 dark:border-red-900 dark:text-red-400 px-3 py-2 text-sm"
          >
            No se pudo consultar la calificación. Inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => void consultar()}
            className="rounded-md border border-zinc-400 px-3 py-1.5 text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      )}
    </section>
  );
}
