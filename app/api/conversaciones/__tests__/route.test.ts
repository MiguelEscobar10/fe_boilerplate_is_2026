// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as historial, POST as enviar } from "../[id]/mensajes/route";
import { POST as abrir } from "../../reservas/[id]/conversacion/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const RESERVA = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const CONVERSACION = "3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const llamada = () => fetchMock.mock.calls[0];
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

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

describe("route handlers de la conversación de la reserva", () => {
  it("POST /reservas/{id}/conversacion reenvía sin cuerpo y devuelve el status del backend", async () => {
    fetchMock.mockResolvedValue(
      json(
        { id: CONVERSACION, estadoReserva: "CONFIRMADA", puedeEscribir: true },
        201,
      ),
    );

    const res = await abrir(
      new NextRequest(`http://localhost/api/reservas/${RESERVA}/conversacion`, {
        method: "POST",
        body: JSON.stringify({ tenantId: "otro" }),
      }),
      ctx(RESERVA),
    );

    expect(String(llamada()[0])).toBe(
      `http://backend.test/api/v1/reservas/${RESERVA}/conversacion`,
    );
    expect(llamada()[1]?.method).toBe("POST");
    expect(llamada()[1]?.body).toBeUndefined();
    expect(new Headers(llamada()[1]?.headers).get("Authorization")).toBe(
      "Bearer token-123",
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ puedeEscribir: true });
  });

  it("pasa el 409 con su código tal cual", async () => {
    fetchMock.mockResolvedValue(
      json({ statusCode: 409, codigo: "CONVERSACION_NO_HABILITADA" }, 409),
    );

    const res = await abrir(
      new NextRequest(`http://localhost/api/reservas/${RESERVA}/conversacion`, {
        method: "POST",
      }),
      ctx(RESERVA),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      codigo: "CONVERSACION_NO_HABILITADA",
    });
  });

  it("GET de mensajes solo reenvía page y limit", async () => {
    fetchMock.mockResolvedValue(
      json({ items: [], page: 2, limit: 50, total: 60 }),
    );

    await historial(
      new NextRequest(
        `http://localhost/api/conversaciones/${CONVERSACION}/mensajes?page=2&limit=50&autorId=x`,
      ),
      ctx(CONVERSACION),
    );

    const url = new URL(String(llamada()[0]));
    expect(url.pathname).toBe(
      `/api/v1/conversaciones/${CONVERSACION}/mensajes`,
    );
    expect([...url.searchParams.keys()].sort()).toEqual(["limit", "page"]);
  });

  it("POST de mensajes solo reenvía el contenido", async () => {
    fetchMock.mockResolvedValue(
      json({ id: "m-1", createdAt: "2026-12-01T15:00:00.000Z" }, 201),
    );

    const res = await enviar(
      new NextRequest(
        `http://localhost/api/conversaciones/${CONVERSACION}/mensajes`,
        {
          method: "POST",
          body: JSON.stringify({ contenido: "Hola", autorId: "otro" }),
        },
      ),
      ctx(CONVERSACION),
    );

    expect(res.status).toBe(201);
    expect(JSON.parse(String(llamada()[1]?.body))).toEqual({
      contenido: "Hola",
    });
  });

  it("POST de mensajes con un cuerpo que no es JSON responde 400 sin llamar al backend", async () => {
    const res = await enviar(
      new NextRequest(
        `http://localhost/api/conversaciones/${CONVERSACION}/mensajes`,
        {
          method: "POST",
          body: "no-json",
        },
      ),
      ctx(CONVERSACION),
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401 sin llamar al backend", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await abrir(
      new NextRequest(`http://localhost/api/reservas/${RESERVA}/conversacion`, {
        method: "POST",
      }),
      ctx(RESERVA),
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
