// Plan de pruebas de H21 (MP4-30). Los números de criterio son los de Jira.
// El cálculo (AC2) y el filtro por arrendador (AC5) los hace el backend; aquí
// se prueba lo que le toca a la UI: mostrar el total tal cual y no mandar más
// que el rango.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanelIngresos } from "../panel-ingresos";
import IngresosPage from "@/app/ingresos/page";
import { RutaProtegida } from "@/components/ruta-protegida";
import { requireUser, type Rol } from "@/lib/dal";
import type { ReporteIngresos } from "@/lib/ingresos/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));

const NOVIEMBRE = { desde: "2026-11-01", hasta: "2026-11-30" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function reporte(datos: Partial<ReporteIngresos> = {}): ReporteIngresos {
  return {
    ...NOVIEMBRE,
    moneda: "USD",
    total: "30.5",
    porBien: [
      { publicacionId: "3f6c1e2a-8b4d-4c1f-9a7e-2d5b6c7a8e90", nombre: "Proyector", ingreso: "30.5" },
      { publicacionId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", nombre: "Carpa", ingreso: "0.00" },
    ],
    ...datos,
  };
}

function simularApi(responder: (q: URLSearchParams) => Response = () => json(reporte())) {
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

function importeDe(nombre: string) {
  const tr = screen.getByRole("rowheader", { name: nombre }).closest("tr");
  if (!tr) throw new Error(`No hay fila para «${nombre}»`);
  return within(tr).getByRole("cell");
}

async function renderPagina(rol: Rol) {
  vi.mocked(requireUser).mockResolvedValue({ id: "1", email: "a@a.a", rol, nombre: null, telefono: null });
  const elemento = IngresosPage() as ReactElement<{ roles: Rol[]; children: ReactNode }>;
  render(await RutaProtegida(elemento.props));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("H21. Ver los ingresos del arrendador", () => {
  it("AC1: muestra el ingreso total y el de cada bien con dos decimales", async () => {
    simularApi();

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByTestId("total-ingresos")).toHaveTextContent("$30.50");
    expect(importeDe("Proyector")).toHaveTextContent("$30.50");
    expect(importeDe("Total")).toHaveTextContent("$30.50");
  });

  it("AC2: muestra el total que calcula el backend, sin sumar nada (ni depósitos) en el navegador", async () => {
    // Si la UI sumara por su cuenta daría 30.50; debe mostrar el del backend.
    simularApi(() => json(reporte({ total: "25.00" })));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByTestId("total-ingresos")).toHaveTextContent("$25.00");
    expect(importeDe("Total")).toHaveTextContent("$25.00");
  });

  it("AC3: sin elegir fechas consulta el mes en curso (hora de El Salvador)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-21T15:00:00Z"));
    const api = simularApi();

    render(<PanelIngresos />);

    await screen.findByTestId("total-ingresos");
    expect(api.consultas()).toEqual([NOVIEMBRE]);
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
  });

  it("AC3: permite elegir otro rango y lo consulta con desde y hasta", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(q.get("desde") === "2026-10-01" ? reporte({ desde: "2026-10-01", hasta: "2026-10-31", total: "20.00" }) : reporte()),
    );
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-10-31" } });
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(await screen.findByText("Total del 01/10/2026 al 31/10/2026")).toBeInTheDocument();
    expect(screen.getByTestId("total-ingresos")).toHaveTextContent("$20.00");
    expect(api.consultas()[1]).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
  });

  it("AC3: un rango de un solo día (desde = hasta) es válido", async () => {
    const user = userEvent.setup();
    const api = simularApi();
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-15" } });
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() => expect(api.consultas()).toHaveLength(2));
    expect(api.consultas()[1]).toEqual({ desde: "2026-11-15", hasta: "2026-11-15" });
  });

  it("AC4: un bien sin ingresos en el rango aparece con $0.00", async () => {
    simularApi();

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    await screen.findByTestId("total-ingresos");
    expect(importeDe("Carpa")).toHaveTextContent("$0.00");
  });

  it("AC5: la consulta solo manda el rango; el arrendador sale de la sesión", async () => {
    const api = simularApi();

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    await screen.findByTestId("total-ingresos");
    expect(Object.keys(api.consultas()[0]).sort()).toEqual(["desde", "hasta"]);
  });

  it("AC6: un arrendatario no puede abrir el reporte y no se consulta nada", async () => {
    const api = simularApi();

    await renderPagina("ARRENDATARIO");

    expect(screen.getByRole("heading", { name: /Acceso restringido/ })).toBeInTheDocument();
    expect(screen.queryByTestId("total-ingresos")).not.toBeInTheDocument();
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  // DEFECTO (H21-AC6): el criterio pide el texto «Acceso restringido: este
  // reporte es solo para arrendadores»; la UI muestra «Acceso restringido» y
  // «Tu cuenta no tiene permiso para ver esta página.» (RutaProtegida).
  // Cuando se corrija, esta prueba fallará: quitar `.fails`.
  it.fails("AC6: un arrendatario ve «Acceso restringido: este reporte es solo para arrendadores»", async () => {
    simularApi();

    await renderPagina("ARRENDATARIO");

    expect(document.body).toHaveTextContent("Acceso restringido: este reporte es solo para arrendadores");
  });

  it("Negativo: «Desde» posterior a «Hasta» muestra el error y no consulta", async () => {
    const user = userEvent.setup();
    const api = simularApi();
    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);
    await screen.findByTestId("total-ingresos");

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-10" } });
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("La fecha «Desde» no puede ser posterior a «Hasta».");
    expect(api.fetchMock).toHaveBeenCalledOnce();
  });

  it("Negativo: si el backend responde 403, el panel muestra «Acceso restringido» sin datos", async () => {
    simularApi(() => json({ statusCode: 403, message: "Forbidden resource" }, 403));

    render(<PanelIngresos rangoInicial={NOVIEMBRE} />);

    expect(await screen.findByRole("heading", { name: "Acceso restringido" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
