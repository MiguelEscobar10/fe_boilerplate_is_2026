"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  ErrorDeApi,
  SesionExpiradaError,
  registrarEntrega,
} from "@/lib/entregas/cliente";
import {
  ENTREGA_NO_HABILITADA,
  EXTENSIONES_FOTO,
  LARGO_MAXIMO_NOTA,
  MAXIMO_FOTOS,
  TAMANO_MAXIMO_FOTO,
  TIPOS_FOTO,
  nombreAccion,
  type EntregaCreada,
  type TipoBien,
} from "@/lib/entregas/tipos";
import { fecha, mensajeGeneral } from "./mensajes";

/** Revisión rápida en el navegador; el backend vuelve a validar. */
export function validarEntrega(nota: string, fotos: File[]): string | null {
  const limpia = nota.trim();
  if (limpia.length === 0) return "Escribe la nota del estado inicial.";
  if (limpia.length > LARGO_MAXIMO_NOTA) {
    return `La nota puede tener como máximo ${LARGO_MAXIMO_NOTA} caracteres.`;
  }
  if (fotos.length > MAXIMO_FOTOS) return `Puedes subir como máximo ${MAXIMO_FOTOS} fotos.`;
  for (const foto of fotos) {
    const extension = foto.name.slice(foto.name.lastIndexOf(".")).toLowerCase();
    if (!TIPOS_FOTO.includes(foto.type) && !EXTENSIONES_FOTO.includes(extension)) {
      return `La foto "${foto.name}" debe ser JPG o PNG.`;
    }
    if (foto.size > TAMANO_MAXIMO_FOTO) {
      return `La foto "${foto.name}" pesa más de 5 MB.`;
    }
  }
  return null;
}

type Props = {
  reservaId: string;
  tipoBien: TipoBien;
  onEntregada: (creada: EntregaCreada) => void;
  /** 409: la reserva cambió (ya entregada o ya no CONFIRMADA). Hay que refrescar. */
  onConflicto?: () => void;
};

/**
 * Formulario de entrega (H08, BE-08.1): nota del estado inicial con contador,
 * hasta 5 fotos opcionales y confirmación antes de enviar. La fecha la pone
 * el servidor.
 */
export function FormularioEntrega({ reservaId, tipoBien, onEntregada, onConflicto }: Props) {
  const idNota = useId();
  const idFotos = useId();
  const inputFotos = useRef<HTMLInputElement>(null);
  const [nota, setNota] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accion = nombreAccion(tipoBien);

  function fotos() {
    return Array.from(inputFotos.current?.files ?? []);
  }

  function pedirConfirmacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const invalido = validarEntrega(nota, fotos());
    if (invalido) {
      setError(invalido);
      return;
    }
    setError(null);
    setConfirmando(true);
  }

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);
    try {
      onEntregada(await registrarEntrega(reservaId, nota.trim(), fotos()));
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setConfirmando(false);
      if (e instanceof ErrorDeApi && e.status === 409) {
        setError("La reserva cambió: ya tiene una entrega registrada o ya no está CONFIRMADA.");
        onConflicto?.();
      } else if (e instanceof ErrorDeApi && e.codigo === ENTREGA_NO_HABILITADA) {
        setError(
          e.disponibleDesde
            ? `Todavía no puedes registrarla: estará disponible desde el ${fecha(e.disponibleDesde)}.`
            : "Todavía no llega la fecha de inicio de la reserva.",
        );
      } else if (e instanceof ErrorDeApi && e.status === 400) {
        setError(e.detalle ?? "Revisa la nota y las fotos.");
      } else if (e instanceof ErrorDeApi && e.status === 403) {
        setError("Solo el arrendador del bien puede registrar la entrega.");
      } else if (e instanceof ErrorDeApi && e.status === 404) {
        setError("La reserva no existe.");
      } else {
        setError(mensajeGeneral(e, "registrar la entrega"));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={pedirConfirmacion}
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="font-medium">{accion}</h2>
      <div className="flex flex-col gap-1">
        <label htmlFor={idNota} className="text-sm font-medium">
          Estado inicial del bien
        </label>
        <textarea
          id={idNota}
          value={nota}
          maxLength={LARGO_MAXIMO_NOTA}
          rows={4}
          disabled={confirmando}
          aria-describedby={`${idNota}-contador`}
          onChange={(e) => setNota(e.target.value)}
          className="rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p id={`${idNota}-contador`} className="self-end text-xs text-zinc-600 dark:text-zinc-400">
          {nota.length}/{LARGO_MAXIMO_NOTA}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={idFotos} className="text-sm font-medium">
          Fotos (opcional)
        </label>
        <p id={`${idFotos}-ayuda`} className="text-xs text-zinc-600 dark:text-zinc-400">
          Hasta {MAXIMO_FOTOS} fotos JPG o PNG de máximo 5 MB.
        </p>
        <input
          ref={inputFotos}
          id={idFotos}
          type="file"
          multiple
          disabled={confirmando}
          accept={[...TIPOS_FOTO, ...EXTENSIONES_FOTO].join(",")}
          aria-describedby={`${idFotos}-ayuda`}
          onChange={() => setError(null)}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-2 dark:file:border-zinc-700"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {confirmando ? (
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
          <p>
            ¿Confirmas el registro? La fecha y hora la pone el servidor y la reserva pasará a
            EN_CURSO. No se puede registrar dos veces.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {enviando ? "Registrando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={enviando}
              className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {accion}
        </button>
      )}
    </form>
  );
}
