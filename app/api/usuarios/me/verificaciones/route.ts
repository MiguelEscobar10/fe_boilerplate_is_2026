import { reenviarAlBackend } from "@/lib/backend";

// Reenvía solo el campo `documento`: el backend responde 400 a un archivo en
// otro campo y así no viaja nada más del formulario.
export async function POST(request: Request) {
  let entrada: FormData;
  try {
    entrada = await request.formData();
  } catch {
    return Response.json(
      { statusCode: 400, message: "Adjunta tu documento de identidad." },
      { status: 400 },
    );
  }

  const salida = new FormData();
  const documento = entrada.get("documento");
  if (documento !== null) salida.append("documento", documento);

  return reenviarAlBackend("usuarios/me/verificaciones", {
    method: "POST",
    body: salida,
  });
}
