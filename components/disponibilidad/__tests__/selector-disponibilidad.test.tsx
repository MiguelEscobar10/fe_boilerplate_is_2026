import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarioDisponibilidad } from "../calendario-disponibilidad";
import { SelectorDisponibilidad } from "../selector-disponibilidad";
import type { PeriodoOcupado } from "@/lib/disponibilidad/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ID = "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Backend de disponibilidad: devuelve los ocupados que se cruzan con el rango pedido. */
function simularDisponibilidad(ocupados: PeriodoOcupado[], fallar?: () => Response | Promise<Response> | null) {
  const pedidos: string[] = [];
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname !== `/api/publicaciones/${ID}/disponibilidad`) {
      throw new Error(`Llamada no esperada: ${url.pathname}`);
    }
    const desde = url.searchParams.get("desde") ?? "";
    const hasta = url.searchParams.get("hasta") ?? "";
    pedidos.push(`${desde}..${hasta}`);
    const error = fallar?.();
    if (error) return error;
    const inicio = Date.parse(`${desde}T06:00:00Z`);
    const fin = Date.parse(`${hasta}T06:00:00Z`) + 86_400_000;
    return json({
      publicacionId: ID,
      desde,
      hasta,
      ocupados: ocupados.filter((p) => Date.parse(p.inicio) < fin && Date.parse(p.fin) > inicio),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { pedidos };
}

const dia = (d: string) => screen.getByRole("button", { name: new RegExp(`^${d}, `) });

// Hoy: 17 de noviembre de 2026. Reserva confirmada el 20 y bloqueo del 25 al 26.
const OCUPADOS: PeriodoOcupado[] = [
  { inicio: "2026-11-20T09:00:00-06:00", fin: "2026-11-20T12:00:00-06:00", origen: "RESERVA" },
  { inicio: "2026-11-25T00:00:00-06:00", fin: "2026-11-27T00:00:00-06:00", origen: "BLOQUEO" },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SelectorDisponibilidad", () => {
  it("distingue libres, ocupados, bloqueados y pasados, con leyenda", async () => {
    simularDisponibilidad(OCUPADOS);

    render(<SelectorDisponibilidad publicacionId={ID} />);

    await waitFor(() => expect(dia("20 nov 2026")).toHaveAttribute("data-estado", "reserva"));
    expect(dia("25 nov 2026")).toHaveAttribute("data-estado", "bloqueo");
    expect(dia("18 nov 2026")).toHaveAttribute("data-estado", "libre");
    expect(dia("10 nov 2026")).toHaveAttribute("data-estado", "pasado");
    expect(screen.getByText("Libre")).toBeInTheDocument();
    expect(screen.getByText("Bloqueado por el arrendador")).toBeInTheDocument();
  });

  it("un día con solo solicitudes PENDIENTE se ve libre (el backend no lo manda)", async () => {
    simularDisponibilidad([]);

    render(<SelectorDisponibilidad publicacionId={ID} />);

    await waitFor(() => expect(dia("20 nov 2026")).toHaveAttribute("data-estado", "libre"));
  });

  it("pulsar un día pasado no lo elige y avisa «No se pueden elegir fechas pasadas.»", async () => {
    const user = userEvent.setup();
    simularDisponibilidad(OCUPADOS);
    render(<SelectorDisponibilidad publicacionId={ID} />);
    await waitFor(() => expect(dia("10 nov 2026")).toHaveAttribute("data-estado", "pasado"));

    expect(dia("10 nov 2026")).toHaveAttribute("aria-disabled", "true");
    await user.click(dia("10 nov 2026"));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pueden elegir fechas pasadas.");
    expect(dia("10 nov 2026")).toHaveAttribute("aria-pressed", "false");
  });

  it("pulsar un día ocupado tampoco lo elige", async () => {
    const user = userEvent.setup();
    simularDisponibilidad(OCUPADOS);
    render(<SelectorDisponibilidad publicacionId={ID} />);
    await waitFor(() => expect(dia("20 nov 2026")).toHaveAttribute("data-estado", "reserva"));

    await user.click(dia("20 nov 2026"));

    expect(screen.getByRole("alert")).toHaveTextContent("Ese día ya tiene una reserva confirmada.");
    expect(dia("20 nov 2026")).toHaveAttribute("aria-pressed", "false");
  });

  it("elige un período de días libres y lo entrega para la solicitud", async () => {
    const user = userEvent.setup();
    const { pedidos } = simularDisponibilidad(OCUPADOS);
    const onPeriodoElegido = vi.fn();
    render(<SelectorDisponibilidad publicacionId={ID} onPeriodoElegido={onPeriodoElegido} />);
    await waitFor(() => expect(dia("21 nov 2026")).toHaveAttribute("data-estado", "libre"));

    await user.click(dia("21 nov 2026"));
    expect(screen.getByText("Desde el 21 nov 2026. Elige el último día.")).toBeInTheDocument();
    await user.click(dia("23 nov 2026"));

    expect(await screen.findByText("21 nov 2026 – 23 nov 2026")).toBeInTheDocument();
    expect(onPeriodoElegido).toHaveBeenLastCalledWith({ desde: "2026-11-21", hasta: "2026-11-23" });
    expect(pedidos.at(-1)).toBe("2026-11-21..2026-11-23");
    expect(dia("22 nov 2026")).toHaveAttribute("aria-pressed", "true");
  });

  it("no deja elegir un período que incluya días ocupados", async () => {
    const user = userEvent.setup();
    simularDisponibilidad(OCUPADOS);
    const onPeriodoElegido = vi.fn();
    render(<SelectorDisponibilidad publicacionId={ID} onPeriodoElegido={onPeriodoElegido} />);
    await waitFor(() => expect(dia("19 nov 2026")).toHaveAttribute("data-estado", "libre"));

    await user.click(dia("19 nov 2026"));
    await user.click(dia("21 nov 2026"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El período elegido incluye días ocupados.",
    );
    expect(onPeriodoElegido).not.toHaveBeenCalledWith(expect.objectContaining({ hasta: "2026-11-21" }));
    expect(dia("21 nov 2026")).toHaveAttribute("aria-pressed", "false");
    expect(dia("19 nov 2026")).toHaveAttribute("aria-pressed", "true");
  });

  it("revisa con el backend un período que pasa a otro mes", async () => {
    const user = userEvent.setup();
    const { pedidos } = simularDisponibilidad([
      { inicio: "2026-12-02T00:00:00-06:00", fin: "2026-12-03T00:00:00-06:00", origen: "BLOQUEO" },
    ]);
    render(<SelectorDisponibilidad publicacionId={ID} />);
    await waitFor(() => expect(dia("28 nov 2026")).toHaveAttribute("data-estado", "libre"));

    await user.click(dia("28 nov 2026"));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await waitFor(() => expect(dia("4 dic 2026")).toHaveAttribute("data-estado", "libre"));
    await user.click(dia("4 dic 2026"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El período elegido incluye días ocupados.",
    );
    expect(pedidos.at(-1)).toBe("2026-11-28..2026-12-04");
  });

  it("un día antes de Desde empieza de nuevo y «Limpiar selección» borra todo", async () => {
    const user = userEvent.setup();
    simularDisponibilidad([]);
    const onPeriodoElegido = vi.fn();
    render(<SelectorDisponibilidad publicacionId={ID} onPeriodoElegido={onPeriodoElegido} />);
    await waitFor(() => expect(dia("22 nov 2026")).toHaveAttribute("data-estado", "libre"));

    await user.click(dia("22 nov 2026"));
    await user.click(dia("19 nov 2026"));
    expect(screen.getByText("Desde el 19 nov 2026. Elige el último día.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));
    expect(screen.getByText("Pulsa el primer y el último día que quieres.")).toBeInTheDocument();
    expect(onPeriodoElegido).toHaveBeenLastCalledWith(null);
  });

  it("si no puede revisar el período, avisa", async () => {
    const user = userEvent.setup();
    let llamadas = 0;
    simularDisponibilidad([], () => (++llamadas > 1 ? Promise.reject(new TypeError("x")) : null));
    render(<SelectorDisponibilidad publicacionId={ID} />);
    await waitFor(() => expect(dia("21 nov 2026")).toHaveAttribute("data-estado", "libre"));

    await user.click(dia("21 nov 2026"));
    await user.click(dia("22 nov 2026"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo revisar el período. Revisa tu conexión.",
    );
  });
});

describe("CalendarioDisponibilidad: estados", () => {
  it("cargando y error con reintento", async () => {
    const user = userEvent.setup();
    let llamadas = 0;
    simularDisponibilidad([], () =>
      ++llamadas === 1 ? json({ statusCode: 502, message: "x" }, 502) : null,
    );

    render(<CalendarioDisponibilidad publicacionId={ID} />);

    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el calendario. Revisa tu conexión.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false"));
  });

  it("sin onElegirDia es solo de lectura", async () => {
    simularDisponibilidad([]);

    render(<CalendarioDisponibilidad publicacionId={ID} />);

    await waitFor(() => expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "false"));
    expect(dia("21 nov 2026")).toBeDisabled();
  });
});
