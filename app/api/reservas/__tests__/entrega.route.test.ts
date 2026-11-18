// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as consultar, POST as registrar } from "../[id]/entrega/route";
import { GET as foto } from "../[id]/entrega/fotos/[orden]/route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const llamada = () => fetchMock.mock.calls[0];

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

describe("route handlers de entrega", () => {
  it("POST reenvía solo nota y fotos con el token", async () => {
    fetchMock.mockResolvedValue(json({ entregaId: "e", reservaId: ID, estadoReserva: "EN_CURSO" }, 201));
    const datos = new FormData();
    datos.append("nota", "Completo");
    datos.append("fotos", new File(["x"], "a.jpg", { type: "image/jpeg" }));
    datos.append("fotos", new File(["y"], "b.png", { type: "image/png" }));
    datos.append("registradaPor", "otro");

    const res = await registrar(
      new NextRequest(`http://localhost/api/reservas/${ID}/entrega`, { method: "POST", body: datos }),
      { params: Promise.resolve({ id: ID }) },
    );

    expect(String(llamada()[0])).toBe(`http://backend.test/api/v1/reservas/${ID}/entrega`);
    expect(new Headers(llamada()[1]?.headers).get("Authorization")).toBe("Bearer token-123");
    const reenviado = llamada()[1]?.body as FormData;
    expect([...new Set(reenviado.keys())]).toEqual(["nota", "fotos"]);
    expect(reenviado.getAll("fotos")).toHaveLength(2);
    expect(res.status).toBe(201);
  });

  it("POST devuelve tal cual el 422 del backend", async () => {
    fetchMock.mockResolvedValue(json({ codigo: "ENTREGA_NO_HABILITADA", disponibleDesde: "x" }, 422));
    const datos = new FormData();
    datos.append("nota", "Completo");

    const res = await registrar(
      new NextRequest(`http://localhost/api/reservas/${ID}/entrega`, { method: "POST", body: datos }),
      { params: Promise.resolve({ id: ID }) },
    );

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ codigo: "ENTREGA_NO_HABILITADA" });
  });

  it("GET reenvía la consulta de la entrega", async () => {
    fetchMock.mockResolvedValue(json({ entregaId: "e" }));

    const res = await consultar(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ id: ID }),
    });

    expect(String(llamada()[0])).toBe(`http://backend.test/api/v1/reservas/${ID}/entrega`);
    expect(res.status).toBe(200);
  });

  it("la foto se devuelve como binario, sin caché", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    fetchMock.mockResolvedValue(new Response(bytes, { headers: { "Content-Type": "image/jpeg" } }));

    const res = await foto(new NextRequest("http://localhost/x"), {
      params: Promise.resolve({ id: ID, orden: "0" }),
    });

    expect(String(llamada()[0])).toBe(`http://backend.test/api/v1/reservas/${ID}/entrega/fotos/0`);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it("la foto: 401 sin sesión, borra la cookie si el backend da 401, 404 tal cual", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(undefined);
    const ctx = { params: Promise.resolve({ id: ID, orden: "0" }) };
    expect((await foto(new NextRequest("http://localhost/x"), ctx)).status).toBe(401);

    fetchMock.mockResolvedValueOnce(json({ message: "Expiró" }, 401));
    expect((await foto(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: ID, orden: "0" }) })).status).toBe(401);
    expect(deleteSession).toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(json({ message: "No" }, 404));
    expect((await foto(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: ID, orden: "9" }) })).status).toBe(404);
  });
});
