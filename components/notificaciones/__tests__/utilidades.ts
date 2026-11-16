import { vi } from "vitest";
import type { Bandeja, Notificacion } from "@/lib/notificaciones/tipos";

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

export function crearNotificacion(datos: Partial<Notificacion> = {}): Notificacion {
  secuencia += 1;
  return {
    id: `00000000-0000-4000-8000-${String(secuencia).padStart(12, "0")}`,
    moduloOrigen: "RESERVAS",
    titulo: `Aviso ${secuencia}`,
    mensaje: `Mensaje del aviso ${secuencia}.`,
    referencia: null,
    leidaAt: null,
    creadaAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ...datos,
  };
}

export function bandeja(items: Notificacion[], total = items.length): Bandeja {
  return { items, total };
}

type Rutas = {
  conteo?: () => Respuesta;
  lista?: (query: URLSearchParams) => Respuesta;
  marcar?: (id: string) => Respuesta;
};

/**
 * Simula los route handlers de /api/notificaciones. Devuelve el mock de fetch
 * y helpers para contar llamadas por ruta.
 */
export function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";

    if (metodo === "GET" && url.pathname === "/api/notificaciones/no-leidas/conteo") {
      return rutas.conteo ? rutas.conteo() : json({ noLeidas: 0 });
    }
    if (metodo === "GET" && url.pathname === "/api/notificaciones") {
      return rutas.lista ? rutas.lista(url.searchParams) : json(bandeja([]));
    }
    const marcar = url.pathname.match(/^\/api\/notificaciones\/([^/]+)\/leida$/);
    if (metodo === "PATCH" && marcar && rutas.marcar) {
      return rutas.marcar(decodeURIComponent(marcar[1]));
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

  return {
    fetchMock,
    llamadasConteo: () => llamadasA("/api/notificaciones/no-leidas/conteo").length,
    llamadasLista: () =>
      llamadasA("/api/notificaciones").map(
        ([entrada]) => new URL(String(entrada), "http://localhost").searchParams,
      ),
    llamadasMarcar: (id: string) =>
      llamadasA(`/api/notificaciones/${id}/leida`, "PATCH").length,
  };
}
