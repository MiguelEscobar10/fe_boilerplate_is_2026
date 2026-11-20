import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

const CAMPOS = ["publicacionId", "inicio", "fin"] as const;

function cuerpoInvalido() {
  return Response.json(
    { statusCode: 400, message: "El cuerpo debe ser un JSON." },
    { status: 400 },
  );
}

/**
 * Reenvía la solicitud de reserva al backend con el token de la sesión. Solo
 * pasan `publicacionId`, `inicio` y `fin`: cualquier otro campo (un monto, un
 * estado...) se descarta, porque el costo y el depósito los calcula el backend
 * con la tarifa de la publicación.
 */
export async function POST(request: NextRequest) {
  let entrada: unknown;
  try {
    entrada = await request.json();
  } catch {
    return cuerpoInvalido();
  }
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) {
    return cuerpoInvalido();
  }

  const datos: Record<string, string> = {};
  for (const campo of CAMPOS) {
    const valor = (entrada as Record<string, unknown>)[campo];
    if (typeof valor === "string") datos[campo] = valor;
  }

  return reenviarAlBackend("reservas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}
