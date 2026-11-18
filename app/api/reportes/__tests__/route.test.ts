// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../ingresos/route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function urlLlamada() {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

const REPORTE = {
  desde: "2026-11-01",
  hasta: "2026-11-30",
  moneda: "USD",
  total: "45.00",
  porBien: [],
};

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue("token-123");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

describe("GET /api/reportes/ingresos", () => {
  it("reenvía solo desde y hasta, con el token como Bearer", async () => {
    fetchMock.mockResolvedValue(jsonResponse(REPORTE));

    const res = await GET(
      new NextRequest(
        "http://localhost/api/reportes/ingresos?desde=2026-11-01&hasta=2026-11-30&arrendadorId=otro&page=2",
      ),
    );

    const url = urlLlamada();
    expect(url.origin + url.pathname).toBe("http://backend.test/api/v1/reportes/ingresos");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(REPORTE);
  });

  it("sin parámetros llama sin query (el backend usa el mes en curso)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(REPORTE));

    await GET(new NextRequest("http://localhost/api/reportes/ingresos?arrendadorId=otro"));

    expect(urlLlamada().href).toBe("http://backend.test/api/v1/reportes/ingresos");
  });

  it("devuelve el 400 y el 403 del backend tal cual", async () => {
    const cuerpo400 = { statusCode: 400, message: "desde no puede ser posterior a hasta.", error: "Bad Request" };
    fetchMock.mockResolvedValueOnce(jsonResponse(cuerpo400, 400));
    const res400 = await GET(
      new NextRequest("http://localhost/api/reportes/ingresos?desde=2026-11-20&hasta=2026-11-01"),
    );
    expect(res400.status).toBe(400);
    expect(await res400.json()).toEqual(cuerpo400);

    fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: 403, message: "Forbidden resource" }, 403));
    const res403 = await GET(new NextRequest("http://localhost/api/reportes/ingresos"));
    expect(res403.status).toBe(403);
  });

  it("responde 401 sin llamar al backend si no hay sesión", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await GET(new NextRequest("http://localhost/api/reportes/ingresos"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("borra la sesión y responde 401 si el backend rechaza el token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 401, message: "Unauthorized" }, 401));

    const res = await GET(new NextRequest("http://localhost/api/reportes/ingresos"));

    expect(res.status).toBe(401);
    expect(deleteSession).toHaveBeenCalledOnce();
  });
});
