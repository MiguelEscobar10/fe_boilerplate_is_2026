import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { ItemOcupacion } from "@/lib/reportes/tipos";
import { PanelOcupacion } from "../panel-ocupacion";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const rango = { desde: "2026-11-01", hasta: "2026-11-30" };
const equipo: ItemOcupacion = {
  publicacionId: "qa-equipo",
  nombre: "Equipo de Ricardo",
  diasOcupados: 3,
  diasDisponibles: 30,
  tasaOcupacion: 10,
};

function simularRespuesta(body: unknown, status = 200) {
  const consultar = vi.fn(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", consultar);
  return consultar;
}

async function valoresDeFila(nombre: string) {
  const fila = await screen.findByRole("row", { name: new RegExp(nombre) });
  return within(fila).getAllByRole("cell").map((celda) => celda.textContent);
}

describe("H22. Ver la tasa de ocupación de cada bien (interfaz)", () => {
  // El backend calcula los días, aplica los estados y acota los bienes al
  // arrendador. Estas pruebas verifican cómo se presenta esa respuesta.
  it("AC1: muestra los días sin traslapes y la tasa redondeada a un decimal", async () => {
    // Las reservas del 1 al 5 y del 4 al 7 ocupan 7 días de los 30.
    const consultar = simularRespuesta({
      ...rango,
      items: [{ ...equipo, diasOcupados: 7, tasaOcupacion: 23.3 }],
    });
    render(<PanelOcupacion rangoInicial={rango} />);

    expect(await valoresDeFila(equipo.nombre)).toEqual(["7", "30", "23.3 %"]);
    expect(consultar).toHaveBeenCalledWith(
      "/api/reportes/ocupacion?desde=2026-11-01&hasta=2026-11-30",
      expect.any(Object),
    );
  });

  it("AC2: muestra los totales que excluyen los días bloqueados", async () => {
    // El bloqueo quita seis días disponibles, dos de ellos ocupados.
    simularRespuesta({
      ...rango,
      items: [{ ...equipo, diasOcupados: 1, diasDisponibles: 24, tasaOcupacion: 4.2 }],
    });
    render(<PanelOcupacion rangoInicial={rango} />);

    expect(await valoresDeFila(equipo.nombre)).toEqual(["1", "24", "4.2 %"]);
    expect(screen.getByText(/Los días bloqueados no cuentan como disponibles/))
      .toBeInTheDocument();
  });

  it("AC3: presenta la ocupación devuelta para CONFIRMADA, EN_CURSO y COMPLETADA", async () => {
    // Una noche por cada estado admitido. Las pendientes y canceladas no
    // forman parte de los totales devueltos por el backend.
    simularRespuesta({ ...rango, items: [equipo] });
    render(<PanelOcupacion rangoInicial={rango} />);

    expect(await valoresDeFila(equipo.nombre)).toEqual(["3", "30", "10.0 %"]);
  });

  it("AC4: muestra 0.0 % para el bien sin reservas", async () => {
    simularRespuesta({
      ...rango,
      items: [{ ...equipo, diasOcupados: 0, tasaOcupacion: 0 }],
    });
    render(<PanelOcupacion rangoInicial={rango} />);

    expect(await valoresDeFila(equipo.nombre)).toEqual(["0", "30", "0.0 %"]);
  });

  it("AC5: lista solo los bienes propios incluidos en la respuesta del reporte", async () => {
    const sala: ItemOcupacion = {
      ...equipo,
      publicacionId: "qa-sala",
      nombre: "Sala de Ricardo",
    };
    simularRespuesta({ ...rango, items: [equipo, sala] });
    render(<PanelOcupacion rangoInicial={rango} />);

    const tabla = await screen.findByRole("table", { name: /Tasa de ocupación por bien/ });
    expect(within(tabla).getAllByRole("rowheader").map((celda) => celda.textContent))
      .toEqual([equipo.nombre, sala.nombre]);
  });

  it("AC6: si el arrendatario recibe 403, no ve el reporte ni el selector", async () => {
    simularRespuesta({ message: "Forbidden resource" }, 403);
    render(<PanelOcupacion rangoInicial={rango} />);

    expect(await screen.findByRole("heading", { name: "Acceso restringido" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Consultar" })).not.toBeInTheDocument();
  });

  it("NEG1: un rango invertido se explica sin volver a consultar el reporte", async () => {
    const consultar = simularRespuesta({ ...rango, items: [equipo] });
    render(<PanelOcupacion rangoInicial={rango} />);
    await screen.findByRole("table");
    const usuario = userEvent.setup();

    await usuario.clear(screen.getByLabelText("Desde"));
    await usuario.type(screen.getByLabelText("Desde"), "2026-12-01");
    await usuario.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("posterior");
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it("NEG2: si la sesión expira, envía al inicio de sesión sin mostrar datos", async () => {
    simularRespuesta({ message: "Unauthorized" }, 401);
    render(<PanelOcupacion rangoInicial={rango} />);

    await waitFor(() => expect(irALogin).toHaveBeenCalledOnce());
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
