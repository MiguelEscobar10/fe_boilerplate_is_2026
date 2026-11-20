// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../[id]/calificacion/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const ctx = { params: Promise.resolve({ id: ID }) };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function calificar(body: unknown) {
  return POST(
    new NextRequest(`http://localhost/api/reservas/${ID}/calificacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx,
  );
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

describe("POST /api/reservas/[id]/calificacion", () => {
  it("reenvía solo los tres campos permitidos, con el token", async () => {
    fetchMock.mockResolvedValue(json({ id: "c1" }, 201));

    const res = await calificar({
      puntajeBien: 4,
      puntajeArrendador: 5,
      comentario: "Todo en orden",
      arrendadorId: "x",
      listingId: "y",
    });

    expect(res.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`http://backend.test/api/v1/reservas/${ID}/calificacion`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      puntajeBien: 4,
      puntajeArrendador: 5,
      comentario: "Todo en orden",
    });
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-123");
  });

  it("sin comentario no lo envía", async () => {
    fetchMock.mockResolvedValue(json({ id: "c1" }, 201));

    await calificar({ puntajeBien: 4, puntajeArrendador: 5 });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      puntajeBien: 4,
      puntajeArrendador: 5,
    });
  });

  it("conserva el 409 y el 422 del backend", async () => {
    fetchMock.mockResolvedValueOnce(json({ codigo: "RESERVA_YA_CALIFICADA" }, 409));
    fetchMock.mockResolvedValueOnce(json({ codigo: "RESERVA_NO_COMPLETADA" }, 422));

    const a = await calificar({ puntajeBien: 4, puntajeArrendador: 5 });
    const b = await calificar({ puntajeBien: 4, puntajeArrendador: 5 });

    expect([a.status, b.status]).toEqual([409, 422]);
    expect((await a.json()).codigo).toBe("RESERVA_YA_CALIFICADA");
  });

  it.each(["no es json", "[1,2]", "null", "7"])("rechaza el cuerpo %s con 400", async (cuerpo) => {
    const res = await calificar(cuerpo);

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401 sin llamar al backend", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await calificar({ puntajeBien: 4, puntajeArrendador: 5 });

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/reservas/[id]/calificacion", () => {
  const consultar = () =>
    GET(new NextRequest(`http://localhost/api/reservas/${ID}/calificacion`), ctx);

  it("consulta al backend y devuelve su respuesta", async () => {
    fetchMock.mockResolvedValue(json({ id: "c1", puntajeBien: 4, puntajeArrendador: 5 }));

    const res = await consultar();

    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://backend.test/api/v1/reservas/${ID}/calificacion`,
    );
    expect(await res.json()).toMatchObject({ id: "c1" });
  });

  it("conserva el 404 con CALIFICACION_NO_REGISTRADA", async () => {
    fetchMock.mockResolvedValue(json({ codigo: "CALIFICACION_NO_REGISTRADA" }, 404));

    const res = await consultar();

    expect(res.status).toBe(404);
    expect((await res.json()).codigo).toBe("CALIFICACION_NO_REGISTRADA");
  });
});
