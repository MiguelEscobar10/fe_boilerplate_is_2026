// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { deleteSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ deleteSession: vi.fn() }));

describe("GET /api/sesion/expirada", () => {
  it("borra la cookie de sesión y manda a /login", async () => {
    const res = await GET(new NextRequest("http://localhost:3001/api/sesion/expirada"));

    expect(deleteSession).toHaveBeenCalledOnce();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3001/login");
  });
});
