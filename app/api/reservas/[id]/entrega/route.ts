import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

const ruta = (id: string) => `reservas/${encodeURIComponent(id)}/entrega`;

// Reenvía solo `nota` y `fotos`: el backend responde 400 a otros campos.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/entrega">,
) {
  const { id } = await ctx.params;
  let entrada: FormData;
  try {
    entrada = await request.formData();
  } catch {
    return Response.json(
      { statusCode: 400, message: "Escribe la nota del estado inicial." },
      { status: 400 },
    );
  }
  const salida = new FormData();
  const nota = entrada.get("nota");
  if (nota !== null) salida.append("nota", nota);
  for (const foto of entrada.getAll("fotos")) salida.append("fotos", foto);

  return reenviarAlBackend(ruta(id), { method: "POST", body: salida });
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/reservas/[id]/entrega">,
) {
  const { id } = await ctx.params;
  return reenviarAlBackend(ruta(id));
}
