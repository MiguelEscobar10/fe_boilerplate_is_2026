// Plan de pruebas de H02 (MP4-42). Los números de criterio son los del plan
// de pruebas. En la UI se prueba que la búsqueda manda el texto al backend y
// muestra lo que responde (AC1), el orden y las páginas de 12 (AC2) y el
// mensaje sin resultados (AC3). Qué publicaciones coinciden, sin distinguir
// mayúsculas ni acentos, y que las desactivadas no salgan (AC4) lo decide el
// backend (BE-02.1, test/qa/qa-02.1-busqueda.e2e-spec.ts).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListadoCatalogo } from "../listado-catalogo";
import {
  crearPublicacion,
  errorDeRed,
  json,
  pagina,
  simularApi,
} from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const campo = () => screen.getByLabelText("Buscar equipos y espacios");
const titulos = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

describe("H02. Buscar equipos y espacios por palabra clave", () => {
  it("AC1: al buscar «camara» manda el texto al backend y muestra las publicaciones que coinciden", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        q.get("buscar") === "camara"
          ? pagina([
              crearPublicacion({ nombre: "Cámara réflex" }),
              crearPublicacion({ nombre: "CÁMARA de video" }),
            ])
          : pagina([crearPublicacion({ nombre: "Taladro" })]),
      ),
    );
    render(<ListadoCatalogo />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.type(campo(), "camara");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      await screen.findByRole("heading", { name: "Cámara réflex" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "CÁMARA de video" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Taladro" }),
    ).not.toBeInTheDocument();
    expect(api.llamadas()[1].get("buscar")).toBe("camara");
  });

  it("AC2: pide páginas de 12 sin elegir otro orden y muestra las publicaciones en el orden que llegan", async () => {
    const api = simularApi(() =>
      json(
        pagina(
          [
            crearPublicacion({ nombre: "La más reciente" }),
            crearPublicacion({ nombre: "La de en medio" }),
            crearPublicacion({ nombre: "La más antigua" }),
          ],
          { total: 13 },
        ),
      ),
    );

    render(<ListadoCatalogo />);

    await screen.findByText("Página 1 de 2");
    expect(Object.fromEntries(api.llamadas()[0])).toEqual({
      page: "1",
      limit: "12",
    });
    expect(titulos()).toEqual([
      "La más reciente",
      "La de en medio",
      "La más antigua",
    ]);
  });

  it("AC2: con 13 resultados, «Siguiente» pide la página 2", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        pagina([crearPublicacion()], {
          total: 13,
          page: Number(q.get("page")),
        }),
      ),
    );
    render(<ListadoCatalogo />);
    await screen.findByText("Página 1 de 2");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    await screen.findByText("Página 2 de 2");
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      page: "2",
      limit: "12",
    });
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("AC3: sin coincidencias muestra un mensaje informativo y deja modificar la búsqueda", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(
        q.get("buscar") === "unicornio"
          ? pagina([])
          : pagina([crearPublicacion({ nombre: "Escalera" })]),
      ),
    );
    render(<ListadoCatalogo buscarInicial="unicornio" />);

    expect(
      await screen.findByText(
        "No encontramos publicaciones para «unicornio». Prueba con otra palabra o borra la búsqueda.",
      ),
    ).toBeInTheDocument();
    expect(campo()).toBeEnabled();

    await user.clear(campo());
    await user.type(campo(), "escalera{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Escalera" }),
    ).toBeInTheDocument();
    expect(api.llamadas()[1].get("buscar")).toBe("escalera");
  });

  it("Negativo: si el catálogo no responde muestra el error y «Reintentar», sin resultados", async () => {
    simularApi(() => errorDeRed());

    render(<ListadoCatalogo />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
