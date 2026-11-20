import { vi } from "vitest";
import type { PaginaSolicitudes, Solicitud } from "@/lib/solicitudes/tipos";

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

export function crearSolicitud(datos: Partial<Solicitud> = {}): Solicitud {
  secuencia += 1;
  return {
    id: `00000000-0000-4000-8000-${String(secuencia).padStart(12, "0")}`,
    estado: "PENDIENTE",
    publicacion: { id: "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6", nombre: "Taladro percutor" },
    arrendatario: {
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      nombre: `Arrendatario ${secuencia}`,
    },
    // 12 de nov, de 09:00 a 12:00 en El Salvador.
    inicio: "2026-11-12T15:00:00.000Z",
    fin: "2026-11-12T18:00:00.000Z",
    costoEstimado: "45.00",
    depositoMonto: "20.00",
    creadaAt: "2026-11-10T16:00:00.000Z",
    decididaAt: null,
    motivoRechazo: null,
    ...datos,
  };
}

export function pagina(
  items: Solicitud[],
  { total = items.length, page = 1, limit = 12 } = {},
): PaginaSolicitudes {
  return { items, total, page, limit };
}

type Rutas = {
  lista?: (query: URLSearchParams) => Respuesta;
  decidir?: (id: string, body: Record<string, unknown>) => Respuesta;
  calificar?: (id: string, body: Record<string, unknown>) => Respuesta;
};

/**
 * Simula los route handlers de /api/arrendador/solicitudes y
 * /api/reservas/:id/decision.
 */
export function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";

    if (metodo === "GET" && url.pathname === "/api/arrendador/solicitudes") {
      return rutas.lista ? rutas.lista(url.searchParams) : json(pagina([]));
    }
    const decision = url.pathname.match(/^\/api\/reservas\/([^/]+)\/decision$/);
    if (metodo === "PATCH" && decision && rutas.decidir) {
      return rutas.decidir(
        decodeURIComponent(decision[1]),
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      );
    }
    const calificar = url.pathname.match(
      /^\/api\/reservas\/([^/]+)\/calificacion-arrendatario$/,
    );
    if (metodo === "POST" && calificar && rutas.calificar) {
      return rutas.calificar(
        decodeURIComponent(calificar[1]),
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      );
    }
    throw new Error(`Llamada no esperada: ${metodo} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  function llamadas(metodo: string, pathname: RegExp) {
    return fetchMock.mock.calls.filter(([entrada, init]) => {
      const url = new URL(String(entrada), "http://localhost");
      return pathname.test(url.pathname) && (init?.method ?? "GET") === metodo;
    });
  }

  return {
    fetchMock,
    llamadasLista: () =>
      llamadas("GET", /^\/api\/arrendador\/solicitudes$/).map(
        ([entrada]) => new URL(String(entrada), "http://localhost").searchParams,
      ),
    llamadasCalificar: () =>
      llamadas("POST", /\/calificacion-arrendatario$/).map(([, init]) =>
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      ),
    llamadasDecision: () =>
      llamadas("PATCH", /\/decision$/).map(([, init]) =>
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      ),
  };
}
