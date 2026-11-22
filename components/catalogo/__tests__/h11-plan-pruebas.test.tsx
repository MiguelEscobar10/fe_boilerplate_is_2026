// Plan de pruebas de H11 (MP4-46). Los números de criterio son los del plan
// de pruebas. En la UI se prueba que los filtros elegidos van al backend y los
// resultados cambian (AC1 a AC3), el mensaje sin resultados con la salida de
// limpiar (AC4) y los rangos inválidos, que no llegan a consultarse (AC5).
// Qué publicaciones cumplen cada filtro y cuáles están ocupadas en las fechas
// lo decide el backend (BE-11.1, test/qa/qa-11.1-filtros.e2e-spec.ts).
import { fireEvent, render, screen, within } from "@testing-library/react";
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
const FILTROS = [
  "tipo",
  "ubicacion",
  "precioMin",
  "precioMax",
  "fechaInicio",
  "fechaFin",
];

const panel = () => screen.getByRole("form", { name: "Filtros del catálogo" });
const aplicar = () => screen.getByRole("button", { name: "Aplicar filtros" });
const fecha = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), {
    target: { value: valor },
  });

/** Responde "Salón" si llega algún filtro y "Taladro" si no. */
function apiConFiltros() {
  return simularApi((q) =>
    json(
      pagina([
        crearPublicacion({
          nombre: FILTROS.some((c) => q.has(c)) ? "Salón" : "Taladro",
        }),
      ]),
    ),
  );
}

describe("H11. Filtrar resultados de búsqueda", () => {
  it("AC1: tipo, ubicación y rango de precios se aplican juntos y los resultados cambian", async () => {
    const user = userEvent.setup();
    const api = apiConFiltros();
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.selectOptions(screen.getByLabelText("Tipo"), "ESPACIO");
    await user.type(screen.getByLabelText("Ubicación"), "San Salvador");
    await user.type(screen.getByLabelText("Precio mínimo"), "5");
    await user.type(screen.getByLabelText("Precio máximo"), "30");
    await user.click(aplicar());

    expect(
      await screen.findByRole("heading", { name: "Salón" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Taladro" }),
    ).not.toBeInTheDocument();
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      tipo: "ESPACIO",
      ubicacion: "San Salvador",
      precioMin: "5",
      precioMax: "30",
      page: "1",
      limit: "12",
    });
    expect(screen.getByText("Tipo: Espacio")).toBeInTheDocument();
    expect(screen.getByText("Ubicación: San Salvador")).toBeInTheDocument();
    expect(screen.getByText("Precio: $5 a $30")).toBeInTheDocument();
  });

  it("AC2: el rango de fechas disponibles va al backend y solo se ve lo que responde", async () => {
    const api = apiConFiltros();
    const user = userEvent.setup();
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });

    fecha("Fecha de inicio", EN_3_DIAS);
    fecha("Fecha de fin", EN_5_DIAS);
    await user.click(aplicar());

    expect(
      await screen.findByRole("heading", { name: "Salón" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Taladro" }),
    ).not.toBeInTheDocument();
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      fechaInicio: EN_3_DIAS,
      fechaFin: EN_5_DIAS,
      page: "1",
      limit: "12",
    });
  });

  it("AC3: la palabra clave y los filtros van juntos, desde la página 1 y de 12 en 12, sin cambiar el orden", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        q.has("tipo")
          ? pagina(
              [
                crearPublicacion({ nombre: "Sala reciente" }),
                crearPublicacion({ nombre: "Sala antigua" }),
              ],
              { total: 13 },
            )
          : pagina([crearPublicacion({ nombre: "Taladro" })], {
              total: 30,
              page: 2,
            }),
      ),
    );
    render(<ListadoCatalogo buscarInicial="sala" paginaInicial={2} />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.selectOptions(screen.getByLabelText("Tipo"), "ESPACIO");
    await user.click(aplicar());

    await screen.findByText("Página 1 de 2");
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      buscar: "sala",
      tipo: "ESPACIO",
      page: "1",
      limit: "12",
    });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Sala reciente", "Sala antigua"]);
  });

  it("AC4: si nada cumple los filtros muestra un mensaje y deja limpiarlos", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        q.has("tipo")
          ? pagina([])
          : pagina([crearPublicacion({ nombre: "Taladro" })]),
      ),
    );
    render(
      <ListadoCatalogo
        filtrosIniciales={{ ...SIN_FILTROS, tipo: "ESPACIO" }}
      />,
    );

    const vacio = (
      await screen.findByText(
        "Ninguna publicación cumple estos filtros. Cambia alguno o límpialos.",
      )
    ).parentElement!;
    // Los filtros siguen ahí para modificarlos.
    expect(screen.getByLabelText("Tipo")).toBeEnabled();
    expect(screen.getByLabelText("Tipo")).toHaveValue("ESPACIO");

    await user.click(
      within(vacio).getByRole("button", { name: "Limpiar filtros" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Taladro" }),
    ).toBeInTheDocument();
    expect(FILTROS.some((c) => api.llamadas()[1].has(c))).toBe(false);
  });

  it.each([
    [
      "el precio mínimo es mayor que el máximo",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(screen.getByLabelText("Precio mínimo"), "30");
        await user.type(screen.getByLabelText("Precio máximo"), "5");
      },
      "El precio mínimo no puede ser mayor que el máximo.",
    ],
    [
      "el rango de fechas termina antes de empezar",
      async () => {
        fecha("Fecha de inicio", EN_5_DIAS);
        fecha("Fecha de fin", EN_3_DIAS);
      },
      "La fecha de fin no puede ser anterior a la de inicio.",
    ],
    [
      "el rango de fechas empieza en el pasado",
      async () => {
        fecha("Fecha de inicio", sumarDias(HOY, -1));
        fecha("Fecha de fin", EN_3_DIAS);
      },
      "La fecha de inicio no puede estar en el pasado.",
    ],
  ])(
    "AC5: si %s explica el error y los resultados no cambian",
    async (_caso, llenar, mensaje) => {
      const user = userEvent.setup();
      const api = apiConFiltros();
      render(<ListadoCatalogo />);
      await screen.findByRole("heading", { name: "Taladro" });

      await llenar(user);
      await user.click(aplicar());

      expect(within(panel()).getByRole("alert")).toHaveTextContent(mensaje);
      expect(
        screen.getByRole("heading", { name: "Taladro" }),
      ).toBeInTheDocument();
      expect(api.llamadas()).toHaveLength(1);
      expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument();
    },
  );

  it("Negativo: un precio que no es un número muestra el error y no consulta", async () => {
    const user = userEvent.setup();
    const api = apiConFiltros();
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.type(screen.getByLabelText("Precio máximo"), "caro");
    await user.click(aplicar());

    expect(within(panel()).getByRole("alert")).toHaveTextContent(
      "El precio máximo debe ser un número de 0 en adelante, con hasta dos decimales.",
    );
    expect(api.llamadas()).toHaveLength(1);
  });
});
