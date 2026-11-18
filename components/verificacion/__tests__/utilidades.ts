import { vi } from "vitest";
import type { SolicitudEnCola, Verificacion } from "@/lib/verificacion/tipos";

type Respuesta = Response | Promise<Response>;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorDeRed(): Promise<Response> {
  return Promise.reject(new TypeError("Failed to fetch"));
}

let secuencia = 0;

export function crearVerificacion(datos: Partial<Verificacion> = {}): Verificacion {
  secuencia += 1;
  return {
    id: `00000000-0000-4000-8000-${String(secuencia).padStart(12, "0")}`,
    estado: "PENDIENTE",
    motivoRechazo: null,
    enviadaAt: "2026-11-16T08:00:00.000Z",
    revisadaAt: null,
    ...datos,
  };
}

export function crearSolicitud(datos: Partial<SolicitudEnCola> = {}): SolicitudEnCola {
  const base = crearVerificacion();
  return {
    ...base,
    usuario: { id: "u-1", email: `persona${secuencia}@test.local`, nombre: `Persona ${secuencia}` },
    documentoUrl: `/api/v1/verificaciones/${base.id}/documento`,
    ...datos,
  };
}

export function archivo(nombre = "dui.pdf", tipo = "application/pdf", bytes = 1024) {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

type Rutas = {
  ultima?: () => Respuesta;
  enviar?: (datos: FormData) => Respuesta;
  cola?: (query: URLSearchParams) => Respuesta;
  decidir?: (id: string, body: { decision: string; motivo?: string }) => Respuesta;
};

/** Simula los route handlers del módulo de verificación. */
export function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";

    if (metodo === "GET" && url.pathname === "/api/usuarios/me/verificaciones/ultima") {
      return rutas.ultima ? rutas.ultima() : json({ message: "No hay" }, 404);
    }
    if (metodo === "POST" && url.pathname === "/api/usuarios/me/verificaciones" && rutas.enviar) {
      return rutas.enviar(init?.body as FormData);
    }
    if (metodo === "GET" && url.pathname === "/api/verificaciones") {
      return rutas.cola ? rutas.cola(url.searchParams) : json([]);
    }
    const decision = url.pathname.match(/^\/api\/verificaciones\/([^/]+)\/decision$/);
    if (metodo === "PATCH" && decision && rutas.decidir) {
      return rutas.decidir(decodeURIComponent(decision[1]), JSON.parse(String(init?.body)));
    }
    throw new Error(`Llamada no esperada: ${metodo} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  function llamadasA(pathname: string, metodo = "GET") {
    return fetchMock.mock.calls.filter(([entrada, init]) => {
      const url = new URL(String(entrada), "http://localhost");
      return url.pathname === pathname && (init?.method ?? "GET") === metodo;
    });
  }

  return { fetchMock, llamadasA };
}
