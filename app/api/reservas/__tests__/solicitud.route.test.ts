// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const BODY = {
  publicacionId: "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6",
  inicio: "2026-11-18T09:00:00-06:00",
  fin: "2026-11-18T12:00:00-06:00",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function solicitar(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue("token-123");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/reservas", () => {
  it("reenvía la solicitud al backend con el token y devuelve su 201", async () => {
    const reserva = { id: "r1", estado: "PENDIENTE", costoAlquiler: "45.00", depositoMonto: "20.00" };
    fetchMock.mockResolvedValue(json(reserva, 201));

    const res = await solicitar(BODY);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(reserva);
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://backend.test/api/v1/reservas");
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(JSON.parse(String(init?.body))).toEqual(BODY);
  });

  it("descarta montos, estado y cualquier otro campo: los calcula el backend", async () => {
    fetchMock.mockResolvedValue(json({}, 201));

    await solicitar({ ...BODY, costoAlquiler: "1.00", depositoMonto: "0.00", estado: "CONFIRMADA" });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(BODY);
  });

  it("no manda campos que no son texto", async () => {
    fetchMock.mockResolvedValue(json({}, 201));

    await solicitar({ ...BODY, inicio: 123 });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      publicacionId: BODY.publicacionId,
      fin: BODY.fin,
    });
  });

  it("devuelve tal cual los errores del backend, con su código", async () => {
    const cuerpo = { statusCode: 409, codigo: "PERIODO_NO_DISPONIBLE", message: "No disponible" };
    fetchMock.mockResolvedValue(json(cuerpo, 409));

    const res = await solicitar(BODY);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(cuerpo);
  });

  it("400 si el cuerpo no es un JSON o no es un objeto, sin llamar al backend", async () => {
    expect((await solicitar("no es json")).status).toBe(400);
    expect((await solicitar("[1,2]")).status).toBe(400);
    expect((await solicitar("null")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 sin sesión y sin llamar al backend", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await solicitar(BODY);

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("borra la cookie si el backend responde 401", async () => {
    fetchMock.mockResolvedValue(json({}, 401));

    const res = await solicitar(BODY);

    expect(res.status).toBe(401);
    expect(deleteSession).toHaveBeenCalled();
  });

  it("502 si el backend no responde", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    expect((await solicitar(BODY)).status).toBe(502);
  });
});
