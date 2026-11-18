import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

// Reenvía solo `desde` y `hasta`: el backend responde 400 a otros parámetros.
export async function GET(request: NextRequest) {
  const entrada = request.nextUrl.searchParams;
  const salida = new URLSearchParams();
  for (const clave of ["desde", "hasta"]) {
    const valor = entrada.get(clave);
    if (valor) salida.set(clave, valor);
  }
  const query = salida.size ? `?${salida}` : "";
  return reenviarAlBackend(`reportes/ocupacion${query}`);
}
