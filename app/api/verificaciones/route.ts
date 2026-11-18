import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

// El backend responde 400 a cualquier parámetro que no conozca
// (forbidNonWhitelisted), así que solo se reenvía `estado`.
export async function GET(request: NextRequest) {
  const estado = request.nextUrl.searchParams.get("estado");
  const qs = estado !== null ? `?${new URLSearchParams({ estado })}` : "";
  return reenviarAlBackend(`verificaciones${qs}`);
}
