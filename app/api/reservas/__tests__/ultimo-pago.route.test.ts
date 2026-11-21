// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../[id]/pagos/ultimo/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function consultar(id = ID) {
  return GET(new NextRequest(`http://localhost/api/reservas/${id}/pagos/ultimo`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue("token-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GET /api/reservas/[id]/pagos/ultimo", () => {
  it("consulta al backend con el token y devuelve su respuesta", async () => {
    const pago = { pagoId: "p1", reservaId: ID, estado: "APROBADO" };
    fetchMock.mockResolvedValue(json(pago));

    const res = await consultar();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(pago);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`http://backend.test/api/v1/reservas/${ID}/pagos/ultimo`);
    expect((init?.method ?? "GET").toUpperCase()).toBe("GET");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
  });

  it("conserva el 404 con PAGO_NO_REGISTRADO", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 404, codigo: "PAGO_NO_REGISTRADO" }, 404));

    const res = await consultar();

    expect(res.status).toBe(404);
    expect((await res.json()).codigo).toBe("PAGO_NO_REGISTRADO");
  });

  it("sin sesión responde 401 sin llamar al backend", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await consultar();

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("codifica el id en la ruta", async () => {
    fetchMock.mockResolvedValue(json({}, 404));

    await consultar("a/b");

    expect(String(fetchMock.mock.calls[0][0])).toContain("reservas/a%2Fb/pagos/ultimo");
  });
});
