import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validarMensaje } from "../caja-mensaje";
import {
  ConversacionReserva,
  TEXTO_CERRADA,
  TEXTO_NO_HABILITADA,
} from "../conversacion-reserva";
import type { Mensaje } from "@/lib/mensajeria/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const CONVERSACION = "3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d";
const YO = "u-arrendatario";
const OTRO = "u-arrendador";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const mensaje = (n: number, autorId = OTRO): Mensaje => ({
  id: `m-${n}`,
  autorId,
  contenido: `Mensaje ${n}`,
  createdAt: new Date(Date.UTC(2026, 11, 1, 15, n)).toISOString(),
});

type Rutas = {
  abrir: () => Response | Promise<Response>;
  /** Todos los mensajes, del más viejo al más nuevo; se paginan de 50 en 50. */
  mensajes?: Mensaje[];
  enviar?: (contenido: string) => Response | Promise<Response>;
};

function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(
    async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(entrada), "http://localhost");
      if (
        url.pathname === `/api/reservas/${RESERVA}/conversacion` &&
        init?.method === "POST"
      ) {
        return rutas.abrir();
      }
      if (url.pathname === `/api/conversaciones/${CONVERSACION}/mensajes`) {
        if ((init?.method ?? "GET") === "GET") {
          const todos = rutas.mensajes ?? [];
          const page = Number(url.searchParams.get("page"));
          const limit = Number(url.searchParams.get("limit"));
          return json({
            items: todos.slice((page - 1) * limit, page * limit),
            page,
            limit,
            total: todos.length,
          });
        }
        if (init?.method === "POST" && rutas.enviar) {
          return rutas.enviar(
            (JSON.parse(String(init.body)) as { contenido: string }).contenido,
          );
        }
      }
      throw new Error(
        `Llamada no esperada: ${init?.method ?? "GET"} ${url.pathname}`,
      );
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  const posts = () =>
    fetchMock.mock.calls.filter(
      ([entrada, init]) =>
        init?.method === "POST" && String(entrada).includes("/mensajes"),
    );
  return { fetchMock, posts };
}

const abierta =
  (estadoReserva: string, puedeEscribir: boolean, status = 200) =>
  () =>
    json({ id: CONVERSACION, estadoReserva, puedeEscribir }, status);

const pantalla = () =>
  render(
    <ConversacionReserva
      reservaId={RESERVA}
      usuarioId={YO}
      rol="ARRENDATARIO"
    />,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ConversacionReserva (FE-16.1)", () => {
  it("con la reserva CONFIRMADA muestra el historial y la caja para escribir", async () => {
    simularApi({
      abrir: abierta("CONFIRMADA", true, 201),
      mensajes: [mensaje(1), mensaje(2, YO)],
    });

    pantalla();

    const conversacion = await screen.findByRole("region", {
      name: "Conversación",
    });
    expect(within(conversacion).getByText("Mensaje 1")).toBeInTheDocument();
    expect(within(conversacion).getByText(/^Arrendador ·/)).toBeInTheDocument();
    expect(within(conversacion).getByText(/^Tú ·/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(TEXTO_CERRADA)),
    ).not.toBeInTheDocument();
  });

  it("con la reserva EN_CURSO también deja escribir", async () => {
    simularApi({ abrir: abierta("EN_CURSO", true) });

    pantalla();

    expect(await screen.findByLabelText("Mensaje")).toBeInTheDocument();
  });

  it.each(["RECHAZADA", "CANCELADA", "COMPLETADA"])(
    "con la reserva %s muestra solo el historial y «Conversación cerrada»",
    async (estado) => {
      simularApi({ abrir: abierta(estado, false), mensajes: [mensaje(1)] });

      pantalla();

      expect(await screen.findByText("Mensaje 1")).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`^${TEXTO_CERRADA}`)),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Enviar" }),
      ).not.toBeInTheDocument();
    },
  );

  it("con la reserva PENDIENTE muestra que se habilita al confirmarse", async () => {
    const { fetchMock } = simularApi({
      abrir: () =>
        json({ statusCode: 409, codigo: "CONVERSACION_NO_HABILITADA" }, 409),
    });

    pantalla();

    expect(
      await screen.findByText(new RegExp(TEXTO_NO_HABILITADA)),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("una reserva cerrada que nunca tuvo conversación muestra «Conversación cerrada»", async () => {
    simularApi({
      abrir: () =>
        json({ statusCode: 409, codigo: "CONVERSACION_CERRADA" }, 409),
    });

    pantalla();

    expect(
      await screen.findByText(
        /Conversación cerrada\. Esta reserva no tuvo mensajes/,
      ),
    ).toBeInTheDocument();
  });

  it("una reserva ajena o que no existe se ve como no encontrada", async () => {
    simularApi({
      abrir: () =>
        json({ statusCode: 404, message: "La reserva no existe." }, 404),
    });

    pantalla();

    expect(
      await screen.findByText("Reserva no encontrada."),
    ).toBeInTheDocument();
  });

  it("sin conexión avisa y no se queda cargando", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    pantalla();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Revisa tu conexión/,
    );
  });

  it("envía un mensaje, lo agrega al historial y limpia la caja", async () => {
    const enviados: string[] = [];
    simularApi({
      abrir: abierta("CONFIRMADA", true),
      enviar: (contenido) => {
        enviados.push(contenido);
        return json(
          { id: "m-nuevo", createdAt: "2026-12-01T16:00:00.000Z" },
          201,
        );
      },
    });
    const usuario = userEvent.setup();
    pantalla();

    const caja = await screen.findByLabelText("Mensaje");
    await usuario.type(caja, "  Te espero a las 8 en el portón  ");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(
      await screen.findByText("Te espero a las 8 en el portón"),
    ).toBeInTheDocument();
    expect(enviados).toEqual(["Te espero a las 8 en el portón"]);
    expect(caja).toHaveValue("");
  });

  it("no manda un mensaje vacío ni uno de más de 1000 caracteres", async () => {
    const { posts } = simularApi({ abrir: abierta("CONFIRMADA", true) });
    const usuario = userEvent.setup();
    pantalla();

    await usuario.click(await screen.findByRole("button", { name: "Enviar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe un mensaje.");

    await usuario.click(screen.getByLabelText("Mensaje"));
    await usuario.paste("a".repeat(1001));
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "no puede pasar de 1000",
    );

    expect(posts()).toHaveLength(0);
  });

  it("un doble clic manda el mensaje una sola vez", async () => {
    let soltar!: () => void;
    const { posts } = simularApi({
      abrir: abierta("CONFIRMADA", true),
      enviar: () =>
        new Promise<Response>((resolver) => {
          soltar = () =>
            resolver(
              json({ id: "m-1", createdAt: "2026-12-01T16:00:00.000Z" }, 201),
            );
        }),
    });
    const usuario = userEvent.setup();
    pantalla();

    await usuario.type(await screen.findByLabelText("Mensaje"), "Hola");
    await usuario.dblClick(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
    soltar();

    await screen.findByText("Hola");
    expect(posts()).toHaveLength(1);
  });

  it("si la reserva se cierra mientras está abierta, esconde la caja y avisa", async () => {
    simularApi({
      abrir: abierta("EN_CURSO", true),
      enviar: () =>
        json({ statusCode: 409, codigo: "CONVERSACION_CERRADA" }, 409),
    });
    const usuario = userEvent.setup();
    pantalla();

    await usuario.type(await screen.findByLabelText("Mensaje"), "Una cosa más");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(
      await screen.findByText(new RegExp(`^${TEXTO_CERRADA}`)),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();
  });

  it("si el envío falla deja el texto para reintentar", async () => {
    simularApi({
      abrir: abierta("CONFIRMADA", true),
      enviar: () => json({ statusCode: 500 }, 500),
    });
    const usuario = userEvent.setup();
    pantalla();

    const caja = await screen.findByLabelText("Mensaje");
    await usuario.type(caja, "Hola");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo enviar",
    );
    expect(caja).toHaveValue("Hola");
  });

  it("abre en los mensajes más recientes y carga los anteriores a pedido", async () => {
    const todos = Array.from({ length: 60 }, (_, i) => mensaje(i + 1));
    simularApi({ abrir: abierta("CONFIRMADA", true), mensajes: todos });
    const usuario = userEvent.setup();
    pantalla();

    expect(await screen.findByText("Mensaje 60")).toBeInTheDocument();
    expect(screen.getByText("Mensaje 51")).toBeInTheDocument();
    expect(screen.queryByText("Mensaje 50")).not.toBeInTheDocument();

    await usuario.click(
      screen.getByRole("button", { name: "Ver mensajes anteriores" }),
    );

    expect(await screen.findByText("Mensaje 1")).toBeInTheDocument();
    const textos = screen
      .getAllByText(/^Mensaje \d+$/)
      .map((n) => n.textContent);
    expect(textos[0]).toBe("Mensaje 1");
    expect(textos.at(-1)).toBe("Mensaje 60");
    expect(
      screen.queryByRole("button", { name: "Ver mensajes anteriores" }),
    ).not.toBeInTheDocument();
  });

  it("sin mensajes todavía lo dice", async () => {
    simularApi({ abrir: abierta("CONFIRMADA", true), mensajes: [] });

    pantalla();

    expect(
      await screen.findByText("Todavía no hay mensajes."),
    ).toBeInTheDocument();
  });

  it("el arrendador ve al otro como «Arrendatario»", async () => {
    simularApi({
      abrir: abierta("CONFIRMADA", true),
      mensajes: [mensaje(1, YO)],
    });

    render(
      <ConversacionReserva
        reservaId={RESERVA}
        usuarioId={OTRO}
        rol="ARRENDADOR"
      />,
    );

    expect(await screen.findByText(/^Arrendatario ·/)).toBeInTheDocument();
  });
});

describe("validarMensaje", () => {
  it.each([
    ["", "Escribe un mensaje."],
    ["   ", "Escribe un mensaje."],
    ["a".repeat(1001), "El mensaje no puede pasar de 1000 caracteres."],
  ])("rechaza %j", (texto, error) => {
    expect(validarMensaje(texto)).toBe(error);
  });

  it("acepta de 1 a 1000 caracteres contando sin los espacios de los extremos", () => {
    expect(validarMensaje("a")).toBeNull();
    expect(validarMensaje(`  ${"a".repeat(1000)}  `)).toBeNull();
  });
});

describe("historial", () => {
  it("vuelve a pedir los mensajes con «Actualizar»", async () => {
    const { fetchMock } = simularApi({
      abrir: abierta("CONFIRMADA", true),
      mensajes: [mensaje(1)],
    });
    const usuario = userEvent.setup();
    pantalla();

    await screen.findByText("Mensaje 1");
    const antes = fetchMock.mock.calls.length;
    await usuario.click(screen.getByRole("button", { name: "Actualizar" }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(antes),
    );
  });
});
