// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
// redirect() de Next corta el render lanzando un error; aquí se imita igual.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const fetchMock = vi.fn<typeof fetch>();

async function cargarDal() {
  // getCurrentUser usa cache() de React: se importa de nuevo en cada prueba.
  vi.resetModules();
  return import("../dal");
}

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

describe("requireUser", () => {
  it("devuelve el usuario si /auth/me responde 200", async () => {
    vi.mocked(getSession).mockResolvedValue("token-ok");
    fetchMock.mockResolvedValue(
      Response.json({ id: "1", email: "a@a.a", rol: "ARRENDADOR", nombre: "Lee", telefono: null }),
    );
    const { requireUser } = await cargarDal();

    await expect(requireUser()).resolves.toMatchObject({ rol: "ARRENDADOR" });
  });

  it("sin cookie manda directo a /login", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    const { requireUser } = await cargarDal();

    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con el token vencido (401) pasa por /api/sesion/expirada para borrar la cookie", async () => {
    vi.mocked(getSession).mockResolvedValue("token-vencido");
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    const { requireUser } = await cargarDal();

    await expect(requireUser()).rejects.toThrow("REDIRECT:/api/sesion/expirada");
  });
});
