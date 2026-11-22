import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SeccionCalificacion } from "../seccion-calificacion";
import { PromedioCalificacion } from "@/components/publicaciones/promedio-calificacion";

/**
 * Plan de pruebas, H17. Calificar el bien y al arrendador: pruebas de
 * componente de la interfaz. Un `it('ACn: ...')` por criterio y, al final,
 * los casos negativos.
 */

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

function bodiesEnviados() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init?.body)));
}

/** El POST responde `respuestaPost`; las consultas responden "sin calificar". */
function simular(respuestaPost: () => Response) {
  fetchMock.mockImplementation((_url, init) =>
    Promise.resolve(init?.method === "POST" ? respuestaPost() : SIN_CALIFICAR()),
  );
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

async function enviarValida(user: ReturnType<typeof userEvent.setup>) {
  const formulario = await abrirFormulario(user);
  await elegir(user, formulario, "bien", 4);
  await elegir(user, formulario, "arrendador", 5);
  await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));
  return formulario;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

describe("H17. Calificar el bien y al arrendador (interfaz)", () => {
  it("AC1: el formulario ofrece dos escalas de 1 a 5 y un comentario de hasta 500 caracteres, y se envía lo capturado", async () => {
    simular(() => json({ id: "c1" }, 201));
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    for (const escala of ["bien", "arrendador"] as const) {
      const grupo = within(formulario).getByRole("group", {
        name: new RegExp(`calificación del ${escala}`, "i"),
      });
      expect(within(grupo).getAllByRole("radio")).toHaveLength(5);
    }
    expect(screen.getByText("0/500")).toBeInTheDocument();

    await elegir(user, formulario, "bien", 1);
    await elegir(user, formulario, "arrendador", 5);
    const comentario = within(formulario).getByLabelText(/comentario/i);
    await user.click(comentario);
    await user.paste("a".repeat(600));
    expect(comentario).toHaveValue("a".repeat(500));
    expect(screen.getByText("500/500")).toBeInTheDocument();
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

    await waitFor(() => expect(bodiesEnviados()).toHaveLength(1));
    expect(bodiesEnviados()[0]).toEqual({
      puntajeBien: 1,
      puntajeArrendador: 5,
      comentario: "a".repeat(500),
    });
  });

  it("AC2: el promedio del bien y del arrendador se muestra con un decimal sobre 5 y el total", () => {
    render(<PromedioCalificacion promedioBien={4.5} promedioArrendador={4.5} total={2} />);

    const bloque = screen.getByLabelText("Calificaciones");
    expect(bloque).toHaveTextContent("Calificación del bien");
    expect(bloque).toHaveTextContent("4.5 de 5");
    expect(bloque).toHaveTextContent("2 calificaciones");
    expect(bloque).toHaveTextContent("Calificación del arrendador");
  });

  it("AC3: si la reserva no está COMPLETADA (422) se avisa y no se puede volver a calificar", async () => {
    simular(() => json({ codigo: "RESERVA_NO_COMPLETADA" }, 422));
    const user = userEvent.setup();

    await enviarValida(user);

    expect(await screen.findByTestId("calificacion-no-disponible")).toHaveTextContent(
      "Solo puedes calificar una reserva que ya está COMPLETADA",
    );
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("AC4: si la reserva ya fue calificada (409) se avisa y no se ofrece calificar de nuevo", async () => {
    let yaCalificada = false;
    fetchMock.mockImplementation((_url, init) => {
      if (init?.method === "POST") {
        yaCalificada = true;
        return Promise.resolve(json({ codigo: "RESERVA_YA_CALIFICADA", message: "Ya calificaste esta reserva." }, 409));
      }
      return Promise.resolve(
        yaCalificada
          ? json({
              id: "c1",
              reservaId: RESERVA,
              puntajeBien: 4,
              puntajeArrendador: 5,
              comentario: null,
              fechaRegistro: "2026-11-12T16:00:00.000Z",
            })
          : SIN_CALIFICAR(),
      );
    });
    const user = userEvent.setup();

    await enviarValida(user);

    expect(await screen.findByTestId("calificacion-hecha")).toHaveTextContent("Ya calificaste");
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("AC5: si la reserva es de otro arrendatario (404) se avisa que ya no está disponible", async () => {
    simular(() => json({ statusCode: 404, message: "La reserva no existe." }, 404));
    const user = userEvent.setup();

    await enviarValida(user);

    expect(await screen.findByTestId("calificacion-no-disponible")).toHaveTextContent(
      "Esta reserva ya no está disponible.",
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Calificar" })).not.toBeInTheDocument();
  });

  it("AC6: puntajes fuera de rango o comentario demasiado largo: se rechaza y no se guarda nada", async () => {
    simular(() => json({ statusCode: 400, message: "El puntaje debe estar entre 1 y 5" }, 400));
    const user = userEvent.setup();
    const formulario = await abrirFormulario(user);

    // Cliente: sin puntajes no se llama al backend.
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));
    expect(within(formulario).getByText(/califica el bien/i)).toBeInTheDocument();
    expect(within(formulario).getByText(/califica al arrendador/i)).toBeInTheDocument();
    expect(bodiesEnviados()).toHaveLength(0);

    // Servidor: un 400 se muestra y el formulario sigue abierto.
    await elegir(user, formulario, "bien", 4);
    await elegir(user, formulario, "arrendador", 5);
    await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));
    expect(await within(formulario).findByRole("alert")).toHaveTextContent("entre 1 y 5");
    expect(screen.queryByTestId("calificacion-hecha")).not.toBeInTheDocument();
  });

  describe("casos negativos", () => {
    it("NEG1: con solo una escala elegida no se envía", async () => {
      simular(() => json({ id: "c1" }, 201));
      const user = userEvent.setup();
      const formulario = await abrirFormulario(user);

      await elegir(user, formulario, "bien", 4);
      await user.click(within(formulario).getByRole("button", { name: "Enviar calificación" }));

      expect(within(formulario).getByText(/califica al arrendador/i)).toBeInTheDocument();
      expect(bodiesEnviados()).toHaveLength(0);
    });

    it("NEG2: un doble clic en enviar manda una sola calificación", async () => {
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

      await user.dblClick(within(formulario).getByRole("button", { name: "Enviar calificación" }));

      expect(bodiesEnviados()).toHaveLength(1);
      responder(json({ id: "c1" }, 201));
    });

    it("NEG3: sin ninguna calificación se muestra «Sin calificaciones» y no un promedio", () => {
      render(<PromedioCalificacion promedioBien={null} promedioArrendador={null} total={0} />);

      const bloque = screen.getByLabelText("Calificaciones");
      expect(bloque).toHaveTextContent("Sin calificaciones");
      expect(bloque).not.toHaveTextContent("de 5");
    });

    it("NEG4: un error de red muestra el aviso y permite reintentar sin perder la captura", async () => {
      fetchMock.mockImplementation((_url, init) =>
        init?.method === "POST"
          ? Promise.reject(new TypeError("network"))
          : Promise.resolve(SIN_CALIFICAR()),
      );
      const user = userEvent.setup();

      const formulario = await enviarValida(user);

      expect(await within(formulario).findByRole("alert")).toHaveTextContent("conexión");
      expect(within(formulario).getByRole("button", { name: "Enviar calificación" })).toBeEnabled();
    });
  });
});
