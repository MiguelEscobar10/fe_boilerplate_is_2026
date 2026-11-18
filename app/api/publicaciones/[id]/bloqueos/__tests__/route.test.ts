// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listar, POST as crear } from "../route";
import { GET as disponibilidad } from "../../disponibilidad/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn(), deleteSession: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const ID = "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6";
const params = { params: Promise.resolve({ id: ID }) };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

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

describe("GET /api/publicaciones/:id/disponibilidad", () => {
  it("reenvía solo desde y hasta", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ocupados: [] }));

    const res = await disponibilidad(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/disponibilidad?desde=2026-11-01&hasta=2026-11-30&x=1`),
      params,
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://backend.test/api/v1/publicaciones/${ID}/disponibilidad?desde=2026-11-01&hasta=2026-11-30`,
    );
    expect(res.status).toBe(200);
  });

  it("es pública: sin sesión llama igual, sin token", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    fetchMock.mockResolvedValue(jsonResponse({ ocupados: [] }));

    const res = await disponibilidad(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/disponibilidad?desde=2026-11-01&hasta=2026-11-30`),
      params,
    );

    expect(res.status).toBe(200);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBeNull();
  });

  it("pasa el 400 del backend y da 502 si no responde", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: 400 }, 400));
    const req = () => new NextRequest(`http://localhost/api/publicaciones/${ID}/disponibilidad`);
    expect((await disponibilidad(req(), params)).status).toBe(400);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await disponibilidad(req(), params)).status).toBe(502);
  });
});

describe("/api/publicaciones/:id/bloqueos", () => {
  it("GET reenvía con el token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));

    await listar(new NextRequest(`http://localhost/api/publicaciones/${ID}/bloqueos`), params);

    expect(String(fetchMock.mock.calls[0][0])).toBe(`http://backend.test/api/v1/publicaciones/${ID}/bloqueos`);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token-123");
  });

  it("POST reenvía solo inicio, fin y motivo", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "b-1" }, 201));

    const res = await crear(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/bloqueos`, {
        method: "POST",
        body: JSON.stringify({ inicio: "a", fin: "b", motivo: "m", creadoPor: "yo" }),
      }),
      params,
    );

    expect(res.status).toBe(201);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ inicio: "a", fin: "b", motivo: "m" });
  });

  it("POST con un cuerpo que no es JSON: 400 sin llamar al backend", async () => {
    const res = await crear(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/bloqueos`, { method: "POST", body: "x" }),
      params,
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pasa el 409 del backend con su codigo", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 409, codigo: "RANGO_CON_RESERVA" }, 409));

    const res = await crear(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/bloqueos`, {
        method: "POST",
        body: JSON.stringify({ inicio: "a", fin: "b" }),
      }),
      params,
    );

    expect(res.status).toBe(409);
    expect((await res.json()).codigo).toBe("RANGO_CON_RESERVA");
  });
});
