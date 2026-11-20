import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListadoCatalogo } from "../listado-catalogo";
import { crearPublicacion, json, pagina, simularApi } from "./utilidades";
import { hoyEnElSalvador } from "@/lib/ingresos/fechas";
import { sumarDias } from "@/lib/disponibilidad/fechas";
import { SIN_FILTROS } from "@/lib/catalogo/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const HOY = hoyEnElSalvador();
const EN_3_DIAS = sumarDias(HOY, 3);
const EN_5_DIAS = sumarDias(HOY, 5);

const panel = () => screen.getByRole("form", { name: "Filtros del catálogo" });
const aplicar = () => screen.getByRole("button", { name: "Aplicar filtros" });
const fecha = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

/** Responde "Salón" si llega algún filtro y "Taladro" si no. */
function apiConFiltros() {
  return simularApi((q) =>
    json(
      pagina([
        crearPublicacion({
          nombre: ["tipo", "ubicacion", "precioMin", "precioMax", "fechaInicio"].some((c) =>
            q.has(c),
          )
            ? "Salón"
            : "Taladro",
        }),
      ]),
    ),
  );
}

describe("FiltrosCatalogo: aplicar", () => {
  it("los filtros actualizan los resultados, van al backend y quedan en la URL", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = apiConFiltros();
    render(<ListadoCatalogo buscarInicial="sala" paginaInicial={2} />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.selectOptions(screen.getByLabelText("Tipo"), "ESPACIO");
    await user.type(screen.getByLabelText("Ubicación"), "  San Salvador ");
    await user.type(screen.getByLabelText("Precio mínimo"), "5");
    await user.type(screen.getByLabelText("Precio máximo"), "30.50");
    fecha("Fecha de inicio", EN_3_DIAS);
    fecha("Fecha de fin", EN_5_DIAS);
    await user.click(aplicar());

    expect(await screen.findByRole("heading", { name: "Salón" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Taladro" })).not.toBeInTheDocument();
    // Conserva la búsqueda y vuelve a la página 1.
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      buscar: "sala",
      tipo: "ESPACIO",
      ubicacion: "San Salvador",
      precioMin: "5",
      precioMax: "30.50",
      fechaInicio: EN_3_DIAS,
      fechaFin: EN_5_DIAS,
      page: "1",
      limit: "12",
    });
    expect(replace).toHaveBeenLastCalledWith(
      null,
      "",
      `/?buscar=sala&tipo=ESPACIO&ubicacion=San+Salvador&precioMin=5&precioMax=30.50&fechaInicio=${EN_3_DIAS}&fechaFin=${EN_5_DIAS}`,
    );
  });

  it("arranca con los filtros que vienen de la URL", async () => {
    const api = apiConFiltros();

    render(
      <ListadoCatalogo filtrosIniciales={{ ...SIN_FILTROS, tipo: "EQUIPO", precioMax: "20" }} />,
    );

    await screen.findByRole("heading", { name: "Salón" });
    expect(Object.fromEntries(api.llamadas()[0])).toEqual({
      tipo: "EQUIPO",
      precioMax: "20",
      page: "1",
      limit: "12",
    });
    expect(screen.getByLabelText("Tipo")).toHaveValue("EQUIPO");
    expect(screen.getByLabelText("Precio máximo")).toHaveValue("20");
  });

  it("mientras carga, el botón dice «Aplicando...» y está deshabilitado", async () => {
    let responder: (r: Response) => void = () => {};
    simularApi(() => new Promise<Response>((r) => (responder = r)));

    render(<ListadoCatalogo />);

    expect(screen.getByRole("button", { name: "Aplicando..." })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando publicaciones...");
    responder(json(pagina([crearPublicacion()])));
    await waitFor(() => expect(aplicar()).toBeEnabled());
  });
});

describe("FiltrosCatalogo: rangos inválidos", () => {
  it.each([
    [
      "precio mínimo mayor que el máximo",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("Precio mínimo"), "30");
        await user.type(screen.getByLabelText("Precio máximo"), "5");
      },
      "El precio mínimo no puede ser mayor que el máximo.",
    ],
    [
      "precio que no es un número",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("Precio máximo"), "caro");
      },
      "El precio máximo debe ser un número de 0 en adelante, con hasta dos decimales.",
    ],
    [
      "fecha de inicio pasada",
      async () => {
        fecha("Fecha de inicio", sumarDias(HOY, -1));
        fecha("Fecha de fin", EN_3_DIAS);
      },
      "La fecha de inicio no puede estar en el pasado.",
    ],
    [
      "fecha de fin anterior a la de inicio",
      async () => {
        fecha("Fecha de inicio", EN_5_DIAS);
        fecha("Fecha de fin", EN_3_DIAS);
      },
      "La fecha de fin no puede ser anterior a la de inicio.",
    ],
    [
      "solo una de las dos fechas",
      async () => {
        fecha("Fecha de inicio", EN_3_DIAS);
      },
      "Para filtrar por fechas elige la fecha de inicio y la de fin.",
    ],
  ])("con %s muestra el error y no cambia los resultados", async (_caso, llenar, mensaje) => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = apiConFiltros();
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });

    await llenar(user);
    await user.click(aplicar());

    expect(within(panel()).getByRole("alert")).toHaveTextContent(mensaje);
    expect(screen.getByRole("heading", { name: "Taladro" })).toBeInTheDocument();
    expect(api.llamadas()).toHaveLength(1);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument();
  });

  it("al corregir el rango el error desaparece y se consulta", async () => {
    const user = userEvent.setup();
    const api = apiConFiltros();
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });
    await user.type(screen.getByLabelText("Precio mínimo"), "30");
    await user.type(screen.getByLabelText("Precio máximo"), "5");
    await user.click(aplicar());
    expect(within(panel()).getByRole("alert")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Precio máximo"));
    await user.type(screen.getByLabelText("Precio máximo"), "50");
    await user.click(aplicar());

    expect(await screen.findByRole("heading", { name: "Salón" })).toBeInTheDocument();
    expect(within(panel()).queryByRole("alert")).not.toBeInTheDocument();
    expect(api.llamadas()[1].get("precioMax")).toBe("50");
  });
});

describe("FiltrosActivos y limpiar", () => {
  const iniciales = {
    ...SIN_FILTROS,
    tipo: "ESPACIO" as const,
    ubicacion: "Escalón",
    precioMin: "5",
    precioMax: "30",
  };

  it("muestra los filtros aplicados y quita uno sin tocar los demás", async () => {
    const user = userEvent.setup();
    const api = apiConFiltros();
    render(<ListadoCatalogo filtrosIniciales={iniciales} />);
    await screen.findByRole("heading", { name: "Salón" });

    expect(screen.getByText("Tipo: Espacio")).toBeInTheDocument();
    expect(screen.getByText("Ubicación: Escalón")).toBeInTheDocument();
    expect(screen.getByText("Precio: $5 a $30")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar filtro Precio: $5 a $30" }));

    await waitFor(() => expect(api.llamadas()).toHaveLength(2));
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      tipo: "ESPACIO",
      ubicacion: "Escalón",
      page: "1",
      limit: "12",
    });
    expect(screen.queryByText("Precio: $5 a $30")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Precio mínimo")).toHaveValue("");
    expect(screen.getByLabelText("Tipo")).toHaveValue("ESPACIO");
  });

  it("«Limpiar filtros» los quita todos, conserva la búsqueda y limpia la URL", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = apiConFiltros();
    render(<ListadoCatalogo buscarInicial="sala" filtrosIniciales={iniciales} />);
    await screen.findByRole("heading", { name: "Salón" });

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findByRole("heading", { name: "Taladro" })).toBeInTheDocument();
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      buscar: "sala",
      page: "1",
      limit: "12",
    });
    expect(replace).toHaveBeenLastCalledWith(null, "", "/?buscar=sala");
    expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tipo")).toHaveValue("");
    expect(screen.getByLabelText("Ubicación")).toHaveValue("");
  });

  it("el estado vacío ofrece limpiar los filtros", async () => {
    const user = userEvent.setup();
    simularApi((q) =>
      json(q.has("tipo") ? pagina([]) : pagina([crearPublicacion({ nombre: "Taladro" })])),
    );
    render(<ListadoCatalogo filtrosIniciales={{ ...SIN_FILTROS, tipo: "ESPACIO" }} />);

    const vacio = (
      await screen.findByText("Ninguna publicación cumple estos filtros. Cambia alguno o límpialos.")
    ).parentElement!;
    await user.click(within(vacio).getByRole("button", { name: "Limpiar filtros" }));

    expect(await screen.findByRole("heading", { name: "Taladro" })).toBeInTheDocument();
  });

  it("vacío con búsqueda y filtros ofrece las dos salidas", async () => {
    simularApi(() => json(pagina([])));

    render(
      <ListadoCatalogo buscarInicial="yate" filtrosIniciales={{ ...SIN_FILTROS, tipo: "EQUIPO" }} />,
    );

    const vacio = (
      await screen.findByText(/No encontramos publicaciones para «yate» con estos filtros/)
    ).parentElement!;
    expect(within(vacio).getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
    expect(
      within(vacio).getByRole("button", { name: "Ver todas las publicaciones" }),
    ).toBeInTheDocument();
  });
});
