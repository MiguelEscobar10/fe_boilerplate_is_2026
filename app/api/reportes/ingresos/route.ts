import type { NextRequest } from "next/server";
import { reenviarAlBackend } from "@/lib/backend";

// Solo se reenvían las fechas. El arrendador sale del token en el backend, y
// cualquier otro parámetro (p. ej. arrendadorId) se descarta aquí; el backend
// además lo rechazaría con 400 (forbidNonWhitelisted).
const PARAMETROS_PERMITIDOS = ["desde", "hasta"] as const;

export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  for (const nombre of PARAMETROS_PERMITIDOS) {
    const valor = request.nextUrl.searchParams.get(nombre);
    if (valor !== null) query.set(nombre, valor);
  }
  const qs = query.toString();
  return reenviarAlBackend(`reportes/ingresos${qs ? `?${qs}` : ""}`);
}
