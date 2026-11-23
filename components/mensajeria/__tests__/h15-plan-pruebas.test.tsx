import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BotonPreguntarArrendador, TEXTO_NO_DISPONIBLE } from "../boton-preguntar-arrendador";
import type { Mensaje } from "@/lib/mensajeria/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const PUBLICACION = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const CONVERSACION = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const YO = "u-arrendatario";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function simularApi({
  abrir = () => json({ id: CONVERSACION }, 201),
  mensajes = [] as Mensaje[],
  enviar = (contenido: string) =>
    json({ id: "m-nuevo", createdAt: "2026-12-01T15:00:00.000Z", contenido }, 201),
} = {}) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";
    if (url.pathname === `/api/publicaciones/${PUBLICACION}/conversaciones` && metodo === "POST")
      return abrir();
    if (url.pathname === `/api/conversaciones/${CONVERSACION}/mensajes`) {
      if (metodo === "GET")
        return json({ items: mensajes, page: 1, limit: 50, total: mensajes.length });
      if (metodo === "POST")
        return enviar((JSON.parse(String(init?.body)) as { contenido: string }).contenido);
    }
    throw new Error(`Llamada no esperada: ${metodo} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const envios = () =>
    fetchMock.mock.calls.filter(
      ([e, i]) => i?.method === "POST" && String(e).includes("/mensajes"),
    );
  return { fetchMock, envios };
}

async function abrirChat(usuario: ReturnType<typeof userEvent.setup>) {
  render(<BotonPreguntarArrendador publicacionId={PUBLICACION} usuarioId={YO} />);
  await usuario.click(screen.getByRole("button", { name: "Contactar al arrendador" }));
  return screen.findByRole("textbox", { name: "Mensaje" });
}

describe("H15. Preguntar al arrendador antes de reservar (componente)", () => {
  it("AC1: desde el detalle abre la conversación con el arrendador", async () => {
    const { fetchMock } = simularApi();
    const usuario = userEvent.setup();
    await abrirChat(usuario);

    expect(screen.getByRole("heading", { name: "Conversación con el arrendador" })).toBeVisible();
    expect(screen.getByText("Todavía no hay mensajes.")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([e, i]) => String(e).endsWith(`/publicaciones/${PUBLICACION}/conversaciones`) && i?.method === "POST",
      ),
    ).toBe(true);
  });

  it("AC1 (negativo): si la publicación no está disponible no abre el chat", async () => {
    simularApi({ abrir: () => json({ message: "La publicación no existe." }, 404) });
    const usuario = userEvent.setup();
    render(<BotonPreguntarArrendador publicacionId={PUBLICACION} usuarioId={YO} />);
    await usuario.click(screen.getByRole("button", { name: "Contactar al arrendador" }));

    expect(await screen.findByText(`${TEXTO_NO_DISPONIBLE}.`)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });

  it("AC2: el mensaje enviado queda en el historial y se manda recortado", async () => {
    const { envios } = simularApi();
    const usuario = userEvent.setup();
    const caja = await abrirChat(usuario);
    await usuario.type(caja, "  Hola, ¿sigue disponible?  ");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Hola, ¿sigue disponible?")).toBeInTheDocument();
    expect(envios()).toHaveLength(1);
    expect(JSON.parse(String(envios()[0][1]?.body))).toEqual({
      contenido: "Hola, ¿sigue disponible?",
    });
    expect(caja).toHaveValue("");
  });

  it("AC2: muestra el historial con los mensajes de ambos", async () => {
    simularApi({
      mensajes: [
        { id: "m1", autorId: YO, contenido: "¿Incluye cable HDMI?", createdAt: "2026-12-01T15:00:00.000Z" },
        { id: "m2", autorId: "u-arrendador", contenido: "Sí, lo incluye.", createdAt: "2026-12-01T15:05:00.000Z" },
      ],
    });
    const usuario = userEvent.setup();
    await abrirChat(usuario);

    expect(screen.getByText("¿Incluye cable HDMI?")).toBeInTheDocument();
    expect(screen.getByText("Sí, lo incluye.")).toBeInTheDocument();
    expect(screen.getByText(/^Tú ·/)).toBeInTheDocument();
    expect(screen.getByText(/^Arrendador ·/)).toBeInTheDocument();
  });

  it("AC4: con más de 1000 caracteres no deja enviar y avisa el máximo", async () => {
    const { envios } = simularApi();
    const usuario = userEvent.setup();
    const caja = await abrirChat(usuario);
    await usuario.click(caja);
    await usuario.paste("a".repeat(1001));

    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("El mensaje no puede pasar de 1000 caracteres.");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(envios()).toHaveLength(0);
  });

  it("AC4: exactamente 1000 caracteres sí se puede enviar", async () => {
    simularApi();
    const usuario = userEvent.setup();
    const caja = await abrirChat(usuario);
    await usuario.click(caja);
    await usuario.paste("b".repeat(1000));

    expect(screen.getByText("1000/1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });

  it.each([
    ["vacío", ""],
    ["solo con espacios", "     "],
  ])("AC5: un mensaje %s no se puede enviar", async (_caso, texto) => {
    const { envios } = simularApi();
    const usuario = userEvent.setup();
    const caja = await abrirChat(usuario);
    if (texto) await usuario.type(caja, texto);

    expect(screen.getByText("0/1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await waitFor(() => expect(envios()).toHaveLength(0));
  });

  it("AC6: una cuenta que no puede preguntar recibe un aviso y no ve el chat", async () => {
    simularApi({ abrir: () => json({ message: "Prohibido" }, 403) });
    const usuario = userEvent.setup();
    render(<BotonPreguntarArrendador publicacionId={PUBLICACION} usuarioId="u-arrendador" />);
    await usuario.click(screen.getByRole("button", { name: "Contactar al arrendador" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Solo un arrendatario puede preguntar.");
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });
});
