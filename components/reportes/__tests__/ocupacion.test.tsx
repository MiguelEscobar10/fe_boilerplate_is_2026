import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelOcupacion } from "../panel-ocupacion";
import { SelectorRangoFechas, validarRango } from "../selector-rango-fechas";
import { TablaOcupacionPorBien } from "../tabla-ocupacion-por-bien";
import { formatearTasa, mesEnCurso, type ItemOcupacion } from "@/lib/reportes/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const NOV = { desde: "2026-11-01", hasta: "2026-11-30" };

const item = (cambios: Partial<ItemOcupacion> = {}): ItemOcupacion => ({
  publicacionId: "p-1",
  nombre: "Taladro",
  diasOcupados: 6,
  diasDisponibles: 28,
  tasaOcupacion: 21.4,
  ...cambios,
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function simularApi(responder: (url: URL) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname !== "/api/reportes/ocupacion") throw new Error(`No esperada: ${url}`);
    return responder(url);
  });
  vi.stubGlobal("fetch", fetchMock);
  const consultas = () =>
    fetchMock.mock.calls.map(([e]) => Object.fromEntries(new URL(String(e), "http://x").searchParams));
  return { fetchMock, consultas };
}

afterEach(() => vi.useRealTimers());

describe("formatearTasa y mesEnCurso", () => {
  it.each([
    [21.4, "21.4 %"],
    [0, "0.0 %"],
    [100, "100.0 %"],
    [33.3, "33.3 %"],
  ])("%d → %s", (tasa, texto) => {
    expect(formatearTasa(tasa)).toBe(texto);
  });

  it("toma el mes en hora de El Salvador", () => {
    // 1 de diciembre 03:00 UTC = 30 de noviembre 21:00 en El Salvador.
    expect(mesEnCurso(new Date("2026-12-01T03:00:00Z"))).toEqual(NOV);
    expect(mesEnCurso(new Date("2028-02-10T12:00:00Z"))).toEqual({
      desde: "2028-02-01",
      hasta: "2028-02-29",
    });
  });
});

describe("TablaOcupacionPorBien", () => {
  it("muestra por bien los días y la tasa con un decimal y %", () => {
    render(
      <TablaOcupacionPorBien
        items={[item(), item({ publicacionId: "p-2", nombre: "Sala", diasOcupados: 0, diasDisponibles: 30, tasaOcupacion: 0 })]}
      />,
    );

    const taladro = screen.getByRole("row", { name: /Taladro/ });
    expect(within(taladro).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "6",
      "28",
      "21.4 %",
    ]);
    const sala = screen.getByRole("row", { name: /Sala/ });
    expect(within(sala).getByText("0.0 %")).toBeInTheDocument();
  });

  it("sin bienes lo dice", () => {
    render(<TablaOcupacionPorBien items={[]} />);
    expect(screen.getByText("Todavía no tienes bienes publicados.")).toBeInTheDocument();
  });
});

describe("SelectorRangoFechas", () => {
  it.each([
    [{ desde: "", hasta: "2026-11-30" }, "las dos fechas"],
    [{ desde: "2026-11-30", hasta: "2026-11-01" }, "posterior"],
    [{ desde: "2026-01-01", hasta: "2027-01-02" }, "366"],
  ])("validarRango(%o) explica el error", (rango, mensaje) => {
    expect(validarRango(rango)).toMatch(mensaje);
  });

  it("acepta 366 días exactos", () => {
    expect(validarRango({ desde: "2028-01-01", hasta: "2028-12-31" })).toBeNull();
  });

  it("no consulta con un rango inválido y lo explica", async () => {
    const onCambio = vi.fn();
    render(<SelectorRangoFechas rango={NOV} onCambio={onCambio} />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Desde"));
    await user.type(screen.getByLabelText("Desde"), "2026-12-15");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("posterior");
    expect(onCambio).not.toHaveBeenCalled();
  });
});

describe("PanelOcupacion", () => {
  it("por defecto consulta el mes en curso y muestra cargando y luego los datos", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T09:00:00Z"));
    let responder: (r: Response) => void = () => {};
    const api = simularApi(() => new Promise<Response>((r) => (responder = r)));

    render(<PanelOcupacion />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(api.consultas()).toEqual([NOV]);
    responder(json({ ...NOV, items: [item()] }));
    expect(await screen.findByText("21.4 %")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("al cambiar el rango vuelve a consultar con las fechas elegidas", async () => {
    const api = simularApi((url) =>
      json({
        desde: url.searchParams.get("desde"),
        hasta: url.searchParams.get("hasta"),
        items: [item({ tasaOcupacion: url.searchParams.get("desde") === "2026-10-01" ? 50 : 21.4 })],
      }),
    );
    render(<PanelOcupacion rangoInicial={NOV} />);
    await screen.findByText("21.4 %");
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Desde"));
    await user.type(screen.getByLabelText("Desde"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("50.0 %")).toBeInTheDocument();
    expect(api.consultas().at(-1)).toEqual({ desde: "2026-10-01", hasta: "2026-11-30" });
  });

  it("un arrendatario (403) ve «Acceso restringido» sin datos ni selector", async () => {
    simularApi(() => json({ message: "Forbidden resource" }, 403));

    render(<PanelOcupacion rangoInicial={NOV} />);

    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Desde")).not.toBeInTheDocument();
  });

  it("ante un error muestra el mensaje y «Reintentar» vuelve a consultar", async () => {
    let fallar = true;
    const api = simularApi(() => (fallar ? json({ message: "x" }, 500) : json({ ...NOV, items: [item()] })));
    render(<PanelOcupacion rangoInicial={NOV} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar el reporte");
    fallar = false;
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("21.4 %")).toBeInTheDocument();
    expect(api.fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sin conexión lo dice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<PanelOcupacion rangoInicial={NOV} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");
  });

  it("muestra el mensaje del backend ante un 400", async () => {
    simularApi(() => json({ message: ["El rango puede tener como máximo 366 días."] }, 400));
    render(<PanelOcupacion rangoInicial={NOV} />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("como máximo 366 días"),
    );
  });
});
