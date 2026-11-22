import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccionEntrega } from "../accion-entrega";
import { FormularioEntrega } from "../formulario-entrega";
import { PantallaEntrega } from "../pantalla-entrega";
import type { Entrega, ReservaParaEntrega } from "@/lib/entregas/tipos";

/**
 * Plan de pruebas, H08. Registrar la entrega de un equipo o espacio: pruebas
 * de componente de la interfaz. Un `it('ACn: ...')` por criterio y, al final,
 * los casos negativos.
 */

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "5d2c8e1a-3b4f-4a6d-9c7e-0f1a2b3c4d5e";
const INICIO = "2026-12-01T15:00:00.000Z";
const NOTA = "Proyector completo, con control y cables";

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
  nota: NOTA,
  fotos: [{ orden: 0, url: "/x" }],
  ...cambios,
});

const reserva = (cambios: Partial<ReservaParaEntrega> = {}): ReservaParaEntrega => ({
  id: RESERVA,
  estado: "CONFIRMADA",
  inicio: INICIO,
  tipoBien: "EQUIPO",
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
  return { posts };
}

async function llenarYConfirmar(nota = NOTA, fotos: File[] = []) {
  const user = userEvent.setup({ applyAccept: false });
  await user.type(screen.getByLabelText("Estado inicial del bien"), nota);
  if (fotos.length) await user.upload(screen.getByLabelText("Fotos (opcional)"), fotos);
  await user.click(screen.getByRole("button", { name: /^Registrar/ }));
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  return user;
}

function formulario(onEntregada = vi.fn()) {
  render(<FormularioEntrega reservaId={RESERVA} tipoBien="EQUIPO" onEntregada={onEntregada} />);
  return onEntregada;
}

describe("H08. Registrar la entrega de un equipo o espacio (interfaz)", () => {
  it("AC1: con la reserva CONFIRMADA y el inicio alcanzado, envío la nota y las fotos y queda la constancia con fecha y estado inicial", async () => {
    const recibidos: { nota: unknown; fotos: string[] }[] = [];
    let entregada = false;
    simularApi({
      get: () => (entregada ? json(entrega()) : json({ message: "No" }, 404)),
      post: (datos) => {
        recibidos.push({
          nota: datos.get("nota"),
          fotos: datos.getAll("fotos").map((f) => (f as File).name),
        });
        entregada = true;
        return json({ entregaId: "e-1", reservaId: RESERVA, estadoReserva: "EN_CURSO" }, 201);
      },
    });
    render(<PantallaEntrega reservaId={RESERVA} />);
    await screen.findByLabelText("Estado inicial del bien");

    await llenarYConfirmar(NOTA, [foto("a.jpg"), foto("b.png", "image/png")]);

    expect(await screen.findByText(NOTA)).toBeInTheDocument();
    expect(screen.getByText(/^El \d/)).toBeInTheDocument();
    expect(screen.getByText("Estado inicial")).toBeInTheDocument();
    expect(recibidos).toEqual([{ nota: NOTA, fotos: ["a.jpg", "b.png"] }]);
  });

  it("AC2: al registrarla, la pantalla indica que la reserva pasó a EN_CURSO", async () => {
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

    await llenarYConfirmar();

    expect(await screen.findByText("Entrega registrada. La reserva pasó a EN_CURSO.")).toBeInTheDocument();
    expect(screen.getByText(/Reserva EN_CURSO/)).toBeInTheDocument();
  });

  it.each(["PENDIENTE", "RECHAZADA", "CANCELADA"] as const)(
    "AC3: una reserva %s (no CONFIRMADA) no ofrece registrar la entrega",
    (estado) => {
      const { container } = render(<AccionEntrega reserva={reserva({ estado })} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("AC3: si la reserva es ajena, el 403 se explica y no se registra nada", async () => {
    const onEntregada = vi.fn();
    simularApi({ post: () => json({ message: "Prohibido" }, 403) });
    formulario(onEntregada);

    await llenarYConfirmar();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo el arrendador del bien puede registrar la entrega.",
    );
    expect(onEntregada).not.toHaveBeenCalled();
  });

  it("AC4: con la entrega ya registrada no se ofrece registrarla otra vez y el 409 se explica", async () => {
    simularApi({ get: () => json(entrega()) });
    const vista = render(<AccionEntrega reserva={reserva({ estado: "EN_CURSO" })} />);
    expect(await screen.findByText(NOTA)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Registrar/ })).not.toBeInTheDocument();
    vista.unmount();

    const onConflicto = vi.fn();
    simularApi({ post: () => json({ message: "Ya tiene entrega" }, 409) });
    render(
      <FormularioEntrega
        reservaId={RESERVA}
        tipoBien="EQUIPO"
        onEntregada={vi.fn()}
        onConflicto={onConflicto}
      />,
    );
    await llenarYConfirmar();

    expect(await screen.findByRole("alert")).toHaveTextContent("ya tiene una entrega registrada");
    expect(onConflicto).toHaveBeenCalled();
  });

  it("AC5: antes del inicio la acción está deshabilitada y dice desde cuándo; el 422 también lo indica", async () => {
    const vista = render(
      <AccionEntrega reserva={reserva()} ahora={new Date("2026-12-01T14:00:00Z")} />,
    );
    expect(screen.getByRole("button", { name: "Registrar entrega" })).toBeDisabled();
    expect(screen.getByText(/Disponible desde el/)).toBeInTheDocument();
    vista.unmount();

    simularApi({
      post: () =>
        json(
          { codigo: "ENTREGA_NO_HABILITADA", disponibleDesde: INICIO, message: "Todavía no" },
          422,
        ),
    });
    formulario();
    await llenarYConfirmar();

    expect(await screen.findByRole("alert")).toHaveTextContent("estará disponible desde el");
  });

  describe("casos negativos", () => {
    it.each([
      ["sin nota", "", [], "Escribe la nota"],
      ["con 6 fotos", "Ok", Array.from({ length: 6 }, (_, i) => foto(`f${i}.jpg`)), "como máximo 5"],
      ["con un PDF como foto", "Ok", [foto("a.pdf", "application/pdf")], "JPG o PNG"],
    ])("NEG1: %s no se envía y se explica el error", async (_, nota, fotos, mensaje) => {
      const api = simularApi({});
      formulario();
      const user = userEvent.setup({ applyAccept: false });
      if (nota) await user.type(screen.getByLabelText("Estado inicial del bien"), nota);
      if (fotos.length) await user.upload(screen.getByLabelText("Fotos (opcional)"), fotos);

      await user.click(screen.getByRole("button", { name: "Registrar entrega" }));

      expect(screen.getByRole("alert")).toHaveTextContent(mensaje);
      expect(api.posts()).toHaveLength(0);
    });

    it("NEG2: un doble clic en «Confirmar» envía una sola vez", async () => {
      let responder: (r: Response) => void = () => {};
      const api = simularApi({ post: () => new Promise<Response>((r) => (responder = r)) });
      formulario();

      const user = await llenarYConfirmar();
      const boton = screen.getByRole("button", { name: "Registrando..." });
      expect(boton).toBeDisabled();
      await user.click(boton);

      expect(api.posts()).toHaveLength(1);
      responder(json({ entregaId: "e", reservaId: RESERVA, estadoReserva: "EN_CURSO" }, 201));
      await waitFor(() => expect(screen.queryByRole("button", { name: "Registrando..." })).not.toBeInTheDocument());
    });
  });
});
