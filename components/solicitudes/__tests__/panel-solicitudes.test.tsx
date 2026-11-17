import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelSolicitudes } from "../panel-solicitudes";
import { MENSAJE_CONFLICTO } from "../detalle-solicitud";
import { crearSolicitud, errorDeRed, json, pagina, simularApi } from "./utilidades";
import { irALogin } from "@/lib/notificaciones/navegacion";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

function filaDe(nombre: string) {
  const tr = within(screen.getByRole("table")).getByText(nombre).closest("tr");
  if (!tr) throw new Error(`No hay fila para «${nombre}»`);
  return tr;
}

function detalle() {
  return screen.getByRole("region", { name: /^Solicitud de / });
}

describe("PanelSolicitudes: listado", () => {
  it("muestra el estado de carga y después las solicitudes con sus datos", async () => {
    let responder: (r: Response) => void = () => {};
    simularApi({ lista: () => new Promise<Response>((r) => (responder = r)) });

    render(<PanelSolicitudes />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando solicitudes...");
    responder(json(pagina([crearSolicitud({ arrendatario: { id: "a", nombre: "Ana Pérez" } })])));
    await screen.findByText("Ana Pérez");
    const fila = filaDe("Ana Pérez");
    expect(within(fila).getByText("Taladro percutor")).toBeInTheDocument();
    expect(within(fila).getByText("12 nov 2026, 09:00 – 12:00")).toBeInTheDocument();
    expect(within(fila).getByText("$45.00")).toBeInTheDocument();
    expect(within(fila).getByText("PENDIENTE")).toBeInTheDocument();
  });

  it("pide la primera página de 12 sin filtro", async () => {
    const api = simularApi({ lista: () => json(pagina([])) });

    render(<PanelSolicitudes />);

    await screen.findByText("Aún no tienes solicitudes");
    expect(Object.fromEntries(api.llamadasLista()[0])).toEqual({ page: "1", limit: "12" });
  });

  it("arranca con el filtro y la página que vienen de la URL", async () => {
    const api = simularApi({ lista: () => json(pagina([], { total: 30, page: 2 })) });

    render(<PanelSolicitudes estadoInicial="PENDIENTE" paginaInicial={2} />);

    await waitFor(() => expect(api.llamadasLista()).toHaveLength(1));
    expect(Object.fromEntries(api.llamadasLista()[0])).toEqual({
      estado: "PENDIENTE",
      page: "2",
      limit: "12",
    });
    expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("PENDIENTE");
  });

  it("filtra por estado, vuelve a la página 1 y lo deja en la URL", async () => {
    const user = userEvent.setup();
    const replace = vi.spyOn(window.history, "replaceState");
    const api = simularApi({
      lista: (q) =>
        json(
          q.get("estado") === "RECHAZADA"
            ? pagina([])
            : pagina([crearSolicitud({ arrendatario: { id: "a", nombre: "Luis Gómez" } })]),
        ),
    });
    render(<PanelSolicitudes paginaInicial={3} />);
    await screen.findByText("Luis Gómez");

    await user.selectOptions(screen.getByLabelText("Filtrar por estado"), "RECHAZADA");

    expect(
      await screen.findByText("No tienes solicitudes en estado RECHAZADA."),
    ).toBeInTheDocument();
    expect(Object.fromEntries(api.llamadasLista()[1])).toEqual({
      estado: "RECHAZADA",
      page: "1",
      limit: "12",
    });
    expect(String(replace.mock.calls.at(-1)?.[2])).toMatch(/\?estado=RECHAZADA$/);
  });

  it("pagina de 12 en 12", async () => {
    const user = userEvent.setup();
    const primera = Array.from({ length: 12 }, () => crearSolicitud());
    const ultima = crearSolicitud({ arrendatario: { id: "z", nombre: "La número 13" } });
    const api = simularApi({
      lista: (q) =>
        json(
          q.get("page") === "1"
            ? pagina(primera, { total: 13 })
            : pagina([ultima], { total: 13, page: 2 }),
        ),
    });
    render(<PanelSolicitudes />);
    await screen.findByText(primera[0].arrendatario.nombre);
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("La número 13")).toBeInTheDocument();
    expect(api.llamadasLista()[1].get("page")).toBe("2");
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("con una sola página no muestra la paginación", async () => {
    simularApi({ lista: () => json(pagina([crearSolicitud()])) });

    render(<PanelSolicitudes />);

    await screen.findByRole("table");
    expect(screen.queryByRole("navigation", { name: "Paginación" })).not.toBeInTheDocument();
  });

  it("muestra el error de red y permite reintentar", async () => {
    const user = userEvent.setup();
    let llamada = 0;
    simularApi({
      lista: () =>
        ++llamada === 1
          ? errorDeRed()
          : json(pagina([crearSolicitud({ arrendatario: { id: "a", nombre: "Volvió" } })])),
    });
    render(<PanelSolicitudes />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las solicitudes. Revisa tu conexión.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Volvió")).toBeInTheDocument();
  });

  it("trata el 502 del route handler como error de red", async () => {
    simularApi({ lista: () => json({ statusCode: 502, message: "x" }, 502) });

    render(<PanelSolicitudes />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión.");
  });

  it("con la sesión vencida manda al login", async () => {
    simularApi({ lista: () => json({ statusCode: 401, message: "x" }, 401) });

    render(<PanelSolicitudes />);

    await waitFor(() => expect(irALogin).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("solo las PENDIENTE tienen Aprobar y Rechazar; las demás, Ver", async () => {
    simularApi({
      lista: () =>
        json(
          pagina([
            crearSolicitud({ arrendatario: { id: "a", nombre: "Pendiente" } }),
            crearSolicitud({
              estado: "CONFIRMADA",
              arrendatario: { id: "b", nombre: "Confirmada" },
            }),
          ]),
        ),
    });

    render(<PanelSolicitudes />);

    await screen.findByText("Pendiente");
    expect(within(filaDe("Pendiente")).getByRole("button", { name: /^Aprobar/ })).toBeInTheDocument();
    expect(within(filaDe("Pendiente")).getByRole("button", { name: /^Rechazar/ })).toBeInTheDocument();
    expect(within(filaDe("Confirmada")).queryByRole("button", { name: /^Aprobar/ })).not.toBeInTheDocument();
    expect(within(filaDe("Confirmada")).getByRole("button", { name: /^Ver/ })).toBeInTheDocument();
  });
});

describe("PanelSolicitudes: decidir", () => {
  const ana = () =>
    crearSolicitud({ arrendatario: { id: "a", nombre: "Ana Pérez" } });

  it("aprobar pide confirmación, manda el PATCH y actualiza la fila sin recargar la lista", async () => {
    const user = userEvent.setup();
    const solicitud = ana();
    const api = simularApi({
      lista: () => json(pagina([solicitud])),
      decidir: (id) =>
        json({
          id,
          estado: "CONFIRMADA",
          decididaAt: "2026-11-17T17:00:00.000Z",
          motivoRechazo: null,
        }),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));
    expect(
      within(detalle()).getByText("¿Aprobar esta solicitud? Las fechas quedarán ocupadas."),
    ).toBeInTheDocument();
    expect(api.llamadasDecision()).toHaveLength(0);
    await user.click(within(detalle()).getByRole("button", { name: "Sí, aprobar" }));

    expect(await within(detalle()).findByRole("status")).toHaveTextContent(
      "Solicitud aprobada. Avisamos al arrendatario.",
    );
    expect(api.llamadasDecision()).toEqual([{ decision: "APROBAR" }]);
    expect(within(filaDe("Ana Pérez")).getByText("CONFIRMADA")).toBeInTheDocument();
    expect(
      within(filaDe("Ana Pérez")).queryByRole("button", { name: /^Aprobar/ }),
    ).not.toBeInTheDocument();
    expect(api.llamadasLista()).toHaveLength(1);
  });

  it("cancelar la confirmación no manda nada", async () => {
    const user = userEvent.setup();
    const api = simularApi({ lista: () => json(pagina([ana()])) });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Cancelar" }));

    expect(api.llamadasDecision()).toHaveLength(0);
    expect(within(detalle()).getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
  });

  it("rechazar con motivo: contador, motivo recortado en el PATCH y la fila en RECHAZADA", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      lista: () => json(pagina([ana()])),
      decidir: (id, body) =>
        json({
          id,
          estado: "RECHAZADA",
          decididaAt: "2026-11-17T17:00:00.000Z",
          motivoRechazo: body.motivo ?? null,
        }),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Rechazar/ }));
    const motivo = within(detalle()).getByLabelText("Motivo de rechazo (opcional)");
    expect(within(detalle()).getByText("0/500")).toBeInTheDocument();
    await user.type(motivo, "  Fechas no disponibles  ");
    expect(within(detalle()).getByText("25/500")).toBeInTheDocument();
    await user.click(within(detalle()).getByRole("button", { name: "Rechazar solicitud" }));

    expect(await within(detalle()).findByRole("status")).toHaveTextContent(
      "Solicitud rechazada. Avisamos al arrendatario.",
    );
    expect(api.llamadasDecision()).toEqual([
      { decision: "RECHAZAR", motivo: "Fechas no disponibles" },
    ]);
    expect(within(filaDe("Ana Pérez")).getByText("RECHAZADA")).toBeInTheDocument();
    expect(within(detalle()).getByText("Fechas no disponibles")).toBeInTheDocument();
  });

  it("rechazar sin motivo no manda el campo", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      lista: () => json(pagina([ana()])),
      decidir: (id) =>
        json({ id, estado: "RECHAZADA", decididaAt: "2026-11-17T17:00:00.000Z", motivoRechazo: null }),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Rechazar/ }));
    await user.type(within(detalle()).getByLabelText("Motivo de rechazo (opcional)"), "   ");
    await user.click(within(detalle()).getByRole("button", { name: "Rechazar solicitud" }));

    await within(detalle()).findByRole("status");
    expect(api.llamadasDecision()).toEqual([{ decision: "RECHAZAR" }]);
  });

  it("el motivo no deja pasar de 500 caracteres", async () => {
    const user = userEvent.setup();
    simularApi({ lista: () => json(pagina([ana()])) });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Rechazar/ }));
    const motivo = within(detalle()).getByLabelText("Motivo de rechazo (opcional)");
    await user.click(motivo);
    await user.paste("a".repeat(520));

    expect(motivo).toHaveValue("a".repeat(500));
    expect(within(detalle()).getByText("500/500")).toBeInTheDocument();
  });

  it("bloquea los botones mientras se envía y no duplica la decisión", async () => {
    const user = userEvent.setup();
    let responder: (r: Response) => void = () => {};
    const api = simularApi({
      lista: () => json(pagina([ana()])),
      decidir: () => new Promise<Response>((r) => (responder = r)),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");
    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));

    await user.click(within(detalle()).getByRole("button", { name: "Sí, aprobar" }));

    const enviando = within(detalle()).getByRole("button", { name: "Enviando..." });
    expect(enviando).toBeDisabled();
    expect(within(detalle()).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await user.click(enviando);
    expect(api.llamadasDecision()).toHaveLength(1);
    responder(
      json({ id: "x", estado: "CONFIRMADA", decididaAt: "2026-11-17T17:00:00.000Z", motivoRechazo: null }),
    );
    await within(detalle()).findByRole("status");
  });

  it("409 de conflicto: muestra el aviso y el detalle del backend, no la marca CONFIRMADA y recarga", async () => {
    const user = userEvent.setup();
    const solicitud = ana();
    const api = simularApi({
      lista: () => json(pagina([solicitud])),
      decidir: () =>
        json(
          {
            statusCode: 409,
            error: "Conflict",
            codigo: "CONFLICTO_DISPONIBILIDAD",
            message: "Conflicto de disponibilidad: ya confirmaste otra reserva en esas fechas.",
          },
          409,
        ),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Sí, aprobar" }));

    const alerta = await within(detalle()).findByRole("alert");
    expect(alerta).toHaveTextContent(MENSAJE_CONFLICTO);
    expect(alerta).toHaveTextContent(
      "Conflicto de disponibilidad: ya confirmaste otra reserva en esas fechas.",
    );
    expect(within(filaDe("Ana Pérez")).getByText("PENDIENTE")).toBeInTheDocument();
    await waitFor(() => expect(api.llamadasLista()).toHaveLength(2));
  });

  it("409 de ya decidida: recarga y la fila muestra el estado real", async () => {
    const user = userEvent.setup();
    const solicitud = ana();
    let llamada = 0;
    simularApi({
      lista: () =>
        json(pagina([++llamada === 1 ? solicitud : { ...solicitud, estado: "RECHAZADA" }])),
      decidir: () =>
        json(
          {
            statusCode: 409,
            codigo: "SOLICITUD_YA_DECIDIDA",
            message: "Esta solicitud no se puede modificar.",
          },
          409,
        ),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Sí, aprobar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(MENSAJE_CONFLICTO);
    expect(await within(filaDe("Ana Pérez")).findByText("RECHAZADA")).toBeInTheDocument();
  });

  it("403: «Esta solicitud no se puede modificar.»", async () => {
    const user = userEvent.setup();
    simularApi({
      lista: () => json(pagina([ana()])),
      decidir: () =>
        json({ statusCode: 403, message: "Esta solicitud no se puede modificar." }, 403),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Rechazar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Rechazar solicitud" }));

    expect(await within(detalle()).findByRole("alert")).toHaveTextContent(
      "Esta solicitud no se puede modificar.",
    );
    expect(within(filaDe("Ana Pérez")).getByText("PENDIENTE")).toBeInTheDocument();
  });

  it("400: muestra el mensaje del backend", async () => {
    const user = userEvent.setup();
    simularApi({
      lista: () => json(pagina([ana()])),
      decidir: () =>
        json(
          { statusCode: 400, message: ["motivo no puede superar los 500 caracteres."] },
          400,
        ),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Rechazar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Rechazar solicitud" }));

    expect(await within(detalle()).findByRole("alert")).toHaveTextContent(
      "motivo no puede superar los 500 caracteres.",
    );
  });

  it("sin conexión: avisa y deja la solicitud como estaba", async () => {
    const user = userEvent.setup();
    simularApi({ lista: () => json(pagina([ana()])), decidir: () => errorDeRed() });
    render(<PanelSolicitudes />);
    await screen.findByText("Ana Pérez");

    await user.click(within(filaDe("Ana Pérez")).getByRole("button", { name: /^Aprobar/ }));
    await user.click(within(detalle()).getByRole("button", { name: "Sí, aprobar" }));

    expect(await within(detalle()).findByRole("alert")).toHaveTextContent(
      "No se pudo enviar la decisión. Revisa tu conexión.",
    );
    expect(within(detalle()).getByRole("button", { name: "Aprobar" })).toBeEnabled();
  });

  it("el detalle de una decidida muestra la fecha de decisión y el motivo, sin botones", async () => {
    const user = userEvent.setup();
    simularApi({
      lista: () =>
        json(
          pagina([
            crearSolicitud({
              estado: "RECHAZADA",
              arrendatario: { id: "b", nombre: "Luis Gómez" },
              decididaAt: "2026-11-11T15:30:00.000Z",
              motivoRechazo: "El equipo está en reparación",
            }),
          ]),
        ),
    });
    render(<PanelSolicitudes />);
    await screen.findByText("Luis Gómez");

    await user.click(within(filaDe("Luis Gómez")).getByRole("button", { name: /^Ver/ }));

    expect(within(detalle()).getByText("11 nov 2026, 09:30")).toBeInTheDocument();
    expect(within(detalle()).getByText("El equipo está en reparación")).toBeInTheDocument();
    expect(within(detalle()).queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });
});
