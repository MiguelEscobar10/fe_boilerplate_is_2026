import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListadoCatalogo } from "../listado-catalogo";
import { crearPublicacion, errorDeRed, json, pagina, simularApi } from "./utilidades";
import { irALogin } from "@/lib/notificaciones/navegacion";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const campo = () => screen.getByLabelText("Buscar equipos y espacios");

describe("ListadoCatalogo: resultados", () => {
  it("muestra el estado de carga y después las tarjetas con sus datos", async () => {
    let responder: (r: Response) => void = () => {};
    simularApi(() => new Promise<Response>((r) => (responder = r)));

    render(<ListadoCatalogo />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando publicaciones...");
    const p = crearPublicacion({
      nombre: "Taladro percutor",
      precio: 15.5,
      tipo: "EQUIPO",
      tarifaUnidad: "DIA",
      ubicacion: "Santa Tecla",
    });
    responder(json(pagina([p])));

    const tarjeta = (await screen.findByRole("heading", { name: "Taladro percutor" })).closest(
      "article",
    )!;
    expect(within(tarjeta).getByText("Equipo")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Santa Tecla")).toBeInTheDocument();
    expect(within(tarjeta).getByText("$15.50 por día")).toBeInTheDocument();
    expect(within(tarjeta).getByRole("img", { name: "Fotografía de Taladro percutor" })).toHaveAttribute(
      "src",
      `/publicaciones/${p.id}/imagenes/0`,
    );
    expect(within(tarjeta).getByRole("link", { name: "Taladro percutor" })).toHaveAttribute(
      "href",
      `/publicaciones/${p.id}`,
    );
    expect(screen.getByText(/1 publicación ·/)).toBeInTheDocument();
  });

  it("una publicación sin foto muestra «Sin fotografía»", async () => {
    simularApi(() => json(pagina([crearPublicacion({ imagenUrl: null })])));

    render(<ListadoCatalogo />);

    expect(await screen.findByText("Sin fotografía")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("pide la primera página de 12 sin búsqueda", async () => {
    const api = simularApi(() => json(pagina([])));

    render(<ListadoCatalogo />);

    await screen.findByText("Todavía no hay publicaciones disponibles.");
    expect(Object.fromEntries(api.llamadas()[0])).toEqual({ page: "1", limit: "12" });
  });

  it("arranca con la búsqueda y la página que vienen de la URL", async () => {
    const api = simularApi(() => json(pagina([crearPublicacion()], { total: 30, page: 2 })));

    render(<ListadoCatalogo buscarInicial="taladro" paginaInicial={2} />);

    await screen.findByText("Página 2 de 3");
    expect(Object.fromEntries(api.llamadas()[0])).toEqual({
      buscar: "taladro",
      page: "2",
      limit: "12",
    });
    expect(campo()).toHaveValue("taladro");
  });
});

describe("ListadoCatalogo: búsqueda", () => {
  it("al buscar actualiza los resultados, vuelve a la página 1 y lo deja en la URL", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = simularApi((q) =>
      json(
        q.get("buscar") === "salón"
          ? pagina([crearPublicacion({ nombre: "Salón de eventos" })])
          : pagina([crearPublicacion({ nombre: "Taladro" })], { total: 40, page: 3 }),
      ),
    );
    render(<ListadoCatalogo paginaInicial={3} />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.type(campo(), "  salón  ");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByRole("heading", { name: "Salón de eventos" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Taladro" })).not.toBeInTheDocument();
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      buscar: "salón",
      page: "1",
      limit: "12",
    });
    expect(replace).toHaveBeenLastCalledWith(null, "", "/?buscar=sal%C3%B3n");
  });

  it("busca también con Enter", async () => {
    const user = userEvent.setup();
    const api = simularApi(() => json(pagina([])));
    render(<ListadoCatalogo />);
    await screen.findByText("Todavía no hay publicaciones disponibles.");

    await user.type(campo(), "proyector{Enter}");

    await waitFor(() => expect(api.llamadas()).toHaveLength(2));
    expect(api.llamadas()[1].get("buscar")).toBe("proyector");
  });

  it("«Borrar búsqueda» quita el texto, vuelve a todo el catálogo y limpia la URL", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = simularApi((q) =>
      json(pagina([crearPublicacion({ nombre: q.get("buscar") ? "Taladro" : "Escalera" })])),
    );
    render(<ListadoCatalogo buscarInicial="taladro" />);
    await screen.findByRole("heading", { name: "Taladro" });

    await user.click(screen.getByRole("button", { name: "Borrar búsqueda" }));

    expect(await screen.findByRole("heading", { name: "Escalera" })).toBeInTheDocument();
    expect(campo()).toHaveValue("");
    expect(api.llamadas()[1].has("buscar")).toBe(false);
    expect(replace).toHaveBeenLastCalledWith(null, "", "/");
    expect(screen.queryByRole("button", { name: "Borrar búsqueda" })).not.toBeInTheDocument();
  });
});

describe("ListadoCatalogo: vacío", () => {
  it("sin resultados muestra un mensaje con lo buscado y deja modificar la búsqueda", async () => {
    const user = userEvent.setup();
    const api = simularApi((q) =>
      json(q.get("buscar") ? pagina([]) : pagina([crearPublicacion({ nombre: "Escalera" })])),
    );
    render(<ListadoCatalogo buscarInicial="unicornio" />);

    expect(
      await screen.findByText(
        "No encontramos publicaciones para «unicornio». Prueba con otra palabra o borra la búsqueda.",
      ),
    ).toBeInTheDocument();
    // La barra sigue ahí para escribir otra cosa.
    expect(campo()).toHaveValue("unicornio");
    expect(campo()).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Ver todas las publicaciones" }));

    expect(await screen.findByRole("heading", { name: "Escalera" })).toBeInTheDocument();
    expect(campo()).toHaveValue("");
    expect(api.llamadas()[1].has("buscar")).toBe(false);
  });
});

describe("ListadoCatalogo: paginación", () => {
  it("no muestra la paginación si todo cabe en una página", async () => {
    simularApi(() => json(pagina([crearPublicacion()], { total: 12 })));

    render(<ListadoCatalogo />);

    await screen.findByText(/12 publicaciones/);
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument();
  });

  it("avanza y retrocede de página conservando la búsqueda", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = simularApi((q) =>
      json(
        pagina([crearPublicacion({ nombre: `Bien de la página ${q.get("page")}` })], {
          total: 25,
          page: Number(q.get("page")),
        }),
      ),
    );
    render(<ListadoCatalogo buscarInicial="bien" />);
    await screen.findByText("Página 1 de 3");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByRole("heading", { name: "Bien de la página 2" })).toBeInTheDocument();
    expect(Object.fromEntries(api.llamadas()[1])).toEqual({
      buscar: "bien",
      page: "2",
      limit: "12",
    });
    expect(replace).toHaveBeenLastCalledWith(null, "", "/?buscar=bien&page=2");

    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(await screen.findByRole("heading", { name: "Bien de la página 1" })).toBeInTheDocument();
  });
});

describe("ListadoCatalogo: errores", () => {
  it("en una falla de red muestra el mensaje y «Reintentar» vuelve a pedir lo mismo", async () => {
    const user = userEvent.setup();
    let falla = true;
    const api = simularApi(() =>
      falla ? errorDeRed() : json(pagina([crearPublicacion({ nombre: "Taladro" })])),
    );
    render(<ListadoCatalogo buscarInicial="taladro" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo.",
    );

    falla = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Taladro" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.llamadas()[1].get("buscar")).toBe("taladro");
  });

  it("un 502 del route handler también cuenta como falla de red", async () => {
    simularApi(() => json({ statusCode: 502, message: "No se pudo conectar" }, 502));

    render(<ListadoCatalogo />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");
  });

  it("con otro error muestra un mensaje general con reintento", async () => {
    simularApi(() => json({ statusCode: 500 }, 500));

    render(<ListadoCatalogo />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el catálogo. Inténtalo de nuevo.",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("con un 401 va al login y no muestra error", async () => {
    simularApi(() => json({ statusCode: 401 }, 401));

    render(<ListadoCatalogo />);

    await waitFor(() => expect(irALogin).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
