// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listar } from "../route";
import { GET as contar } from "../no-leidas/conteo/route";
import { PATCH as marcarLeida } from "../[id]/leida/route";
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

function urlLlamada() {
  return String(fetchMock.mock.calls[0][0]);
}

function headersLlamada() {
  return new Headers(fetchMock.mock.calls[0][1]?.headers);
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

describe("route handlers de notificaciones", () => {
  it("responde 401 sin llamar al backend si no hay sesión", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const res = await contar();

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reenvía el conteo con el token como Bearer", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ noLeidas: 3 }));

    const res = await contar();

    expect(urlLlamada()).toBe(
      "http://backend.test/api/v1/notificaciones/no-leidas/conteo",
    );
    expect(headersLlamada().get("Authorization")).toBe("Bearer token-123");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ noLeidas: 3 });
  });

  it("reenvía solo soloNoLeidas, page y limit en el listado", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }));

    await listar(
      new NextRequest(
        "http://localhost/api/notificaciones?soloNoLeidas=true&page=2&limit=20&userId=otro",
      ),
    );

    const url = new URL(urlLlamada());
    expect(url.pathname).toBe("/api/v1/notificaciones");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      soloNoLeidas: "true",
      page: "2",
      limit: "20",
    });
  });

  it("marca como leída con PATCH sobre el id", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: ID, leidaAt: "2026-11-15T10:00:00.000Z" }));

    const res = await marcarLeida(
      new NextRequest(`http://localhost/api/notificaciones/${ID}/leida`, {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: ID }) },
    );

    expect(urlLlamada()).toBe(
      `http://backend.test/api/v1/notificaciones/${ID}/leida`,
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(res.status).toBe(200);
  });

  it("devuelve el 404 del backend tal cual", async () => {
    const cuerpo = {
      statusCode: 404,
      message: "La notificación no existe.",
      error: "Not Found",
    };
    fetchMock.mockResolvedValue(jsonResponse(cuerpo, 404));

    const res = await marcarLeida(
      new NextRequest(`http://localhost/api/notificaciones/${ID}/leida`, {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: ID }) },
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(cuerpo);
  });

  it("borra la sesión y responde 401 si el backend rechaza el token", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 401, message: "Unauthorized" }, 401),
    );

    const res = await contar();

    expect(res.status).toBe(401);
    expect(deleteSession).toHaveBeenCalledOnce();
  });

  it("responde 502 si el backend no responde", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const res = await contar();

    expect(res.status).toBe(502);
    expect(deleteSession).not.toHaveBeenCalled();
  });
});
