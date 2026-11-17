"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { crearPublicacion, type EstadoPublicacion } from "@/app/actions/publicaciones";
import {
  leerFormulario,
  TIPOS,
  UNIDADES,
  validarPublicacion,
  type CampoPublicacion,
  type ErroresCampos,
} from "@/lib/publicaciones/reglas";
import { CargaImagenes } from "./carga-imagenes";

const inicial: EstadoPublicacion = { estado: "inicial" };

const inputClass =
  "rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-900 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:focus:border-zinc-100";

export function FormularioPublicacion() {
  const [estado, enviar, enviando] = useActionState(crearPublicacion, inicial);
  // Errores encontrados en el navegador, antes de enviar.
  const [erroresLocales, setErroresLocales] = useState<ErroresCampos | null>(null);
  const errores = erroresLocales ?? estado.errores ?? {};

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Se envía a mano (y no con action=) para validar primero y para que React
    // no limpie el formulario si el servidor devuelve un error.
    e.preventDefault();
    if (enviando) return;
    const formData = new FormData(e.currentTarget);
    const encontrados = validarPublicacion(leerFormulario(formData));
    if (Object.keys(encontrados).length > 0) {
      setErroresLocales(encontrados);
      return;
    }
    setErroresLocales(null);
    startTransition(() => enviar(formData));
  }

  if (estado.estado === "restringido") {
    return (
      <div role="alert" className="rounded-md border border-red-300 p-4 text-sm">
        <p className="font-medium">Acceso restringido</p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Solo una cuenta de arrendador puede publicar, o tu sesión ya expiró.
        </p>
      </div>
    );
  }

  const campo = (nombre: CampoPublicacion) => ({
    id: nombre,
    name: nombre,
    "aria-invalid": Boolean(errores[nombre]),
    "aria-describedby": `${nombre}-error`,
  });
  const error = (nombre: CampoPublicacion) => (
    <p id={`${nombre}-error`} aria-live="polite" className="min-h-4 text-sm text-red-600">
      {errores[nombre]}
    </p>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Tipo</legend>
        <div className="flex gap-4">
          {TIPOS.map((t) => (
            <label key={t.valor} className="flex items-center gap-2 text-sm">
              <input type="radio" name="tipo" value={t.valor} aria-describedby="tipo-error" />
              {t.etiqueta}
            </label>
          ))}
        </div>
        {error("tipo")}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre
        </label>
        <input {...campo("nombre")} maxLength={100} className={inputClass} />
        {error("nombre")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descripcion" className="text-sm font-medium">
          Descripción <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea {...campo("descripcion")} rows={3} maxLength={1000} className={inputClass} />
        {error("descripcion")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ubicacion" className="text-sm font-medium">
          Ubicación
        </label>
        <input {...campo("ubicacion")} maxLength={200} className={inputClass} />
        {error("ubicacion")}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="tarifaMonto" className="text-sm font-medium">
            Tarifa (USD)
          </label>
          <input
            {...campo("tarifaMonto")}
            inputMode="decimal"
            placeholder="15.00"
            className={inputClass}
          />
          {error("tarifaMonto")}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tarifaUnidad" className="text-sm font-medium">
            Unidad de cobro
          </label>
          <select {...campo("tarifaUnidad")} defaultValue="" className={inputClass}>
            <option value="" disabled>
              Elegí una
            </option>
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.etiqueta}
              </option>
            ))}
          </select>
          {error("tarifaUnidad")}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="depositoMonto" className="text-sm font-medium">
          Depósito de garantía (USD) <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <input
          {...campo("depositoMonto")}
          inputMode="decimal"
          placeholder="0.00"
          className={inputClass}
        />
        {error("depositoMonto")}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="condiciones" className="text-sm font-medium">
          Condiciones de uso <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea {...campo("condiciones")} rows={3} maxLength={1000} className={inputClass} />
        {error("condiciones")}
      </div>

      <CargaImagenes error={errores.imagenes} />

      <p aria-live="polite" className="min-h-5 text-sm text-red-600">
        {estado.estado === "error" && !erroresLocales ? estado.error : null}
        {erroresLocales ? "Revisá los campos marcados." : null}
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition-opacity disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
