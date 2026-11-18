import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BotonPreguntarArrendador,
  TEXTO_NO_DISPONIBLE,
} from "../boton-preguntar-arrendador";
import type { Mensaje } from "@/lib/mensajeria/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const PUBLICACION = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const CONVERSACION = "3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d";
const YO = "u-arrendatario";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function simularApi(opciones: {
  abrir: () => Response | Promise<Response>;
  mensajes?: Mensaje[];
}) {
  const guardados = [...(opciones.mensajes ?? [])];
  const fetchMock = vi.fn(
    async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(entrada), "http://localhost");
      if (url.pathname === `/api/publicaciones/${PUBLICACION}/conversaciones`) {
        return opciones.abrir();
      }
      if (url.pathname === `/api/conversaciones/${CONVERSACION}/mensajes`) {
        if (init?.method === "POST") {
          const { contenido } = JSON.parse(String(init.body)) as {
            contenido: string;
          };
          const nuevo = {
            id: `m-${guardados.length + 1}`,
            autorId: YO,
            contenido,
            createdAt: "2026-12-01T16:00:00.000Z",
          };
          guardados.push(nuevo);
          return json({ id: nuevo.id, createdAt: nuevo.createdAt }, 201);
        }
        return json({
          items: guardados,
          page: 1,
          limit: 50,
          total: guardados.length,
        });
      }
      throw new Error(`Llamada no esperada: ${url.pathname}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock };
}

const boton = () =>
  render(
    <BotonPreguntarArrendador publicacionId={PUBLICACION} usuarioId={YO} />,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BotonPreguntarArrendador (FE-15.1)", () => {
  it("no llama al backend hasta que se pulsa", () => {
    const { fetchMock } = simularApi({
      abrir: () => json({ id: CONVERSACION }, 201),
    });

    boton();

    expect(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("abre la conversación, envía un mensaje y aparece en el historial", async () => {
    const { fetchMock } = simularApi({
      abrir: () => json({ id: CONVERSACION }, 201),
    });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );
    expect(
      await screen.findByText("Todavía no hay mensajes."),
    ).toBeInTheDocument();

    await usuario.type(
      screen.getByLabelText("Mensaje"),
      "¿Incluye las brocas?",
    );
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("¿Incluye las brocas?")).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toHaveValue("");
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(2);
  });

  it("recupera el historial de una conversación que ya existía", async () => {
    simularApi({
      abrir: () => json({ id: CONVERSACION }, 200),
      mensajes: [
        {
          id: "m-1",
          autorId: YO,
          contenido: "¿Está disponible el sábado?",
          createdAt: "2026-11-30T15:00:00.000Z",
        },
        {
          id: "m-2",
          autorId: "u-arrendador",
          contenido: "Sí, desde las 8",
          createdAt: "2026-11-30T15:05:00.000Z",
        },
      ],
    });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );

    expect(
      await screen.findByText("¿Está disponible el sábado?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sí, desde las 8")).toBeInTheDocument();
    expect(screen.getByText(/^Arrendador ·/)).toBeInTheDocument();
  });

  it("Enviar queda deshabilitado con el mensaje vacío o de más de 1000 caracteres", async () => {
    simularApi({ abrir: () => json({ id: CONVERSACION }, 201) });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );
    const enviar = await screen.findByRole("button", { name: "Enviar" });
    expect(enviar).toBeDisabled();

    await usuario.click(screen.getByLabelText("Mensaje"));
    await usuario.paste("a".repeat(1001));
    expect(enviar).toBeDisabled();
    expect(screen.getByText("1001/1000")).toBeInTheDocument();
  });

  it("un 404 se muestra como «Conversación no disponible»", async () => {
    simularApi({
      abrir: () =>
        json(
          {
            statusCode: 404,
            message: "La publicación no existe o no está disponible.",
          },
          404,
        ),
    });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );

    expect(
      await screen.findByText(new RegExp(TEXTO_NO_DISPONIBLE)),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Contactar al arrendador" }),
    ).not.toBeInTheDocument();
  });

  it("un error de red deja reintentar", async () => {
    let falla = true;
    simularApi({
      abrir: () => {
        if (falla) throw new TypeError("Failed to fetch");
        return json({ id: CONVERSACION }, 201);
      },
    });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Revisa tu conexión/,
    );

    falla = false;
    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByLabelText("Mensaje")).toBeInTheDocument();
  });

  it("mientras abre, el botón queda deshabilitado", async () => {
    let soltar!: () => void;
    const { fetchMock } = simularApi({
      abrir: () =>
        new Promise<Response>((resolver) => {
          soltar = () => resolver(json({ id: CONVERSACION }, 201));
        }),
    });
    const usuario = userEvent.setup();
    boton();

    await usuario.click(
      screen.getByRole("button", { name: "Contactar al arrendador" }),
    );
    const abriendo = screen.getByRole("button", { name: "Abriendo..." });
    expect(abriendo).toBeDisabled();
    await usuario.click(abriendo);
    soltar();

    await screen.findByLabelText("Mensaje");
    expect(
      fetchMock.mock.calls.filter(
        ([entrada]) =>
          String(entrada).includes("/conversaciones") &&
          !String(entrada).includes("/mensajes"),
      ),
    ).toHaveLength(1);
  });
});
