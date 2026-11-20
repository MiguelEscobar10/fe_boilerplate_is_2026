import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BloqueoFechas, MENSAJE_RANGO_OCUPADO } from "../bloqueo-fechas";
import type { Bloqueo, PeriodoOcupado } from "@/lib/disponibilidad/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ID = "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Rutas = {
  disponibilidad?: (q: URLSearchParams) => Response | Promise<Response>;
  lista?: () => Response | Promise<Response>;
  crear?: (body: Record<string, unknown>) => Response | Promise<Response>;
};

function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    const metodo = init?.method ?? "GET";
    if (url.pathname === `/api/publicaciones/${ID}/disponibilidad`) {
      return rutas.disponibilidad
        ? rutas.disponibilidad(url.searchParams)
        : json({ publicacionId: ID, desde: "", hasta: "", ocupados: [] });
    }
    if (url.pathname === `/api/publicaciones/${ID}/bloqueos` && metodo === "GET") {
      return rutas.lista ? rutas.lista() : json({ items: [] });
    }
    if (url.pathname === `/api/publicaciones/${ID}/bloqueos` && metodo === "POST" && rutas.crear) {
      return rutas.crear(JSON.parse(String(init?.body)) as Record<string, unknown>);
    }
    throw new Error(`Llamada no esperada: ${metodo} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const llamadas = (metodo: string, sufijo: string) =>
    fetchMock.mock.calls.filter(
      ([e, i]) => new URL(String(e), "http://localhost").pathname.endsWith(sufijo) && (i?.method ?? "GET") === metodo,
    );
  return {
    creados: () =>
      llamadas("POST", "/bloqueos").map(([, i]) => JSON.parse(String(i?.body)) as Record<string, unknown>),
    consultasDisponibilidad: () => llamadas("GET", "/disponibilidad").length,
    consultasLista: () => llamadas("GET", "/bloqueos").length,
  };
}

const disponibilidadCon = (ocupados: PeriodoOcupado[]) => () =>
  json({ publicacionId: ID, desde: "2026-11-01", hasta: "2026-11-30", ocupados });

const bloqueoCreado = (body: Record<string, unknown>): Bloqueo => ({
  id: "b-1",
  publicacionId: ID,
  inicio: String(body.inicio),
  fin: String(body.fin),
  motivo: (body.motivo as string | undefined) ?? null,
});

const dia = (d: string) => screen.getByRole("button", { name: new RegExp(`^${d}, `) });

beforeEach(() => {
  // "Hoy" fijo: 17 de noviembre de 2026, 10:00 en El Salvador.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BloqueoFechas: calendario", () => {
  it("muestra el mes actual con los días pasados, ocupados y bloqueados", async () => {
    simularApi({
      disponibilidad: disponibilidadCon([
        { inicio: "2026-11-20T09:00:00-06:00", fin: "2026-11-20T12:00:00-06:00", origen: "RESERVA" },
        { inicio: "2026-11-25T00:00:00-06:00", fin: "2026-11-27T00:00:00-06:00", origen: "BLOQUEO" },
      ]),
    });

    render(<BloqueoFechas publicacionId={ID} />);

    expect(screen.getByRole("heading", { name: "Noviembre de 2026" })).toBeInTheDocument();
    await waitFor(() => expect(dia("20 nov 2026")).toHaveAttribute("data-estado", "reserva"));
    expect(dia("16 nov 2026")).toHaveAttribute("data-estado", "pasado");
    expect(dia("16 nov 2026")).toBeDisabled();
    expect(dia("17 nov 2026")).toHaveAttribute("data-estado", "libre");
    expect(dia("25 nov 2026")).toHaveAttribute("data-estado", "bloqueo");
    expect(dia("26 nov 2026")).toHaveAttribute("data-estado", "bloqueo");
    expect(dia("27 nov 2026")).toHaveAttribute("data-estado", "libre");
  });

  it("pide la disponibilidad del mes que se ve", async () => {
    const user = userEvent.setup();
    const pedidos: string[] = [];
    simularApi({
      disponibilidad: (q) => {
        pedidos.push(`${q.get("desde")}..${q.get("hasta")}`);
        return json({ publicacionId: ID, desde: "", hasta: "", ocupados: [] });
      },
    });
    render(<BloqueoFechas publicacionId={ID} />);
    await waitFor(() => expect(pedidos).toHaveLength(1));

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));

    expect(await screen.findByRole("heading", { name: "Diciembre de 2026" })).toBeInTheDocument();
    await waitFor(() => expect(pedidos).toEqual(["2026-11-01..2026-11-30", "2026-12-01..2026-12-31"]));
    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeEnabled();
  });

  it("no deja ir a meses pasados", async () => {
    simularApi({});
    render(<BloqueoFechas publicacionId={ID} />);

    expect(screen.getByRole("button", { name: "Mes anterior" })).toBeDisabled();
  });

  it("pulsar dos días en el calendario llena Desde y Hasta", async () => {
    const user = userEvent.setup();
    simularApi({});
    render(<BloqueoFechas publicacionId={ID} />);

    await user.click(dia("20 nov 2026"));
    expect(screen.getByLabelText("Desde *")).toHaveValue("2026-11-20");
    expect(screen.getByLabelText("Hasta *")).toHaveValue("2026-11-20");
    await user.click(dia("22 nov 2026"));

    expect(screen.getByLabelText("Hasta *")).toHaveValue("2026-11-22");
    expect(dia("21 nov 2026")).toHaveAttribute("aria-pressed", "true");
    expect(dia("23 nov 2026")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("BloqueoFechas: bloquear", () => {
  it("bloquea un rango con Hasta incluido, refresca el calendario y la lista", async () => {
    const user = userEvent.setup();
    let bloqueado = false;
    const api = simularApi({
      disponibilidad: () =>
        disponibilidadCon(
          bloqueado
            ? [{ inicio: "2026-11-20T00:00:00-06:00", fin: "2026-11-23T00:00:00-06:00", origen: "BLOQUEO" }]
            : [],
        )(),
      lista: () =>
        json({
          items: bloqueado
            ? [{ id: "b-1", publicacionId: ID, inicio: "2026-11-20T00:00:00-06:00", fin: "2026-11-23T00:00:00-06:00", motivo: "Mantenimiento" }]
            : [],
        }),
      crear: (body) => {
        bloqueado = true;
        return json(bloqueoCreado(body), 201);
      },
    });
    render(<BloqueoFechas publicacionId={ID} />);
    expect(await screen.findByText("No tienes fechas bloqueadas.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Desde *"), "2026-11-20");
    await user.type(screen.getByLabelText("Hasta *"), "2026-11-22");
    await user.type(screen.getByLabelText("Motivo (opcional)"), "  Mantenimiento ");
    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Bloqueaste del 20 nov 2026 al 22 nov 2026.",
    );
    expect(api.creados()).toEqual([
      { inicio: "2026-11-20T00:00:00-06:00", fin: "2026-11-23T00:00:00-06:00", motivo: "Mantenimiento" },
    ]);
    await waitFor(() => expect(dia("22 nov 2026")).toHaveAttribute("data-estado", "bloqueo"));
    expect(dia("23 nov 2026")).toHaveAttribute("data-estado", "libre");
    const fila = (await screen.findByText("Mantenimiento")).closest("tr") as HTMLElement;
    expect(within(fila).getByText("20 nov 2026")).toBeInTheDocument();
    expect(within(fila).getByText("22 nov 2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Desde *")).toHaveValue("");
  });

  it("un solo día y sin motivo: no manda el motivo", async () => {
    const user = userEvent.setup();
    const api = simularApi({ crear: (body) => json(bloqueoCreado(body), 201) });
    render(<BloqueoFechas publicacionId={ID} />);

    await user.click(dia("20 nov 2026"));
    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Bloqueaste el 20 nov 2026.");
    expect(api.creados()).toEqual([
      { inicio: "2026-11-20T00:00:00-06:00", fin: "2026-11-21T00:00:00-06:00" },
    ]);
  });

  it.each([
    ["sin fechas", "", "", "Elige la fecha de inicio."],
    ["Hasta antes de Desde", "2026-11-22", "2026-11-20", "Debe ser igual o posterior a Desde."],
    ["Desde en el pasado", "2026-11-10", "2026-11-20", "No se pueden bloquear fechas pasadas."],
  ])("valida antes de enviar: %s", async (_caso, desde, hasta, mensaje) => {
    const user = userEvent.setup();
    const api = simularApi({});
    render(<BloqueoFechas publicacionId={ID} />);

    if (desde) await user.type(screen.getByLabelText("Desde *"), desde);
    if (hasta) await user.type(screen.getByLabelText("Hasta *"), hasta);
    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(screen.getByText(mensaje)).toBeInTheDocument();
    expect(api.creados()).toHaveLength(0);
  });

  it("el motivo no deja pasar de 200 caracteres", async () => {
    const user = userEvent.setup();
    simularApi({});
    render(<BloqueoFechas publicacionId={ID} />);

    const motivo = screen.getByLabelText("Motivo (opcional)");
    await user.click(motivo);
    await user.paste("a".repeat(230));

    expect(motivo).toHaveValue("a".repeat(200));
    expect(screen.getByText("200/200")).toBeInTheDocument();
  });

  it("bloquea el botón mientras envía y no manda dos veces", async () => {
    const user = userEvent.setup();
    let responder: (r: Response) => void = () => {};
    const api = simularApi({ crear: () => new Promise<Response>((r) => (responder = r)) });
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));

    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));
    const enviando = screen.getByRole("button", { name: "Bloqueando..." });
    expect(enviando).toBeDisabled();
    await user.click(enviando);

    expect(api.creados()).toHaveLength(1);
    responder(json(bloqueoCreado({ inicio: "a", fin: "b" }), 201));
    await screen.findByRole("status");
  });

  it("409: «El rango incluye una reserva CONFIRMADA.» con el detalle, sin registrar nada", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      crear: () =>
        json(
          {
            statusCode: 409,
            codigo: "RANGO_CON_RESERVA",
            message: "El rango tiene una reserva CONFIRMADA o EN_CURSO.",
          },
          409,
        ),
    });
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));
    const consultas = api.consultasDisponibilidad();

    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent(MENSAJE_RANGO_OCUPADO);
    expect(alerta).toHaveTextContent("El rango tiene una reserva CONFIRMADA o EN_CURSO.");
    expect(screen.getByLabelText("Desde *")).toHaveValue("2026-11-20");
    expect(api.consultasDisponibilidad()).toBe(consultas);
  });

  it("403: acceso restringido", async () => {
    const user = userEvent.setup();
    simularApi({
      crear: () => json({ statusCode: 403, message: "Publicación no encontrada." }, 403),
    });
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));

    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acceso restringido: esta publicación no es tuya.",
    );
  });

  it("400: el mensaje del backend", async () => {
    const user = userEvent.setup();
    simularApi({
      crear: () =>
        json({ statusCode: 400, message: "La fecha fin debe ser posterior a la de inicio." }, 400),
    });
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));

    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fecha fin debe ser posterior a la de inicio.",
    );
  });

  it("sin conexión: avisa", async () => {
    const user = userEvent.setup();
    simularApi({ crear: () => Promise.reject(new TypeError("Failed to fetch")) });
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));

    await user.click(screen.getByRole("button", { name: "Bloquear fechas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo bloquear. Revisa tu conexión.",
    );
  });

  it("Cancelar limpia el formulario", async () => {
    const user = userEvent.setup();
    simularApi({});
    render(<BloqueoFechas publicacionId={ID} />);
    await user.click(dia("20 nov 2026"));

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByLabelText("Desde *")).toHaveValue("");
    expect(dia("20 nov 2026")).toHaveAttribute("aria-pressed", "false");
  });
});

describe("BloqueoFechas: lista de bloqueos", () => {
  it("muestra Hasta como el último día incluido", async () => {
    simularApi({
      lista: () =>
        json({
          items: [
            { id: "1", publicacionId: ID, inicio: "2026-11-20T00:00:00-06:00", fin: "2026-11-23T00:00:00-06:00", motivo: null },
            { id: "2", publicacionId: ID, inicio: "2026-11-25T09:00:00-06:00", fin: "2026-11-25T12:00:00-06:00", motivo: "Revisión" },
          ],
        }),
    });

    render(<BloqueoFechas publicacionId={ID} />);

    await screen.findByText("Revisión");
    const lista = screen.getByRole("region", { name: "Tus bloqueos" });
    const filas = within(lista).getAllByRole("row");
    expect(filas.map((f) => f.textContent)).toEqual([
      "DesdeHastaMotivo",
      "20 nov 202622 nov 2026—",
      "25 nov 202625 nov 2026Revisión",
    ]);
  });

  it("si la lista no es suya, avisa", async () => {
    simularApi({ lista: () => json({ statusCode: 403, message: "x" }, 403) });

    render(<BloqueoFechas publicacionId={ID} />);

    expect(await screen.findByText("Acceso restringido: esta publicación no es tuya.")).toBeInTheDocument();
  });
});
