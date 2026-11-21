import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeccionCalificacion } from "../seccion-calificacion";
import { irALogin } from "@/lib/notificaciones/navegacion";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SIN_CALIFICAR = () =>
  json({ statusCode: 404, codigo: "CALIFICACION_NO_REGISTRADA", message: "Aún no calificaste." }, 404);

const CALIFICADA = (extra = {}) =>
  json({
    id: "c1",
    reservaId: RESERVA,
    puntajeBien: 4,
    puntajeArrendador: 5,
    comentario: "Todo en orden",
    fechaRegistro: "2026-11-12T16:00:00.000Z",
    ...extra,
  });

function bodiesEnviados() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)));
}

async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
  render(<SeccionCalificacion reservaId={RESERVA} nombreBien="Taladro" />);
  await user.click(await screen.findByRole("button", { name: "Calificar" }));
  return screen.getByRole("form", { name: "Calificar Taladro" });
}

async function elegir(
  user: ReturnType<typeof userEvent.setup>,
  formulario: HTMLElement,
  escala: "bien" | "arrendador",
  estrellas: number,
) {
  const grupo = within(formulario).getByRole("group", {
    name: new RegExp(`calificación del ${escala}`, "i"),
  });
  await user.click(within(grupo).getByLabelText(`${estrellas} ${estrellas === 1 ? "estrella" : "estrellas"}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

describe("SeccionCalificacion", () => {
  it("reserva sin calificar: ofrece «Calificar» y el formulario se abre con dos escalas", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(SIN_CALIFICAR()));
    const user = userEvent.setup();

    const formulario = await abrirFormulario(user);

    expect(within(formulario).getByRole("group", { name: /del bien/i })).toBeInTheDocument();
    expect(within(formulario).getByRole("group", { name: /del arrendador/i })).toBeInTheDocument();
    expect(within(formulario).getByLabelText(/comentario/i)).toBeInTheDocument();
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });

  it("reserva ya calificada: no ofrece «Calificar» y muestra lo que se guardó", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(CALIFICADA()));

    render(<SeccionCalificacion reservaId={RESERVA} nombreBien="Taladro" />);

    expect(await screen.findByTestId("calificacion-hecha")).toHaveTextContent("Ya calificaste");
    expect(screen.getByTestId("puntaje-bien")).toHaveTextContent("4 de 5");
    expect(screen.getByTestId("puntaje-arrendador")).toHaveTextContent("5 de 5");
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("valida las dos escalas antes de enviar y no llama al backend", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(SIN_CALIFICAR()));
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));
    expect(within(formulario).getByText(/califica el bien/i)).toBeInTheDocument();
    expect(within(formulario).getByText(/califica al arrendador/i)).toBeInTheDocument();

    await elegir(user, formulario, "bien", 4);
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));
    expect(within(formulario).queryByText(/califica el bien/i)).not.toBeInTheDocument();
    expect(within(formulario).getByText(/califica al arrendador/i)).toBeInTheDocument();

    expect(bodiesEnviados()).toHaveLength(0);
  });

  it("limita el comentario a 500 caracteres y cuenta", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(SIN_CALIFICAR()));
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    const comentario = within(formulario).getByLabelText(/comentario/i);
    await user.click(comentario);
    await user.paste("a".repeat(600));

    expect(comentario).toHaveValue("a".repeat(500));
    expect(screen.getByText("500/500")).toBeInTheDocument();
  });

  it("envía los puntajes y el comentario, y después la acción deja de estar disponible", async () => {
    fetchMock.mockImplementation((_url, init) =>
      Promise.resolve(
        init?.method === "POST"
          ? json({ id: "c1" }, 201)
          : fetchMock.mock.calls.some(([, i]) => i?.method === "POST")
            ? CALIFICADA()
            : SIN_CALIFICAR(),
      ),
    );
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);
    await user.type(within(formulario).getByLabelText(/comentario/i), "  Todo en orden ");
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByTestId("calificacion-hecha")).toBeInTheDocument();
    expect(bodiesEnviados()).toEqual([
      { puntajeBien: 4, puntajeArrendador: 5, comentario: "Todo en orden" },
    ]);
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("sin comentario no lo envía", async () => {
    fetchMock.mockImplementation((_url, init) =>
      Promise.resolve(init?.method === "POST" ? json({ id: "c1" }, 201) : SIN_CALIFICAR()),
    );
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    await elegir(user, formulario, "bien", 1);
    await elegir(user, formulario, "arrendador", 2);
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    await waitFor(() => expect(bodiesEnviados()).toHaveLength(1));
    expect(bodiesEnviados()[0]).toEqual({ puntajeBien: 1, puntajeArrendador: 2 });
  });

  it("deshabilita el envío mientras se procesa y manda una sola solicitud con doble clic", async () => {
    let responder: (r: Response) => void = () => {};
    fetchMock.mockImplementation((_url, init) =>
      init?.method === "POST"
        ? new Promise<Response>((r) => (responder = r))
        : Promise.resolve(SIN_CALIFICAR()),
    );
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);
    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);

    const enviar = within(formulario).getByRole("button", { name: "Enviar calificación" });
    await user.dblClick(enviar);

    expect(within(formulario).getByRole("button", { name: "Enviando..." })).toBeDisabled();
    expect(bodiesEnviados()).toHaveLength(1);
    responder(json({ id: "c1" }, 201));
  });

  it("409: dice que ya calificó y la sección pasa a calificada", async () => {
    let yaCalificada = false;
    fetchMock.mockImplementation((_url, init) => {
      if (init?.method === "POST") {
        yaCalificada = true;
        return Promise.resolve(json({ codigo: "RESERVA_YA_CALIFICADA", message: "x" }, 409));
      }
      return Promise.resolve(yaCalificada ? CALIFICADA() : SIN_CALIFICAR());
    });
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);
    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);

    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByTestId("calificacion-hecha")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("422: muestra que la reserva no está COMPLETADA y no deja reintentar", async () => {
    fetchMock.mockImplementation((_url, init) =>
      Promise.resolve(
        init?.method === "POST" ? json({ codigo: "RESERVA_NO_COMPLETADA" }, 422) : SIN_CALIFICAR(),
      ),
    );
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);
    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);

    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    expect(await screen.findByTestId("calificacion-no-disponible")).toHaveTextContent(
      "COMPLETADA",
    );
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("error de red: muestra el mensaje y se puede reintentar", async () => {
    fetchMock.mockImplementation((_url, init) =>
      init?.method === "POST"
        ? Promise.reject(new TypeError("network"))
        : Promise.resolve(SIN_CALIFICAR()),
    );
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);
    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);

    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    expect(await within(formulario).findByRole("alert")).toHaveTextContent("conexión");
    expect(within(formulario).getByRole("button", { name: "Enviar calificación" })).toBeEnabled();
  });

  it("otro 404 al consultar muestra «Reserva no disponible»; un error muestra reintentar", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 404, message: "La reserva no existe." }, 404));
    const { unmount } = render(<SeccionCalificacion reservaId={RESERVA} nombreBien="Taladro" />);
    expect(await screen.findByTestId("calificacion-no-disponible")).toHaveTextContent(
      "Reserva no disponible",
    );
    unmount();

    fetchMock.mockResolvedValueOnce(json({ statusCode: 500 }, 500));
    render(<SeccionCalificacion reservaId={RESERVA} nombreBien="Taladro" />);
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("401 al consultar lleva al login", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 401 }, 401));

    render(<SeccionCalificacion reservaId={RESERVA} nombreBien="Taladro" />);

    await waitFor(() => expect(irALogin).toHaveBeenCalled());
  });
});
