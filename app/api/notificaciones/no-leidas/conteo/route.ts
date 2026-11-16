import { reenviarAlBackend } from "@/lib/backend";

export async function GET() {
  return reenviarAlBackend("notificaciones/no-leidas/conteo");
}
