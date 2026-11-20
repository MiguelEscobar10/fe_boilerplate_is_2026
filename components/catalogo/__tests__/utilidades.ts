import { vi } from "vitest";
import type { PaginaCatalogo, PublicacionResumen } from "@/lib/catalogo/tipos";

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

export function crearPublicacion(datos: Partial<PublicacionResumen> = {}): PublicacionResumen {
  secuencia += 1;
  const id = `00000000-0000-4000-8000-${String(secuencia).padStart(12, "0")}`;
  return {
    id,
    nombre: `Publicación ${secuencia}`,
    precio: 15,
    tipo: "EQUIPO",
    tarifaUnidad: "DIA",
    ubicacion: "Antiguo Cuscatlán",
    imagenUrl: `/api/v1/publicaciones/${id}/imagenes/0`,
    ...datos,
  };
}

export function pagina(
  items: PublicacionResumen[],
  { total = items.length, page = 1 } = {},
): PaginaCatalogo {
  return { items, total, page };
}

/** Simula el route handler GET /api/publicaciones. */
export function simularApi(lista: (query: URLSearchParams) => Respuesta) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname !== "/api/publicaciones") {
      throw new Error(`Llamada inesperada a ${url.pathname}`);
    }
    return lista(url.searchParams);
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    /** Query de cada llamada, en orden. */
    llamadas: () =>
      fetchMock.mock.calls.map(
        ([entrada]) => new URL(String(entrada), "http://localhost").searchParams,
      ),
  };
}
