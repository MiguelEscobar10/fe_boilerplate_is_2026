// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../ocupacion/route";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(getSession).mockResolvedValue("token-123");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllEnvs();
});

const pedir = (query: string) => GET(new NextRequest(`http://localhost/api/reportes/ocupacion${query}`));

describe("GET /api/reportes/ocupacion", () => {
  it("reenvía solo desde y hasta con el token", async () => {
    fetchMock.mockResolvedValue(Response.json({ desde: "a", hasta: "b", items: [] }));

    const res = await pedir("?desde=2026-11-01&hasta=2026-11-30&landlordId=otro");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://backend.test/api/v1/reportes/ocupacion?desde=2026-11-01&hasta=2026-11-30",
    );
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(res.status).toBe(200);
  });

  it("sin fechas no agrega query (el backend usa el mes en curso)", async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [] }));
    await pedir("");
    expect(String(fetchMock.mock.calls[0][0])).toBe("http://backend.test/api/v1/reportes/ocupacion");
  });

  it("devuelve tal cual el 403 del backend y 401 sin sesión", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Forbidden resource" }, { status: 403 }));
    expect((await pedir("?desde=2026-11-01")).status).toBe(403);

    vi.mocked(getSession).mockResolvedValueOnce(undefined);
    expect((await pedir("")).status).toBe(401);
  });
});
