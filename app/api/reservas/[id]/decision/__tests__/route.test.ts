// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as decidir } from "../route";
import { GET as listar } from "@/app/api/arrendador/solicitudes/route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "0b9d8c7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function patch(body: string) {
  return decidir(
    new NextRequest(`http://localhost/api/reservas/${ID}/decision`, {
      method: "PATCH",
      body,
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ id: ID }) },
  );
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

describe("GET /api/arrendador/solicitudes", () => {
  it("reenvía solo estado, page y limit, con el token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, limit: 12 }));

    const res = await listar(
      new NextRequest(
        "http://localhost/api/arrendador/solicitudes?estado=PENDIENTE&page=2&limit=12&otro=x",
      ),
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://backend.test/api/v1/arrendador/solicitudes?estado=PENDIENTE&page=2&limit=12",
    );
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
    expect(res.status).toBe(200);
  });

  it("sin parámetros no agrega `?`", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, limit: 12 }));

    await listar(new NextRequest("http://localhost/api/arrendador/solicitudes"));

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://backend.test/api/v1/arrendador/solicitudes",
    );
  });

  it("401 sin sesión, sin llamar al backend", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await listar(new NextRequest("http://localhost/api/arrendador/solicitudes"));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/reservas/:id/decision", () => {
  it("reenvía decision y motivo como JSON y devuelve la respuesta del backend", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: ID, estado: "RECHAZADA", decididaAt: "x", motivoRechazo: "Viaje" }),
    );

    const res = await patch(JSON.stringify({ decision: "RECHAZAR", motivo: "Viaje" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`http://backend.test/api/v1/reservas/${ID}/decision`);
    expect(init?.method).toBe("PATCH");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(JSON.parse(String(init?.body))).toEqual({ decision: "RECHAZAR", motivo: "Viaje" });
    expect(res.status).toBe(200);
    expect((await res.json()).estado).toBe("RECHAZADA");
  });

  it("no reenvía propiedades de más", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await patch(JSON.stringify({ decision: "APROBAR", estado: "CONFIRMADA" }));

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      decision: "APROBAR",
    });
  });

  it("pasa el 409 del backend tal cual, con su codigo", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 409, codigo: "CONFLICTO_DISPONIBILIDAD", message: "..." }, 409),
    );

    const res = await patch(JSON.stringify({ decision: "APROBAR" }));

    expect(res.status).toBe(409);
    expect((await res.json()).codigo).toBe("CONFLICTO_DISPONIBILIDAD");
  });

  it.each(["no es json", "null", "3"])("400 con un cuerpo que no sirve (%s)", async (body) => {
    const res = await patch(body);

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 del backend borra la sesión", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 401 }, 401));

    const res = await patch(JSON.stringify({ decision: "APROBAR" }));

    expect(res.status).toBe(401);
    expect(deleteSession).toHaveBeenCalled();
  });

  it("502 si el backend no responde", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const res = await patch(JSON.stringify({ decision: "APROBAR" }));

    expect(res.status).toBe(502);
  });
});
