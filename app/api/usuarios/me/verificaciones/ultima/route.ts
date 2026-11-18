import { reenviarAlBackend } from "@/lib/backend";

export async function GET() {
  return reenviarAlBackend("usuarios/me/verificaciones/ultima");
}
