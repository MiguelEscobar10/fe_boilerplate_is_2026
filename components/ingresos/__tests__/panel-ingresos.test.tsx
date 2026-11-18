import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelIngresos } from "../panel-ingresos";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { ReporteIngresos } from "@/lib/ingresos/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

type Respuesta = Response | Promise<Response>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function reporte(datos: Partial<ReporteIngresos> = {}): ReporteIngresos {
  return {
    desde: "2026-11-01",
    hasta: "2026-11-30",
    moneda: "USD",
    total: "92.50",
    porBien: [
      { publicacionId: "3f6c1e2a-8b4d-4c1f-9a7e-2d5b6c7a8e90", nombre: "Taladro", ingreso: "75.50" },
      { publicacionId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", nombre: "Carpa", ingreso: "0.00" },
      { publicacionId: "0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f", nombre: "Bordes", ingreso: "17" },
    ],
    ...datos,
  };
}

/** Simula /api/reportes/ingresos y guarda los query params de cada llamada. */
function simularApi(responder: (query: URLSearchParams) => Respuesta) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname !== "/api/reportes/ingresos") {
      throw new Error(`Llamada no esperada: ${url.pathname}`);
    }
    return responder(url.searchParams);
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    fetchMock,
    consultas: () =>
      fetchMock.mock.calls.map(([entrada]) =>
        Object.fromEntries(new URL(String(entrada), "http://localhost").searchParams),
      ),
  };
}

const NOVIEMBRE = { desde: "2026-11-01", hasta: "2026-11-30" };

function fila(nombre: string) {
  const tr = screen.getByRole("rowheader", { name: nombre }).closest("tr");
  if (!tr) throw new Error(`No hay fila para «${nombre}»`);
  return tr;
}

function cambiarFechas(desde: string, hasta: string) {
  fireEvent.change(screen.getByLabelText("Desde"), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: hasta } });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("PanelIngresos: datos", () => {
  it("muestra el total y el ingreso por bien con $ y dos decimales", async () => {
    simularApi(() => json(reporte()));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByTestId("total-ingresos")).toHaveTextContent("$92.50");
    expect(within(fila("Taladro")).getByRole("cell")).toHaveTextContent("$75.50");
    expect(within(fila("Bordes")).getByRole("cell")).toHaveTextContent("$17.00");
    expect(within(fila("Total")).getByRole("cell")).toHaveTextContent("$92.50");
    expect(screen.getByText("Total del 01/11/2026 al 30/11/2026")).toBeInTheDocument();
  });

  it("un bien sin ingresos muestra $0.00", async () => {
    simularApi(() => json(reporte()));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    await screen.findByTestId("total-ingresos");
    expect(within(fila("Carpa")).getByRole("cell")).toHaveTextContent("$0.00");
  });

  it("sin bienes publicados muestra el aviso en lugar de la tabla", async () => {
    simularApi(() => json(reporte({ total: "0.00", porBien: [] })));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByText("Aún no tienes bienes publicados.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Publicar un equipo o espacio" })).toHaveAttribute(
      "href",
      "/publicaciones/nueva",
    );
  });
});

describe("PanelIngresos: rango", () => {
  it("por defecto consulta el mes en curso en hora de El Salvador", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
    const api = simularApi(() => json(reporte()));

    render(<PanelIngresos />);

    await screen.findByTestId("total-ingresos");
    expect(api.consultas()).toEqual([NOVIEMBRE]);
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
  });

  it("el 1 de diciembre a las 05:59Z todavía consulta noviembre; a las 06:00Z, diciembre", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-01T05:59:59Z"));
    const api = simularApi(() => json(reporte()));

    const { unmount } = render(<PanelIngresos />);
    await screen.findByTestId("total-ingresos");
    expect(api.consultas()[0]).toEqual(NOVIEMBRE);
    unmount();

    vi.setSystemTime(new Date("2026-12-01T06:00:00Z"));
    render(<PanelIngresos />);
    await waitFor(() => expect(api.consultas()).toHaveLength(2));
    expect(api.consultas()[1]).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });

  it("cambiar el rango vuelve a consultar con los parámetros correctos", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        q.get("desde") === "2026-10-01"
          ? reporte({ desde: "2026-10-01", hasta: "2026-10-15", total: "45.00", porBien: [
              { publicacionId: "3f6c1e2a-8b4d-4c1f-9a7e-2d5b6c7a8e90", nombre: "Taladro", ingreso: "45.00" },
            ] })
          : reporte(),
      ),
    );
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    cambiarFechas("2026-10-01", "2026-10-15");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("Total del 01/10/2026 al 15/10/2026")).toBeInTheDocument();
    expect(screen.getByTestId("total-ingresos")).toHaveTextContent("$45.00");
    expect(api.consultas()).toEqual([NOVIEMBRE, { desde: "2026-10-01", hasta: "2026-10-15" }]);
  });

  it("desde posterior a hasta muestra el error y no llama al backend", async () => {
    const user = userEvent.setup();
    const api = simularApi(() => json(reporte()));
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    cambiarFechas("2026-11-20", "2026-11-10");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha «Desde» no puede ser posterior a «Hasta».",
    );
    expect(screen.getByLabelText("Desde")).toHaveAttribute("aria-invalid", "true");
    expect(api.fetchMock).toHaveBeenCalledOnce();
  });

  it("más de 366 días muestra el error y no llama al backend", async () => {
    const user = userEvent.setup();
    const api = simularApi(() => json(reporte()));
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    cambiarFechas("2025-01-01", "2026-11-30");
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("El rango no puede tener más de 366 días.");
    expect(api.fetchMock).toHaveBeenCalledOnce();
  });

  it("muestra el mensaje del 400 del backend", async () => {
    simularApi(() =>
      json({ statusCode: 400, message: "hasta no es una fecha válida.", error: "Bad Request" }, 400),
    );

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("hasta no es una fecha válida.");
  });
});

describe("PanelIngresos: estados y errores", () => {
  it("muestra el estado de carga y luego anuncia el resultado", async () => {
    let responder: (r: Response) => void = () => {};
    simularApi(() => new Promise<Response>((r) => (responder = r)));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando ingresos...");
    expect(screen.getByRole("button", { name: "Consultando..." })).toBeDisabled();
    responder(json(reporte()));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Reporte del 01/11/2026 al 30/11/2026: total $92.50.",
      ),
    );
  });

  it("muestra el error de red y permite reintentar", async () => {
    const user = userEvent.setup();
    let llamada = 0;
    const api = simularApi(() =>
      ++llamada === 1 ? Promise.reject(new TypeError("Failed to fetch")) : json(reporte()),
    );
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el reporte. Revisa tu conexión.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByTestId("total-ingresos")).toHaveTextContent("$92.50");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.consultas()).toEqual([NOVIEMBRE, NOVIEMBRE]);
  });

  it("un 500 muestra el error genérico", async () => {
    simularApi(() => json({ statusCode: 500, message: "Internal server error" }, 500));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el reporte. Inténtalo de nuevo.",
    );
  });

  it("un 403 muestra «acceso restringido»", async () => {
    simularApi(() => json({ statusCode: 403, message: "Forbidden resource" }, 403));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Desde")).not.toBeInTheDocument();
  });

  it("un 401 manda al login", async () => {
    simularApi(() => json({ statusCode: 401, message: "La sesión expiró." }, 401));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    await waitFor(() => expect(irALogin).toHaveBeenCalledOnce());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
