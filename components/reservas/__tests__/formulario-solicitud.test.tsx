import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioSolicitud } from "../formulario-solicitud";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ID = "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6";
const RESERVA_ID = "91b7a5c3-1d2e-4f30-8a4b-5c6d7e8f9a0b";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Envio = { publicacionId: string; inicio: string; fin: string };

/**
 * Backend simulado: disponibilidad sin ocupados y la solicitud de reserva con
 * la respuesta que pida cada prueba. Guarda lo que se envió.
 */
function simularBackend(
  responder: (envio: Envio) => Response | Promise<Response> = (e) =>
    json(
      {
        id: RESERVA_ID,
        estado: "PENDIENTE",
        publicacion: { id: ID, nombre: "Taladro percutor" },
        inicio: e.inicio,
        fin: e.fin,
        costoAlquiler: "45.00",
        depositoMonto: "20.00",
        creadaAt: "2026-11-17T16:00:00.000Z",
        decididaAt: null,
        motivoRechazo: null,
      },
      201,
    ),
) {
  const envios: Envio[] = [];
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    if (url.pathname === `/api/publicaciones/${ID}/disponibilidad`) {
      const desde = url.searchParams.get("desde") ?? "";
      const hasta = url.searchParams.get("hasta") ?? "";
      return json({ publicacionId: ID, desde, hasta, ocupados: [] });
    }
    if (url.pathname === "/api/reservas" && init?.method === "POST") {
      const envio = JSON.parse(String(init.body)) as Envio;
      envios.push(envio);
      return responder(envio);
    }
    throw new Error(`Llamada no esperada: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { envios };
}

// Hoy: 17 de noviembre de 2026, 10:00 en El Salvador.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const dia = (d: string) => screen.getByRole("button", { name: new RegExp(`^${d}, `) });
const enviar = () => screen.getByRole("button", { name: /Solicitar reserva|Enviando/ });

function formulario(tarifaUnidad: "HORA" | "DIA" | "NOCHE" | "SEMANA" = "HORA", tarifa = "15.00") {
  render(
    <FormularioSolicitud
      publicacionId={ID}
      tarifaMonto={tarifa}
      tarifaUnidad={tarifaUnidad}
      depositoMonto="20.00"
    />,
  );
}

async function elegirDias(user: ReturnType<typeof userEvent.setup>, desde: string, hasta = desde) {
  await user.click(await screen.findByRole("button", { name: new RegExp(`^${desde}, `) }));
  await user.click(dia(hasta));
  await waitFor(() => expect(screen.getByText(/\(días libres\)/)).toBeInTheDocument());
}

describe("FormularioSolicitud", () => {
  it("no se puede enviar hasta elegir un período", async () => {
    simularBackend();
    formulario();

    expect(enviar()).toBeDisabled();
    expect(screen.queryByTestId("costo")).not.toBeInTheDocument();
  });

  it("tarifa por hora: muestra el costo estimado y el depósito por separado antes de enviar", async () => {
    simularBackend();
    const user = userEvent.setup();
    formulario("HORA", "15.00");

    await elegirDias(user, "18 nov 2026");

    expect(screen.getByTestId("costo")).toHaveTextContent("$45.00");
    expect(screen.getByText("3 horas × $15.00")).toBeInTheDocument();
    expect(screen.getByTestId("deposito")).toHaveTextContent("$20.00");
    expect(screen.getByText(/Aparte del costo del alquiler/)).toBeInTheDocument();
    expect(enviar()).toBeEnabled();
  });

  it("una fracción de hora se estima hacia arriba", async () => {
    simularBackend();
    const user = userEvent.setup();
    formulario("HORA", "15.00");
    await elegirDias(user, "18 nov 2026");

    await user.clear(screen.getByLabelText("Hora de fin"));
    await user.type(screen.getByLabelText("Hora de fin"), "11:10");

    expect(screen.getByText("3 horas × $15.00")).toBeInTheDocument();
    expect(screen.getByTestId("costo")).toHaveTextContent("$45.00");
  });

  it("envía las fechas ISO con -06:00, sin ningún monto, y muestra el número y PENDIENTE", async () => {
    const { envios } = simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(envios).toEqual([
      {
        publicacionId: ID,
        inicio: "2026-11-18T09:00:00-06:00",
        fin: "2026-11-18T12:00:00-06:00",
      },
    ]);
    const hecho = await screen.findByTestId("solicitud-enviada");
    expect(hecho).toHaveTextContent(RESERVA_ID);
    expect(hecho).toHaveTextContent("PENDIENTE");
    expect(hecho).toHaveTextContent(/no es una reserva confirmada/i);
    expect(hecho).not.toHaveTextContent("CONFIRMADA");
    expect(screen.getByTestId("costo")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("deposito")).toHaveTextContent("$20.00");
    expect(screen.getByRole("link", { name: "Ver mi solicitud" })).toHaveAttribute(
      "href",
      `/reservas/${RESERVA_ID}`,
    );
  });

  it("tarifa por día: días completos y costo por 24 horas", async () => {
    const { envios } = simularBackend();
    const user = userEvent.setup();
    formulario("DIA", "25.00");

    await elegirDias(user, "18 nov 2026", "19 nov 2026");

    expect(screen.queryByLabelText("Hora de inicio")).not.toBeInTheDocument();
    expect(screen.getByText("2 días × $25.00")).toBeInTheDocument();
    expect(screen.getByTestId("costo")).toHaveTextContent("$50.00");
    await user.click(enviar());
    await screen.findByTestId("solicitud-enviada");
    expect(envios[0]).toMatchObject({
      inicio: "2026-11-18T00:00:00-06:00",
      fin: "2026-11-20T00:00:00-06:00",
    });
  });

  it("la hora de fin igual o anterior a la de inicio se explica y bloquea el envío", async () => {
    simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.clear(screen.getByLabelText("Hora de fin"));
    await user.type(screen.getByLabelText("Hora de fin"), "08:00");

    expect(screen.getByRole("alert")).toHaveTextContent(/fin debe ser posterior/);
    expect(enviar()).toBeDisabled();
    expect(screen.queryByTestId("costo")).not.toBeInTheDocument();
  });

  it("hoy con una hora que ya pasó: lo explica y bloquea el envío", async () => {
    simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "17 nov 2026");

    expect(screen.getByRole("alert")).toHaveTextContent(/hora de inicio ya pasó/);
    expect(enviar()).toBeDisabled();
  });

  it("con tarifa por día, empezar hoy ya es el pasado", async () => {
    simularBackend();
    const user = userEvent.setup();
    formulario("DIA", "25.00");
    await elegirDias(user, "17 nov 2026");

    expect(screen.getByRole("alert")).toHaveTextContent(/empezar en el pasado/);
    expect(enviar()).toBeDisabled();
  });

  it("no deja elegir un día pasado", async () => {
    simularBackend();
    formulario();

    await screen.findByRole("button", { name: /^18 nov 2026, / });
    expect(dia("10 nov 2026")).toHaveAttribute("data-estado", "pasado");
  });

  it("409: dice que el período no está disponible, no muestra confirmación y pide elegir de nuevo", async () => {
    simularBackend(() =>
      json({ statusCode: 409, codigo: "PERIODO_NO_DISPONIBLE", message: "ocupado" }, 409),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya no está disponible/);
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
    expect(screen.queryByText("Enviamos tu solicitud al arrendador.")).not.toBeInTheDocument();
    // La selección se limpia: hay que elegir otras fechas.
    expect(enviar()).toBeDisabled();
  });

  it("400 FECHA_PASADA: explica que el inicio ya pasó", async () => {
    simularBackend(() =>
      json({ statusCode: 400, codigo: "FECHA_PASADA", message: "La fecha de inicio ya pasó." }, 400),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/fecha de inicio ya pasó/);
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
  });

  it("400 de fechas inválidas: muestra el mensaje del backend", async () => {
    simularBackend(() =>
      json({ statusCode: 400, message: ["La fecha fin debe ser posterior a la de inicio."] }, 400),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La fecha fin debe ser posterior a la de inicio.",
    );
  });

  it("422 VERIFICACION_REQUERIDA: muestra el motivo y el acceso a la verificación", async () => {
    simularBackend(() =>
      json(
        {
          statusCode: 422,
          codigo: "VERIFICACION_REQUERIDA",
          message: "Esta publicación solo acepta usuarios verificados.",
        },
        422,
      ),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(
      await screen.findByText("Esta publicación solo acepta usuarios verificados."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verificar mi identidad" })).toHaveAttribute(
      "href",
      "/verificacion",
    );
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
  });

  it("403 y 404 tienen su explicación", async () => {
    let status = 403;
    simularBackend(() => json({ statusCode: status, message: "x" }, status));
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Solo un arrendatario/);

    status = 404;
    await user.click(enviar());
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/ya no está disponible/),
    );
  });

  it("sin conexión: lo dice y se puede reintentar con el mismo período", async () => {
    let falla = true;
    const { envios } = simularBackend(() => {
      if (falla) return json({}, 503);
      return json(
        {
          id: RESERVA_ID,
          estado: "PENDIENTE",
          publicacion: { id: ID, nombre: "Taladro" },
          inicio: "2026-11-18T09:00:00-06:00",
          fin: "2026-11-18T12:00:00-06:00",
          costoAlquiler: "45.00",
          depositoMonto: "20.00",
          creadaAt: "2026-11-17T16:00:00.000Z",
          decididaAt: null,
          motivoRechazo: null,
        },
        201,
      );
    });
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Revisa tu conexión/);
    expect(enviar()).toBeEnabled();

    falla = false;
    await user.click(enviar());
    await screen.findByTestId("solicitud-enviada");
    expect(envios).toHaveLength(2);
  });

  it("dos clics seguidos envían una sola solicitud", async () => {
    let resolver: (r: Response) => void = () => {};
    const { envios } = simularBackend(
      () =>
        new Promise<Response>((resolve) => {
          resolver = resolve;
        }),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.dblClick(enviar());

    expect(envios).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
    resolver(
      json(
        {
          id: RESERVA_ID,
          estado: "PENDIENTE",
          publicacion: { id: ID, nombre: "Taladro" },
          inicio: "2026-11-18T09:00:00-06:00",
          fin: "2026-11-18T12:00:00-06:00",
          costoAlquiler: "45.00",
          depositoMonto: "20.00",
          creadaAt: "2026-11-17T16:00:00.000Z",
          decididaAt: null,
          motivoRechazo: null,
        },
        201,
      ),
    );
    await screen.findByTestId("solicitud-enviada");
    expect(envios).toHaveLength(1);
  });
});
