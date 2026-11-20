import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelSolicitudes } from "@/components/solicitudes/panel-solicitudes";
import {
  crearSolicitud,
  errorDeRed,
  json,
  pagina,
  simularApi,
} from "@/components/solicitudes/__tests__/utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

function filaDe(nombre: string) {
  const tr = within(screen.getByRole("table")).getByText(nombre).closest("tr");
  if (!tr) throw new Error(`No hay fila para «${nombre}»`);
  return tr;
}

function formulario() {
  return screen.getByRole("region", { name: /^Calificar a / });
}

const completada = (nombre = "Ana Pérez", calificada?: boolean) =>
  crearSolicitud({
    estado: "COMPLETADA",
    arrendatario: { id: `id-${nombre}`, nombre },
    arrendatarioCalificado: calificada,
  });

async function abrirFormulario(user: ReturnType<typeof userEvent.setup>, nombre = "Ana Pérez") {
  await screen.findByText(nombre);
  await user.click(
    within(filaDe(nombre)).getByRole("button", { name: /^Calificar al arrendatario/ }),
  );
}

describe("Calificar al arrendatario: dónde aparece la acción", () => {
  it("solo en las COMPLETADA sin calificar", async () => {
    simularApi({
      lista: () =>
        json(
          pagina([
            completada("Sin calificar", false),
            completada("Ya calificada", true),
            crearSolicitud({ estado: "EN_CURSO", arrendatario: { id: "e", nombre: "En curso" } }),
            crearSolicitud({ estado: "PENDIENTE", arrendatario: { id: "p", nombre: "Pendiente" } }),
          ]),
        ),
    });

    render(<PanelSolicitudes estadoInicial="COMPLETADA" />);

    await screen.findByText("Sin calificar");
    const accion = { name: /^Calificar al arrendatario/ };
    expect(within(filaDe("Sin calificar")).getByRole("button", accion)).toBeInTheDocument();
    expect(within(filaDe("Ya calificada")).queryByRole("button", accion)).not.toBeInTheDocument();
    expect(within(filaDe("Ya calificada")).getByText("Ya calificado ✓")).toBeInTheDocument();
    expect(within(filaDe("En curso")).queryByRole("button", accion)).not.toBeInTheDocument();
    expect(within(filaDe("Pendiente")).queryByRole("button", accion)).not.toBeInTheDocument();
  });

  it("si el backend todavía no manda arrendatarioCalificado, la ofrece en las COMPLETADA", async () => {
    simularApi({ lista: () => json(pagina([completada("Sin dato", undefined)])) });

    render(<PanelSolicitudes />);

    await screen.findByText("Sin dato");
    expect(
      within(filaDe("Sin dato")).getByRole("button", { name: /^Calificar al arrendatario/ }),
    ).toBeInTheDocument();
  });
});

describe("Calificar al arrendatario: el formulario", () => {
  it("califica con estrellas y comentario, y la acción deja de estar disponible", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () => json({ id: "c-1" }, 201),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    expect(within(formulario()).getByText("Taladro percutor · 12 nov 2026, 09:00 – 12:00")).toBeInTheDocument();
    await user.click(within(formulario()).getByRole("radio", { name: "4 estrellas" }));
    expect(within(formulario()).getByText("4 de 5")).toBeInTheDocument();
    await user.type(
      within(formulario()).getByLabelText("Comentario (opcional)"),
      "  Devolvió todo a tiempo  ",
    );
    expect(within(formulario()).getByText("26/500")).toBeInTheDocument();
    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await within(formulario()).findByRole("status")).toHaveTextContent(
      "Calificación guardada.",
    );
    expect(api.llamadasCalificar()).toEqual([
      { puntaje: 4, comentario: "Devolvió todo a tiempo" },
    ]);
    expect(
      within(filaDe("Ana Pérez")).queryByRole("button", { name: /^Calificar al arrendatario/ }),
    ).not.toBeInTheDocument();
    expect(within(filaDe("Ana Pérez")).getByText("Ya calificado ✓")).toBeInTheDocument();
  });

  it("sin comentario no manda el campo", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () => json({ id: "c-1" }, 201),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    await user.click(within(formulario()).getByRole("radio", { name: "5 estrellas" }));
    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    await within(formulario()).findByRole("status");
    expect(api.llamadasCalificar()).toEqual([{ puntaje: 5 }]);
  });

  it("sin estrellas no envía y dice qué corregir", async () => {
    const user = userEvent.setup();
    const api = simularApi({ lista: () => json(pagina([completada()])) });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(within(formulario()).getByText("Elige de 1 a 5 estrellas.")).toBeInTheDocument();
    expect(api.llamadasCalificar()).toHaveLength(0);
  });

  it("las estrellas se eligen con el teclado", async () => {
    const user = userEvent.setup();
    simularApi({ lista: () => json(pagina([completada()])) });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    await user.click(within(formulario()).getByRole("radio", { name: "2 estrellas" }));
    await user.keyboard("{ArrowRight}");

    expect(within(formulario()).getByRole("radio", { name: "3 estrellas" })).toBeChecked();
    expect(within(formulario()).getByText("3 de 5")).toBeInTheDocument();
  });

  it("el comentario no deja pasar de 500 caracteres", async () => {
    const user = userEvent.setup();
    simularApi({ lista: () => json(pagina([completada()])) });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    const comentario = within(formulario()).getByLabelText("Comentario (opcional)");
    await user.click(comentario);
    await user.paste("a".repeat(520));

    expect(comentario).toHaveValue("a".repeat(500));
    expect(within(formulario()).getByText("500/500")).toBeInTheDocument();
  });

  it("bloquea el envío mientras espera y no manda dos veces", async () => {
    const user = userEvent.setup();
    let responder: (r: Response) => void = () => {};
    const api = simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () => new Promise<Response>((r) => (responder = r)),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "5 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));
    const enviando = within(formulario()).getByRole("button", { name: "Enviando..." });
    expect(enviando).toBeDisabled();
    await user.click(enviando);

    expect(api.llamadasCalificar()).toHaveLength(1);
    responder(json({ id: "c-1" }, 201));
    await within(formulario()).findByRole("status");
  });

  it("409: «Esta reserva ya fue calificada.» y la acción desaparece", async () => {
    const user = userEvent.setup();
    simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () =>
        json(
          { statusCode: 409, codigo: "RESERVA_YA_CALIFICADA", message: "Esta reserva ya fue calificada." },
          409,
        ),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "5 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await within(formulario()).findByRole("alert")).toHaveTextContent(
      "Esta reserva ya fue calificada.",
    );
    expect(within(filaDe("Ana Pérez")).getByText("Ya calificado ✓")).toBeInTheDocument();
  });

  it("422: explica que la reserva no está COMPLETADA y recarga la lista", async () => {
    const user = userEvent.setup();
    // La misma reserva en las dos cargas: en la segunda ya no está COMPLETADA.
    const reserva = completada();
    let carga = 0;
    const api = simularApi({
      lista: () =>
        json(pagina([++carga === 1 ? reserva : { ...reserva, estado: "EN_CURSO" }])),
      calificar: () =>
        json(
          {
            statusCode: 422,
            codigo: "RESERVA_NO_COMPLETADA",
            message: "Solo puedes calificar al arrendatario de una reserva COMPLETADA.",
          },
          422,
        ),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "3 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Solo puedes calificar al arrendatario de una reserva COMPLETADA.",
    );
    await waitFor(() => expect(api.llamadasLista()).toHaveLength(2));
    expect(await within(filaDe("Ana Pérez")).findByText("EN_CURSO")).toBeInTheDocument();
    // La reserva sigue en la lista, pero el formulario ya se cerró: el aviso
    // de arriba sigue siendo el único lugar donde se lee el error.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Solo puedes calificar al arrendatario de una reserva COMPLETADA.",
    );
  });

  it("422 con el filtro COMPLETADA: la reserva sale de la lista y el aviso se sigue viendo", async () => {
    const user = userEvent.setup();
    let carga = 0;
    simularApi({
      lista: () => json(pagina(++carga === 1 ? [completada()] : [])),
      calificar: () =>
        json({ statusCode: 422, codigo: "RESERVA_NO_COMPLETADA", message: "x" }, 422),
    });
    render(<PanelSolicitudes estadoInicial="COMPLETADA" />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "3 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByText("No tienes solicitudes en estado COMPLETADA.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Solo puedes calificar al arrendatario de una reserva COMPLETADA.",
    );
    expect(screen.queryByRole("region", { name: /^Calificar a / })).not.toBeInTheDocument();
  });

  it("400: muestra el mensaje del backend", async () => {
    const user = userEvent.setup();
    simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () =>
        json({ statusCode: 400, message: ["puntaje debe estar entre 1 y 5."] }, 400),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "5 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await within(formulario()).findByRole("alert")).toHaveTextContent(
      "puntaje debe estar entre 1 y 5.",
    );
  });

  it("sin conexión: avisa y deja volver a intentar", async () => {
    const user = userEvent.setup();
    let llamada = 0;
    const api = simularApi({
      lista: () => json(pagina([completada()])),
      calificar: () => (++llamada === 1 ? errorDeRed() : json({ id: "c-1" }, 201)),
    });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);
    await user.click(within(formulario()).getByRole("radio", { name: "5 estrellas" }));

    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));
    expect(await within(formulario()).findByRole("alert")).toHaveTextContent(
      "No se pudo enviar la calificación. Revisa tu conexión.",
    );
    await user.click(within(formulario()).getByRole("button", { name: "Enviar calificación" }));

    expect(await within(formulario()).findByRole("status")).toHaveTextContent(
      "Calificación guardada.",
    );
    expect(api.llamadasCalificar()).toHaveLength(2);
  });

  it("Cancelar cierra el formulario sin enviar", async () => {
    const user = userEvent.setup();
    const api = simularApi({ lista: () => json(pagina([completada()])) });
    render(<PanelSolicitudes />);
    await abrirFormulario(user);

    await user.click(within(formulario()).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("region", { name: /^Calificar a / })).not.toBeInTheDocument();
    expect(api.llamadasCalificar()).toHaveLength(0);
  });
});
