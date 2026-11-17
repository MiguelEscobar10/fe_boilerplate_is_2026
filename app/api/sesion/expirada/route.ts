import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/session";

/**
 * Cierra una sesión vencida y manda al login.
 *
 * Un Server Component no puede borrar cookies. Si el token ya venció (el JWT
 * dura 15 min y la cookie 7 días), requireUser() redirige aquí: se borra la
 * cookie y recién entonces se va a /login. Sin esto, proxy.ts vería la cookie
 * en /login y devolvería a /, y el navegador entraría en un bucle de
 * redirecciones. Vive bajo /api para que proxy.ts no la intercepte.
 */
export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.nextUrl));
}
