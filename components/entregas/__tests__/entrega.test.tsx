import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccionEntrega } from "../accion-entrega";
import { FormularioEntrega, validarEntrega } from "../formulario-entrega";
import { PantallaEntrega } from "../pantalla-entrega";
import type { Entrega, ReservaParaEntrega } from "@/lib/entregas/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const INICIO = "2026-12-01T15:00:00.000Z";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const entrega = (cambios: Partial<Entrega> = {}): Entrega => ({
  entregaId: "e-1",
  reservaId: RESERVA,
  entregadaAt: "2026-12-01T15:30:00.000Z",
  nota: "Completo, con estuche",
  fotos: [{ orden: 0, url: "/x" }],
  ...cambios,
});

const foto = (nombre = "a.jpg", tipo = "image/jpeg", bytes = 100) =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo });

type Rutas = {
  get?: () => Response | Promise<Response>;
  post?: (datos: FormData) => Response | Promise<Response>;
};

function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname !== `/api/reservas/${RESERVA}/entrega`) {
      throw new Error(`Llamada no esperada: ${url.pathname}`);
    }
    if ((init?.method ?? "GET") === "GET") {
      return rutas.get ? rutas.get() : json({ message: "No" }, 404);
    }
    if (init?.method === "POST" && rutas.post) return rutas.post(init.body as FormData);
    throw new Error(`Llamada no esperada: ${init?.method}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
  return { fetchMock, posts };
}

const reserva = (cambios: Partial<ReservaParaEntrega> = {}): ReservaParaEntrega => ({
  id: RESERVA,
  estado: "CONFIRMADA",
  inicio: INICIO,
  tipoBien: "EQUIPO",
  ...cambios,
});

async function llenarYConfirmar(nota = "Completo, con estuche", fotos: File[] = []) {
  const user = userEvent.setup({ applyAccept: false });
  await user.type(screen.getByLabelText("Estado inicial del bien"), nota);
  if (fotos.length) await user.upload(screen.getByLabelText("Fotos (opcional)"), fotos);
  await user.click(screen.getByRole("button", { name: /^Registrar/ }));
  return user;
}

describe("AccionEntrega (panel del arrendador)", () => {
  it.each(["PENDIENTE", "RECHAZADA", "CANCELADA"] as const)(
    "no muestra controles en una reserva %s",
    (estado) => {
      const { container } = render(<AccionEntrega reserva={reserva({ estado })} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("antes del inicio la acción está deshabilitada y dice desde cuándo", () => {
    render(<AccionEntrega reserva={reserva()} ahora={new Date("2026-12-01T14:00:00Z")} />);

    expect(screen.getByRole("button", { name: "Registrar entrega" })).toBeDisabled();
    expect(screen.getByText(/Disponible desde el/)).toBeInTheDocument();
  });

  it("desde el inicio la acción abre el formulario", async () => {
    render(<AccionEntrega reserva={reserva()} ahora={new Date(INICIO)} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Registrar entrega" }));

    expect(screen.getByLabelText("Estado inicial del bien")).toBeInTheDocument();
  });

  it("para un espacio la acción se llama «Registrar inicio de uso»", () => {
    render(
      <AccionEntrega reserva={reserva({ tipoBien: "ESPACIO" })} ahora={new Date(INICIO)} />,
    );
    expect(screen.getByRole("button", { name: "Registrar inicio de uso" })).toBeEnabled();
  });

  it("en una reserva EN_CURSO muestra el detalle de la entrega", async () => {
    simularApi({ get: () => json(entrega()) });

    render(<AccionEntrega reserva={reserva({ estado: "EN_CURSO" })} />);

    expect(await screen.findByText("Completo, con estuche")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto 1 del estado inicial" })).toHaveAttribute(
      "src",
      `/api/reservas/${RESERVA}/entrega/fotos/0`,
    );
    expect(screen.queryByRole("button", { name: /Registrar/ })).not.toBeInTheDocument();
  });
});

describe("FormularioEntrega", () => {
  it("muestra el contador de la nota", async () => {
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={vi.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Estado inicial del bien"), "Hola");

    expect(screen.getByText("4/500")).toBeInTheDocument();
  });

  it("pide confirmar antes de enviar y envía nota y fotos", async () => {
    const recibidos: { nota: unknown; fotos: string[] }[] = [];
    const api = simularApi({
      post: (datos) => {
        recibidos.push({
          nota: datos.get("nota"),
          fotos: datos.getAll("fotos").map((f) => (f as File).name),
        });
        return json({ entregaId: "e-1", reservaId: RESERVA, estadoReserva: "EN_CURSO" }, 201);
      },
    });
    const onEntregada = vi.fn();
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={onEntregada} />);

    const user = await llenarYConfirmar("  Completo  ", [foto("a.jpg"), foto("b.png", "image/png")]);
    expect(screen.getByText(/¿Confirmas el registro\?/)).toBeInTheDocument();
    expect(api.posts()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(onEntregada).toHaveBeenCalled());
    expect(recibidos).toEqual([{ nota: "Completo", fotos: ["a.jpg", "b.png"] }]);
  });

  it("«Volver» cancela la confirmación sin enviar", async () => {
    const api = simularApi({});
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={vi.fn()} />);

    const user = await llenarYConfirmar();
    await user.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: "Registrar entrega" })).toBeInTheDocument();
    expect(api.posts()).toHaveLength(0);
  });

  it.each([
    ["sin nota", "", [], "Escribe la nota"],
    ["con 6 fotos", "Ok", Array.from({ length: 6 }, (_, i) => foto(`f${i}.jpg`)), "como máximo 5"],
    ["con un PDF", "Ok", [foto("a.pdf", "application/pdf")], "JPG o PNG"],
    ["con una foto de más de 5 MB", "Ok", [foto("g.jpg", "image/jpeg", 5 * 1024 * 1024 + 1)], "5 MB"],
  ])("no pide confirmación %s y explica el error", async (_, nota, fotos, mensaje) => {
    const api = simularApi({});
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={vi.fn()} />);
    const user = userEvent.setup({ applyAccept: false });
    if (nota) await user.type(screen.getByLabelText("Estado inicial del bien"), nota);
    if (fotos.length) await user.upload(screen.getByLabelText("Fotos (opcional)"), fotos);

    await user.click(screen.getByRole("button", { name: "Registrar entrega" }));

    expect(screen.getByRole("alert")).toHaveTextContent(mensaje);
    expect(screen.queryByText(/¿Confirmas/)).not.toBeInTheDocument();
    expect(api.posts()).toHaveLength(0);
  });

  it("ante un 409 avisa y pide refrescar el estado", async () => {
    simularApi({ post: () => json({ message: "Ya" }, 409) });
    const onConflicto = vi.fn();
    render(
      <FormularioEntrega
        reservaId={RESERVA}
        tipoBien="EQUIPO"
        onEntregada={vi.fn()}
        onConflicto={onConflicto}
      />,
    );

    const user = await llenarYConfirmar();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La reserva cambió");
    expect(onConflicto).toHaveBeenCalled();
  });

  it("ante el 422 dice desde cuándo estará disponible", async () => {
    simularApi({
      post: () =>
        json(
          { codigo: "ENTREGA_NO_HABILITADA", disponibleDesde: INICIO, message: "Todavía no" },
          422,
        ),
    });
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={vi.fn()} />);

    const user = await llenarYConfirmar();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("estará disponible desde el");
  });

  it("desactiva «Confirmar» mientras envía (sin doble envío)", async () => {
    let responder: (r: Response) => void = () => {};
    const api = simularApi({ post: () => new Promise<Response>((r) => (responder = r)) });
    render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={vi.fn()} />);

    const user = await llenarYConfirmar();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    const boton = screen.getByRole("button", { name: "Registrando..." });
    expect(boton).toBeDisabled();
    await user.click(boton);

    expect(api.posts()).toHaveLength(1);
    responder(json({ entregaId: "e", reservaId: RESERVA, estadoReserva: "EN_CURSO" }, 201));
  });
});

describe("PantallaEntrega (/reservas/{id}/entrega)", () => {
  it("sin entrega muestra el formulario y, al guardar, el estado EN_CURSO", async () => {
    let entregada = false;
    simularApi({
      get: () => (entregada ? json(entrega()) : json({ message: "No" }, 404)),
      post: () => {
        entregada = true;
        return json({ entregaId: "e-1", reservaId: RESERVA, estadoReserva: "EN_CURSO" }, 201);
      },
    });
    render(<PantallaEntrega reservaId={RESERVA} />);
    await screen.findByLabelText("Estado inicial del bien");

    const user = await llenarYConfirmar();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(await screen.findByText("Entrega registrada. La reserva pasó a EN_CURSO.")).toBeInTheDocument();
    expect(screen.getByText(/Reserva EN_CURSO/)).toBeInTheDocument();
  });

  it("con la entrega ya registrada muestra el detalle sin formulario", async () => {
    simularApi({ get: () => json(entrega({ fotos: [] })) });

    render(<PantallaEntrega reservaId={RESERVA} tipoBien="ESPACIO" />);

    expect(await screen.findByText("Completo, con estuche")).toBeInTheDocument();
    expect(screen.queryByLabelText("Estado inicial del bien")).not.toBeInTheDocument();
  });

  it("para un espacio el formulario dice «Registrar inicio de uso»", async () => {
    simularApi({});
    render(<PantallaEntrega reservaId={RESERVA} tipoBien="ESPACIO" />);
    expect(await screen.findByRole("button", { name: "Registrar inicio de uso" })).toBeInTheDocument();
  });
});

describe("validarEntrega", () => {
  it("acepta 500 caracteres y 5 fotos", () => {
    expect(validarEntrega("a".repeat(500), Array.from({ length: 5 }, () => foto()))).toBeNull();
  });

  it("rechaza 501 caracteres", () => {
    expect(validarEntrega("a".repeat(501), [])).toMatch(/500/);
  });
});
