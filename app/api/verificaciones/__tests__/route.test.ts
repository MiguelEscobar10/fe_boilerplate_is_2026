// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as cola } from "../route";
import { PATCH as decidir } from "../[id]/decision/route";
import { GET as documento } from "../[id]/documento/route";
import { POST as enviar } from "../../usuarios/me/verificaciones/route";
import { GET as ultima } from "../../usuarios/me/verificaciones/ultima/route";
import { deleteSession, getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();
const ID = "0b9d8c7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e";
const params = (id = ID) => ({ params: Promise.resolve({ id }) });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const llamada = () => fetchMock.mock.calls[0];
const urlLlamada = () => String(llamada()[0]);
const headersLlamada = () => new Headers(llamada()[1]?.headers);

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

describe("route handlers de verificación", () => {
  it("POST reenvía solo el campo documento con el token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: ID, estado: "PENDIENTE" }, 201));
    const datos = new FormData();
    datos.append("documento", new File(["%PDF-1.4"], "dui.pdf", { type: "application/pdf" }));
    datos.append("userId", "otro");

    const res = await enviar(
      new Request("http://localhost/api/usuarios/me/verificaciones", { method: "POST", body: datos }),
    );

    expect(urlLlamada()).toBe("http://backend.test/api/v1/usuarios/me/verificaciones");
    expect(llamada()[1]?.method).toBe("POST");
    expect(headersLlamada().get("Authorization")).toBe("Bearer token-123");
    const reenviado = llamada()[1]?.body as FormData;
    expect([...reenviado.keys()]).toEqual(["documento"]);
    expect((reenviado.get("documento") as File).name).toBe("dui.pdf");
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, estado: "PENDIENTE" });
  });

  it("POST devuelve tal cual el 409 del backend", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 409, message: "Ya hay una" }, 409));
    const datos = new FormData();
    datos.append("documento", new File(["x"], "dui.pdf"));

    const res = await enviar(
      new Request("http://localhost/api/usuarios/me/verificaciones", { method: "POST", body: datos }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ message: "Ya hay una" });
  });

  it("GET ultima reenvía al backend y devuelve el 404 si no hay solicitudes", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ statusCode: 404, message: "No" }, 404));

    const res = await ultima();

    expect(urlLlamada()).toBe("http://backend.test/api/v1/usuarios/me/verificaciones/ultima");
    expect(res.status).toBe(404);
  });

  it("GET cola reenvía solo estado", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await cola(new NextRequest("http://localhost/api/verificaciones?estado=PENDIENTE&userId=otro"));

    const url = new URL(urlLlamada());
    expect(url.pathname).toBe("/api/v1/verificaciones");
    expect(Object.fromEntries(url.searchParams)).toEqual({ estado: "PENDIENTE" });
  });

  it("PATCH decisión reenvía el JSON con el id codificado", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: ID, estado: "RECHAZADA" }));
    const body = JSON.stringify({ decision: "RECHAZAR", motivo: "Ilegible" });

    const res = await decidir(
      new NextRequest(`http://localhost/api/verificaciones/${ID}/decision`, { method: "PATCH", body }),
      params(),
    );

    expect(urlLlamada()).toBe(`http://backend.test/api/v1/verificaciones/${ID}/decision`);
    expect(llamada()[1]?.method).toBe("PATCH");
    expect(llamada()[1]?.body).toBe(body);
    expect(headersLlamada().get("Content-Type")).toBe("application/json");
    expect(res.status).toBe(200);
  });

  describe("documento", () => {
    it("devuelve el binario con su tipo y sin caché", async () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0x00]);
      fetchMock.mockResolvedValue(
        new Response(bytes, { status: 200, headers: { "Content-Type": "application/pdf" } }),
      );

      const res = await documento(new NextRequest("http://localhost/x"), params());

      expect(urlLlamada()).toBe(`http://backend.test/api/v1/verificaciones/${ID}/documento`);
      expect(headersLlamada().get("Authorization")).toBe("Bearer token-123");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    });

    it("pasa el 403 del backend a quien no es REVISOR", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ statusCode: 403, message: "Prohibido" }, 403));

      const res = await documento(new NextRequest("http://localhost/x"), params());

      expect(res.status).toBe(403);
      expect(res.headers.get("Cache-Control")).toBeNull();
    });

    it("responde 401 sin llamar al backend si no hay sesión", async () => {
      vi.mocked(getSession).mockResolvedValue(undefined);

      const res = await documento(new NextRequest("http://localhost/x"), params());

      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("borra la cookie si el backend responde 401", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: "Expiró" }, 401));

      const res = await documento(new NextRequest("http://localhost/x"), params());

      expect(res.status).toBe(401);
      expect(deleteSession).toHaveBeenCalled();
    });

    it("responde 502 si el backend no responde", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      const res = await documento(new NextRequest("http://localhost/x"), params());

      expect(res.status).toBe(502);
    });
  });
});

describe("route handler de requiere verificación", () => {
  it("PATCH reenvía el JSON a /publicaciones/{id}/requiere-verificacion", async () => {
    const { PATCH } = await import("../../publicaciones/[id]/requiere-verificacion/route");
    fetchMock.mockResolvedValue(jsonResponse({ id: ID, requiereVerificacion: true }));
    const body = JSON.stringify({ requiereVerificacion: true });

    const res = await PATCH(
      new NextRequest(`http://localhost/api/publicaciones/${ID}/requiere-verificacion`, { method: "PATCH", body }),
      params(),
    );

    expect(urlLlamada()).toBe(`http://backend.test/api/v1/publicaciones/${ID}/requiere-verificacion`);
    expect(llamada()[1]?.body).toBe(body);
    expect(headersLlamada().get("Authorization")).toBe("Bearer token-123");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: ID, requiereVerificacion: true });
  });
});
