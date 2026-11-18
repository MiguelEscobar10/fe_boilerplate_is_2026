// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../[id]/pagos/simulados/route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const TARJETA = { numeroTarjeta: "4242424242424242", vencimiento: "12/28", cvv: "987" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function peticion(body: unknown) {
  return new NextRequest(`http://localhost/api/reservas/${ID}/pagos/simulados`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function pagar(body: unknown) {
  return POST(peticion(body), { params: Promise.resolve({ id: ID }) });
}

function bodyEnviado() {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

const consola = {
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue("token-123");
  for (const metodo of Object.keys(consola) as (keyof typeof consola)[]) {
    vi.spyOn(console, metodo).mockImplementation(consola[metodo]);
  }
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

describe("POST /api/reservas/[id]/pagos/simulados", () => {
  it("reenvía la tarjeta al backend con el token de la sesión", async () => {
    const pago = { pagoId: "p1", reservaId: ID, montoTotal: "50.05", estado: "APROBADO", simulado: true, intento: 1 };
    fetchMock.mockResolvedValue(jsonResponse(pago, 201));

    const res = await pagar(TARJETA);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(pago);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://backend.test/api/v1/reservas/${ID}/pagos/simulados`,
    );
    const init = fetchMock.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(bodyEnviado()).toEqual(TARJETA);
  });

  it("descarta montos y cualquier otro campo extra", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 201));

    await pagar({ ...TARJETA, monto: "0.01", montoTotal: "0.01", escenario: "APROBADO" });

    expect(bodyEnviado()).toEqual(TARJETA);
    expect(Object.keys(bodyEnviado()).sort()).toEqual(["cvv", "numeroTarjeta", "vencimiento"]);
  });

  it("devuelve tal cual los errores con codigo del backend", async () => {
    const error = {
      statusCode: 409,
      message: "Ya se usaron los 3 intentos de pago de esta reserva.",
      error: "Conflict",
      codigo: "INTENTOS_AGOTADOS",
    };
    fetchMock.mockResolvedValue(jsonResponse(error, 409));

    const res = await pagar(TARJETA);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual(error);
  });

  it("responde 401 y borra la cookie si el backend dice que la sesión venció", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 401 }, 401));

    const res = await pagar(TARJETA);

    expect(res.status).toBe(401);
    expect(deleteSession).toHaveBeenCalled();
  });

  it("responde 401 sin llamar al backend si no hay sesión", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await pagar(TARJETA);

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("responde 400 sin llamar al backend si el body no es JSON", async () => {
    const res = await pagar("no es json");

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no escribe la tarjeta en la consola, ni siquiera si el backend no responde", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const res = await pagar(TARJETA);

    expect(res.status).toBe(502);
    const escrito = Object.values(consola)
      .flatMap((fn) => fn.mock.calls.flat())
      .map((arg) => String(arg))
      .join(" ");
    expect(escrito).not.toContain(TARJETA.numeroTarjeta);
    expect(escrito).not.toContain("4242");
    expect(escrito).not.toContain(TARJETA.cvv);
  });
});
