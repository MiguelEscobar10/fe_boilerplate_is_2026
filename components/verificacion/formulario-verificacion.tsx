"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  ErrorDeApi,
  SesionExpiradaError,
  enviarDocumento,
} from "@/lib/verificacion/cliente";
import {
  EXTENSIONES_PERMITIDAS,
  TAMANO_MAXIMO,
  TIPOS_PERMITIDOS,
  type VerificacionCreada,
} from "@/lib/verificacion/tipos";
import { mensajeGeneral } from "./mensajes";

/** Revisión rápida en el navegador; el backend vuelve a validar por la firma. */
export function validarArchivo(archivo: File | undefined): string | null {
  if (!archivo || archivo.size === 0) {
    return "Elige el archivo de tu documento de identidad.";
  }
  const extension = archivo.name.slice(archivo.name.lastIndexOf(".")).toLowerCase();
  if (
    !TIPOS_PERMITIDOS.includes(archivo.type) &&
    !EXTENSIONES_PERMITIDAS.includes(extension)
  ) {
    return "El documento debe ser JPG, PNG o PDF.";
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return "El documento puede pesar como máximo 5 MB.";
  }
  return null;
}

function mensajeDeError(error: unknown) {
  if (error instanceof ErrorDeApi) {
    if (error.status === 409) {
      return "Ya tienes una solicitud en revisión. Espera la respuesta del revisor antes de enviar otra.";
    }
    if (error.status === 400) {
      return error.detalle ?? "El archivo no es válido. Usa un JPG, PNG o PDF de máximo 5 MB.";
    }
    if (error.status === 403) {
      return "Solo las cuentas de arrendatario pueden verificar su identidad.";
    }
  }
  return mensajeGeneral(error, "enviar el documento");
}

type Props = {
  onEnviada: (creada: VerificacionCreada) => void;
};

/** Carga del documento de identidad (H07, BE-07.1). */
export function FormularioVerificacion({ onEnviada }: Props) {
  const idCampo = useId();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const archivo = input.current?.files?.[0];
    const invalido = validarArchivo(archivo);
    if (invalido) {
      setError(invalido);
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const creada = await enviarDocumento(archivo!);
      if (input.current) input.current.value = "";
      onEnviada(creada);
    } catch (e) {
      if (e instanceof SesionExpiradaError) return;
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label htmlFor={idCampo} className="font-medium">
        Documento de identidad
      </label>
      <p id={`${idCampo}-ayuda`} className="text-sm text-zinc-600 dark:text-zinc-400">
        JPG, PNG o PDF de máximo 5 MB. Solo lo verá el revisor.
      </p>
      <input
        ref={input}
        id={idCampo}
        name="documento"
        type="file"
        accept={[...TIPOS_PERMITIDOS, ...EXTENSIONES_PERMITIDAS].join(",")}
        aria-describedby={`${idCampo}-ayuda`}
        aria-invalid={error !== null}
        onChange={() => setError(null)}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-transparent file:px-3 file:py-2 dark:file:border-zinc-700"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {enviando ? "Enviando..." : "Enviar documento"}
      </button>
    </form>
  );
}
