// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as calificar } from "../route";
import { getSession } from "@/lib/session";

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

function post(body: string) {
  return calificar(
    new NextRequest(`http://localhost/api/reservas/${ID}/calificacion-arrendatario`, {
      method: "POST",
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

describe("POST /api/reservas/:id/calificacion-arrendatario", () => {
  it("reenvía puntaje y comentario con el token y devuelve el 201", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "c-1" }, 201));

    const res = await post(JSON.stringify({ puntaje: 5, comentario: "Puntual" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      `http://backend.test/api/v1/reservas/${ID}/calificacion-arrendatario`,
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(JSON.parse(String(init?.body))).toEqual({ puntaje: 5, comentario: "Puntual" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "c-1" });
  });

  it("no reenvía propiedades de más", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "c-1" }, 201));

    await post(JSON.stringify({ puntaje: 4, arrendatarioId: "otro" }));

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ puntaje: 4 });
  });

  it.each([
    [409, "RESERVA_YA_CALIFICADA"],
    [422, "RESERVA_NO_COMPLETADA"],
  ])("pasa el %i del backend con su codigo", async (status, codigo) => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: status, codigo }, status));

    const res = await post(JSON.stringify({ puntaje: 5 }));

    expect(res.status).toBe(status);
    expect((await res.json()).codigo).toBe(codigo);
  });

  it("400 con un cuerpo que no es JSON, sin llamar al backend", async () => {
    const res = await post("no es json");

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 sin sesión", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await post(JSON.stringify({ puntaje: 5 }));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
