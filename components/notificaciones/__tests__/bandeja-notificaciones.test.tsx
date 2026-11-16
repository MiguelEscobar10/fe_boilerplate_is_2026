import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BandejaNotificaciones } from "../bandeja-notificaciones";
import { IconoNotificaciones } from "../icono-notificaciones";
import { LIMITE_PAGINA } from "@/lib/notificaciones/tipos";
import { bandeja, crearNotificacion, errorDeRed, json, simularApi } from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

function renderBandeja() {
  const props = { onActualizar: vi.fn(), onMarcada: vi.fn(), onCaducada: vi.fn() };
  render(<BandejaNotificaciones {...props} />);
  return props;
}

function itemDe(titulo: string) {
  const li = screen.getByText(titulo).closest("li");
  if (!li) throw new Error(`No hay item para «${titulo}»`);
  return li;
}

async function abrirBandeja() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^Notificaciones/ }));
  return user;
}

describe("BandejaNotificaciones", () => {
  it("muestra el estado de carga mientras llega la primera página", async () => {
    let responder: (r: Response) => void = () => {};
    simularApi({ lista: () => new Promise<Response>((r) => (responder = r)) });

    renderBandeja();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando notificaciones...");
    responder(json(bandeja([crearNotificacion({ titulo: "Pago aprobado" })])));
    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("pide la primera página de todas y muestra la lista vacía", async () => {
    const api = simularApi({ lista: () => json(bandeja([])) });

    renderBandeja();

    expect(await screen.findByText("No tienes notificaciones.")).toBeInTheDocument();
    expect(Object.fromEntries(api.llamadasLista()[0])).toEqual({
      soloNoLeidas: "false",
      page: "1",
      limit: String(LIMITE_PAGINA),
    });
  });

  it("filtra las no leídas", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      lista: (q) =>
        json(
          q.get("soloNoLeidas") === "true"
            ? bandeja([])
            : bandeja([crearNotificacion({ titulo: "Ya leída", leidaAt: "2026-11-15T10:00:00.000Z" })]),
        ),
    });
    renderBandeja();
    await screen.findByText("Ya leída");

    await user.click(screen.getByRole("button", { name: "No leídas" }));

    expect(await screen.findByText("No tienes notificaciones pendientes.")).toBeInTheDocument();
    expect(api.llamadasLista()[1].get("soloNoLeidas")).toBe("true");
    expect(screen.getByRole("button", { name: "No leídas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("distingue las pendientes de las leídas", async () => {
    simularApi({
      lista: () =>
        json(
          bandeja([
            crearNotificacion({ titulo: "Pendiente nueva" }),
            crearNotificacion({ titulo: "Leída antes", leidaAt: "2026-11-15T10:00:00.000Z" }),
          ]),
        ),
    });

    renderBandeja();

    await screen.findByText("Pendiente nueva");
    const pendiente = itemDe("Pendiente nueva");
    const leida = itemDe("Leída antes");
    expect(pendiente).toHaveAttribute("data-estado", "pendiente");
    expect(within(pendiente).getByText("Pendiente")).toBeInTheDocument();
    expect(within(pendiente).getByRole("button", { name: "Marcar como leída" })).toBeInTheDocument();
    expect(leida).toHaveAttribute("data-estado", "leida");
    expect(within(leida).getByText("Leída")).toBeInTheDocument();
    expect(within(leida).queryByRole("button", { name: "Marcar como leída" })).not.toBeInTheDocument();
  });

  it("muestra el error de red y permite reintentar", async () => {
    const user = userEvent.setup();
    let llamada = 0;
    simularApi({
      lista: () =>
        ++llamada === 1 ? errorDeRed() : json(bandeja([crearNotificacion({ titulo: "Volvió la red" })])),
    });
    renderBandeja();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las notificaciones. Revisa tu conexión.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Volvió la red")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("trata el 502 del route handler (backend caído) como error de red", async () => {
    simularApi({ lista: () => json({ statusCode: 502, message: "No se pudo conectar." }, 502) });

    renderBandeja();

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión.");
  });

  it("carga la página siguiente con «Cargar más»", async () => {
    const user = userEvent.setup();
    const primera = Array.from({ length: LIMITE_PAGINA }, () => crearNotificacion());
    const ultima = crearNotificacion({ titulo: "La número 21" });
    const api = simularApi({
      lista: (q) => json(q.get("page") === "1" ? bandeja(primera, 21) : bandeja([ultima], 21)),
    });
    renderBandeja();
    await screen.findByText(primera[0].titulo);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByText("La número 21")).toBeInTheDocument();
    expect(api.llamadasLista()[1].get("page")).toBe("2");
    expect(screen.getAllByRole("listitem")).toHaveLength(21);
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });
});

describe("Marcar como leída", () => {
  it("llama al PATCH, actualiza el item y baja el contador", async () => {
    const aviso = crearNotificacion({ titulo: "Reserva confirmada" });
    const api = simularApi({
      conteo: () => json({ noLeidas: 2 }),
      lista: () => json(bandeja([aviso])),
      marcar: (id) => json({ ...aviso, id, leidaAt: "2026-11-15T12:00:00.000Z" }),
    });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("2");
    const user = await abrirBandeja();
    await screen.findByText("Reserva confirmada");

    await user.click(
      within(itemDe("Reserva confirmada")).getByRole("button", { name: "Marcar como leída" }),
    );

    expect(await within(itemDe("Reserva confirmada")).findByText("Leída")).toBeInTheDocument();
    expect(api.llamadasMarcar(aviso.id)).toBe(1);
    expect(itemDe("Reserva confirmada")).toHaveAttribute("data-estado", "leida");
    expect(
      within(itemDe("Reserva confirmada")).queryByRole("button", { name: "Marcar como leída" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("contador-no-leidas")).toHaveTextContent("1");
    // El contador baja sin otra consulta al backend.
    expect(api.llamadasConteo()).toBe(1);
  });

  it("con un 404 avisa que caducó, la quita y vuelve a pedir el conteo", async () => {
    const caducada = crearNotificacion({ titulo: "Aviso caducado" });
    const otra = crearNotificacion({ titulo: "Sigue aquí" });
    let conteo = 0;
    const api = simularApi({
      conteo: () => json({ noLeidas: ++conteo === 1 ? 2 : 1 }),
      lista: () => json(bandeja([caducada, otra])),
      marcar: () =>
        json({ statusCode: 404, message: "La notificación no existe.", error: "Not Found" }, 404),
    });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("2");
    const user = await abrirBandeja();
    await screen.findByText("Aviso caducado");

    await user.click(
      within(itemDe("Aviso caducado")).getByRole("button", { name: "Marcar como leída" }),
    );

    expect(
      await screen.findByText("Esa notificación ya no está disponible y se quitó de la lista."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aviso caducado")).not.toBeInTheDocument();
    expect(screen.getByText("Sigue aquí")).toBeInTheDocument();
    expect(api.llamadasConteo()).toBe(2);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("1");
  });

  it("si falla la red, muestra el error y la deja pendiente", async () => {
    const aviso = crearNotificacion({ titulo: "Pago recibido" });
    simularApi({
      conteo: () => json({ noLeidas: 1 }),
      lista: () => json(bandeja([aviso])),
      marcar: () => errorDeRed(),
    });
    render(<IconoNotificaciones />);
    const user = await abrirBandeja();
    await screen.findByText("Pago recibido");

    await user.click(
      within(itemDe("Pago recibido")).getByRole("button", { name: "Marcar como leída" }),
    );

    expect(await within(itemDe("Pago recibido")).findByRole("alert")).toHaveTextContent(
      "Sin conexión. No se pudo marcar como leída.",
    );
    expect(itemDe("Pago recibido")).toHaveAttribute("data-estado", "pendiente");
    expect(
      within(itemDe("Pago recibido")).getByRole("button", { name: "Marcar como leída" }),
    ).toBeEnabled();
    expect(screen.getByTestId("contador-no-leidas")).toHaveTextContent("1");
  });
});
