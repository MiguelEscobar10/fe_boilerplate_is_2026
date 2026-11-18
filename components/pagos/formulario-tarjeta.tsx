"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  normalizarTarjeta,
  validarTarjeta,
  type CampoTarjeta,
  type ErroresTarjeta,
} from "@/lib/pagos/tarjeta";
import type { DatosTarjeta } from "@/lib/pagos/tipos";

type Props = {
  /** Recibe los datos ya normalizados (sin espacios) y validados. */
  onPagar: (datos: DatosTarjeta) => void;
  /** Mientras se procesa, el botón queda deshabilitado. */
  procesando: boolean;
};

const VACIO: DatosTarjeta = { numeroTarjeta: "", vencimiento: "", cvv: "" };

/**
 * Pone la barra de MM/AA sola: el teclado numérico del móvil no siempre la
 * tiene. "1228" → "12/28".
 */
function formatearVencimiento(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

/**
 * Formulario de la tarjeta de prueba.
 *
 * Los datos de la tarjeta viven solo en el estado local de este componente:
 * nada de estado global, storage, cookies ni URL. Al enviar se pasan a
 * `onPagar` y el estado se vacía en el mismo momento. Ningún campo tiene
 * `name`, así que aunque el formulario se enviara sin JavaScript no viajaría
 * ningún dato, y `autoComplete="off"` evita que el navegador ofrezca
 * guardar o completar tarjetas reales.
 */
export function FormularioTarjeta({ onPagar, procesando }: Props) {
  const [datos, setDatos] = useState<DatosTarjeta>(VACIO);
  const [errores, setErrores] = useState<ErroresTarjeta>({});

  function cambiar(campo: CampoTarjeta, valor: string) {
    setDatos((anterior) => ({ ...anterior, [campo]: valor }));
    if (errores[campo]) {
      setErrores((anterior) => ({ ...anterior, [campo]: undefined }));
    }
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (procesando) return;

    const normalizados = normalizarTarjeta(datos);
    const nuevosErrores = validarTarjeta(normalizados);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setDatos(VACIO);
    onPagar(normalizados);
  }

  function propsCampo(campo: CampoTarjeta) {
    const error = errores[campo];
    return {
      id: `tarjeta-${campo}`,
      value: datos[campo],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        cambiar(campo, campo === "vencimiento" ? formatearVencimiento(e.target.value) : e.target.value),
      type: "text",
      inputMode: "numeric" as const,
      autoComplete: "off",
      autoCorrect: "off",
      spellCheck: false,
      disabled: procesando,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `tarjeta-${campo}-error` : undefined,
      className:
        "w-full rounded-md border border-zinc-300 bg-background px-3 py-2 text-base tabular-nums aria-invalid:border-red-500 disabled:opacity-60 dark:border-zinc-700",
    };
  }

  function mensajeError(campo: CampoTarjeta) {
    const error = errores[campo];
    if (!error) return null;
    return (
      <p id={`tarjeta-${campo}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  return (
    <form method="post" onSubmit={enviar} noValidate className="space-y-4">
      <div className="rounded-md bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
        <p className="mb-1 font-medium">Tarjetas de prueba</p>
        <ul className="space-y-0.5 text-zinc-700 dark:text-zinc-300">
          <li>
            Terminada en <strong className="tabular-nums">4242</strong>: el pago se aprueba.
          </li>
          <li>
            Terminada en <strong className="tabular-nums">0002</strong>: el pago se rechaza.
          </li>
        </ul>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Solo se aceptan tarjetas de prueba.</p>
      </div>

      <div>
        <label htmlFor="tarjeta-numeroTarjeta" className="mb-1 block text-sm font-medium">
          Número de tarjeta
        </label>
        <input
          {...propsCampo("numeroTarjeta")}
          placeholder="4242 4242 4242 4242"
          maxLength={23}
        />
        {mensajeError("numeroTarjeta")}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tarjeta-vencimiento" className="mb-1 block text-sm font-medium">
            Vencimiento (MM/AA)
          </label>
          <input {...propsCampo("vencimiento")} placeholder="MM/AA" maxLength={5} />
          {mensajeError("vencimiento")}
        </div>
        <div>
          <label htmlFor="tarjeta-cvv" className="mb-1 block text-sm font-medium">
            Código de seguridad
          </label>
          <input {...propsCampo("cvv")} placeholder="123" maxLength={4} />
          {mensajeError("cvv")}
        </div>
      </div>

      <button
        type="submit"
        disabled={procesando}
        aria-busy={procesando || undefined}
        className="w-full rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {procesando ? "Procesando pago…" : "Pagar"}
      </button>
    </form>
  );
}
