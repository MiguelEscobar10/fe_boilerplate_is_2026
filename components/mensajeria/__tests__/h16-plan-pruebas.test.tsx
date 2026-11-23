import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConversacionReserva, TEXTO_CERRADA, TEXTO_NO_HABILITADA } from "../conversacion-reserva";
import type { Mensaje } from "@/lib/mensajeria/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "4d5e6f70-8192-4a3b-9c4d-5e6f708192a3";
const CONVERSACION = "a1b2c3d4-e5f6-4789-8abc-def012345678";
const ARRENDADOR = "u-arrendador";
const ARRENDATARIO = "u-arrendatario";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const msg = (id: string, autorId: string, contenido: string): Mensaje => ({
  id,
  autorId,
  contenido,
  createdAt: "2026-12-01T15:00:00.000Z",
});

function simularApi({
  abrir,
  mensajes = [] as Mensaje[],
  enviar = () => json({ id: "m-nuevo", createdAt: "2026-12-01T16:00:00.000Z" }, 201),
}: {
  abrir: () => Response;
  mensajes?: Mensaje[];
  enviar?: (c: string) => Response;
}) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";
    if (url.pathname === `/api/reservas/${RESERVA}/conversacion` && metodo === "POST") return abrir();
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
    fetchMock.mock.calls.filter(([e, i]) => i?.method === "POST" && String(e).includes("/mensajes"));
  return { envios };
}

const abierta = (puedeEscribir: boolean) => () =>
  json({ id: CONVERSACION, puedeEscribir }, 200);

describe("H16. Coordinar la entrega con el arrendatario (componente)", () => {
  it("AC1: con la reserva CONFIRMADA la conversación está habilitada para el arrendador", async () => {
    simularApi({ abrir: abierta(true) });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDADOR} rol="ARRENDADOR" />);

    expect(await screen.findByRole("textbox", { name: "Mensaje" })).toBeEnabled();
    expect(screen.queryByText(new RegExp(TEXTO_CERRADA))).not.toBeInTheDocument();
  });

  it("AC1: también está habilitada para el arrendatario y nombra al arrendador", async () => {
    simularApi({
      abrir: abierta(true),
      mensajes: [msg("m1", ARRENDADOR, "Puedo entregarlo a las 9.")],
    });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDATARIO} rol="ARRENDATARIO" />);

    expect(await screen.findByText("Puedo entregarlo a las 9.")).toBeInTheDocument();
    expect(screen.getByText(/^Arrendador ·/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeEnabled();
  });

  it("AC2: el arrendador envía un mensaje y queda en el historial", async () => {
    const { envios } = simularApi({ abrir: abierta(true) });
    const usuario = userEvent.setup();
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDADOR} rol="ARRENDADOR" />);
    await usuario.type(await screen.findByRole("textbox", { name: "Mensaje" }), "La entrego el lunes a las 9.");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("La entrego el lunes a las 9.")).toBeInTheDocument();
    expect(envios()).toHaveLength(1);
  });

  it("AC3: con la reserva PENDIENTE no se habilita y lo explica", async () => {
    simularApi({
      abrir: () => json({ statusCode: 409, codigo: "CONVERSACION_NO_HABILITADA", message: "No habilitada" }, 409),
    });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDATARIO} rol="ARRENDATARIO" />);

    expect(await screen.findByText(`${TEXTO_NO_HABILITADA}.`)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });

  it("AC4: con la reserva RECHAZADA o COMPLETADA se ve el historial pero no se puede escribir", async () => {
    simularApi({
      abrir: abierta(false),
      mensajes: [msg("m1", ARRENDATARIO, "¿A qué hora coordinamos?")],
    });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDADOR} rol="ARRENDADOR" />);

    expect(await screen.findByText("¿A qué hora coordinamos?")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${TEXTO_CERRADA}. Puedes leer el historial`))).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });

  it("AC4: cerrada y sin mensajes, avisa que no hubo conversación", async () => {
    simularApi({
      abrir: () => json({ statusCode: 409, codigo: "CONVERSACION_CERRADA", message: "Cerrada" }, 409),
    });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDATARIO} rol="ARRENDATARIO" />);

    expect(await screen.findByText(`${TEXTO_CERRADA}. Esta reserva no tuvo mensajes.`)).toBeInTheDocument();
  });

  it("AC4: si la reserva se cierra mientras se escribe, quita la caja y avisa", async () => {
    simularApi({
      abrir: abierta(true),
      enviar: () => json({ statusCode: 409, codigo: "CONVERSACION_CERRADA", message: "Cerrada" }, 409),
    });
    const usuario = userEvent.setup();
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDATARIO} rol="ARRENDATARIO" />);
    await usuario.type(await screen.findByRole("textbox", { name: "Mensaje" }), "Hola");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText(new RegExp(`${TEXTO_CERRADA}. Puedes leer el historial`))).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });

  it.each([
    ["vacío", ""],
    ["solo con espacios", "    "],
    ["de 1001 caracteres", "x".repeat(1001)],
  ])("AC5: un mensaje %s no se envía", async (_caso, texto) => {
    const { envios } = simularApi({ abrir: abierta(true) });
    const usuario = userEvent.setup();
    render(<ConversacionReserva reservaId={RESERVA} usuarioId={ARRENDADOR} rol="ARRENDADOR" />);
    const caja = await screen.findByRole("textbox", { name: "Mensaje" });
    if (texto) {
      await usuario.click(caja);
      await usuario.paste(texto);
    }

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(envios()).toHaveLength(0);
  });

  it("Privacidad: una cuenta ajena a la reserva ve «Reserva no encontrada»", async () => {
    simularApi({ abrir: () => json({ message: "Reserva no encontrada" }, 404) });
    render(<ConversacionReserva reservaId={RESERVA} usuarioId="u-otro" rol="ARRENDADOR" />);

    expect(await screen.findByText("Reserva no encontrada.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument();
  });
});
