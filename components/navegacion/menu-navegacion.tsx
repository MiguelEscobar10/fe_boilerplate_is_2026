"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { esRutaActual, type EnlaceNavegacion } from "@/lib/navegacion";

type Props = {
  /** Ya filtrados por rol en el servidor (lib/navegacion.ts). */
  enlaces: EnlaceNavegacion[];
};

/** Botón de hamburguesa con las rutas que puede abrir el usuario. */
export function MenuNavegacion({ enlaces }: Props) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Se cierra con Escape o con un clic fuera del menú.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    const alClic = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alClic);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alClic);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          {abierto ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" />
          )}
        </svg>
      </button>
      {abierto && (
        <nav
          id={panelId}
          aria-label="Navegación principal"
          className="absolute left-0 top-11 w-60 rounded-md border border-zinc-200 bg-background py-1 shadow-sm dark:border-zinc-800"
        >
          <ul>
            {enlaces.map((enlace) => {
              const actual = esRutaActual(enlace.href, pathname);
              return (
                <li key={enlace.href}>
                  <Link
                    href={enlace.href}
                    aria-current={actual ? "page" : undefined}
                    onClick={() => setAbierto(false)}
                    className={`block border-l-2 px-3 py-2 text-sm ${
                      actual
                        ? "border-foreground font-medium"
                        : "border-transparent text-zinc-600 hover:bg-zinc-50 hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {enlace.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
