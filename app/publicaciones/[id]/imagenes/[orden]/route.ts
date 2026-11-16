import { apiUrl } from "@/lib/api";

// Reenvía la foto desde el backend. Así el navegador no necesita conocer la URL
// interna de la API (API_URL) y las fotos salen del mismo origen que la página.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/publicaciones/[id]/imagenes/[orden]">,
) {
  const { id, orden } = await ctx.params;
  const res = await fetch(
    apiUrl(`publicaciones/${encodeURIComponent(id)}/imagenes/${encodeURIComponent(orden)}`),
    { cache: "no-store" },
  );
  if (!res.ok || !res.body) {
    return new Response(null, { status: res.status === 404 ? 404 : 502 });
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
