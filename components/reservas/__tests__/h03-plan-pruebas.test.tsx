/**
 * Plan de pruebas, H03. Solicitar una reserva: pruebas de componente de la
 * interfaz. Un `it('ACn: ...')` por criterio que se ve en pantalla y, al
 * final, los casos negativos.
 *
 * AC6 (el aviso «Nueva solicitud de reserva» al arrendador) lo genera y lo
 * guarda el backend; la interfaz del arrendatario no lo muestra, así que se
 * prueba en test/qa/qa-03.1-solicitudes.e2e-spec.ts del backend (caso S18).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EstadoReserva } from "../estado-reserva";
import { FormularioSolicitud } from "../formulario-solicitud";
import { ResumenReserva } from "../resumen-reserva";

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

describe("H03. Solicitar una reserva (interfaz)", () => {
  it("AC1: con fechas libres se envía la solicitud y queda PENDIENTE", async () => {
    const { envios } = simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(envios).toHaveLength(1);
    const hecho = await screen.findByTestId("solicitud-enviada");
    expect(hecho).toHaveTextContent("PENDIENTE");
    expect(hecho).toHaveTextContent(RESERVA_ID);
    expect(hecho).not.toHaveTextContent("CONFIRMADA");
  });

  it("AC2: el detalle muestra fechas, estado y costo con dos decimales, y el depósito aparte", () => {
    render(
      <>
        <EstadoReserva estado="PENDIENTE" numero={RESERVA_ID} />
        <ResumenReserva
          inicio="2026-11-18T09:00:00-06:00"
          fin="2026-11-18T12:00:00-06:00"
          costo="45.30"
          deposito="20.00"
        />
      </>,
    );

    expect(screen.getByText("PENDIENTE")).toBeInTheDocument();
    expect(screen.getByTestId("periodo")).toHaveTextContent("18 nov 2026, 09:00 – 12:00");
    expect(screen.getByTestId("costo")).toHaveTextContent("$45.30");
    expect(screen.getByTestId("deposito")).toHaveTextContent("$20.00");
    expect(screen.getByText("Costo del alquiler")).toBeInTheDocument();
  });

  it("AC3: con la fecha o la hora final igual o anterior a la inicial se explica el motivo y no se envía", async () => {
    const { envios } = simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.clear(screen.getByLabelText("Hora de fin"));
    await user.type(screen.getByLabelText("Hora de fin"), "08:00");

    expect(screen.getByRole("alert")).toHaveTextContent(/fin debe ser posterior/);
    expect(enviar()).toBeDisabled();
    expect(envios).toHaveLength(0);
  });

  it("AC3 (servidor): un 400 por fechas inválidas muestra el mensaje del backend", async () => {
    simularBackend(() =>
      json({ statusCode: 400, message: ["La fecha fin debe ser posterior a la de inicio."] }, 400),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/fecha fin debe ser posterior/);
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
  });

  it("AC5: con un inicio que ya pasó no deja enviar y explica el motivo", async () => {
    const { envios } = simularBackend();
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "17 nov 2026");

    expect(screen.getByRole("alert")).toHaveTextContent(/hora de inicio ya pasó/);
    expect(enviar()).toBeDisabled();
    expect(envios).toHaveLength(0);
  });

  it("AC5 (servidor): un 400 FECHA_PASADA explica que el inicio ya pasó", async () => {
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

  it("AC4: con fechas que chocan se avisa que el período no está disponible y no se confirma nada", async () => {
    simularBackend(() =>
      json({ statusCode: 409, codigo: "PERIODO_NO_DISPONIBLE", message: "ocupado" }, 409),
    );
    const user = userEvent.setup();
    formulario();
    await elegirDias(user, "18 nov 2026");

    await user.click(enviar());

    expect(await screen.findByRole("alert")).toHaveTextContent(/no está disponible/);
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
  });

  it("AC7: si la publicación pide verificación y no la tengo, se ve el motivo y el acceso a verificarme", async () => {
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

  describe("casos negativos", () => {
    it("NEG1: sin elegir un período no se puede enviar", () => {
      const { envios } = simularBackend();
      formulario();

      expect(enviar()).toBeDisabled();
      expect(envios).toHaveLength(0);
    });

    it("NEG2: no deja elegir un día pasado", async () => {
      simularBackend();
      formulario();

      await screen.findByRole("button", { name: /^18 nov 2026, / });
      expect(dia("10 nov 2026")).toHaveAttribute("data-estado", "pasado");
    });

    it("NEG3: dos clics seguidos envían una sola solicitud", async () => {
      const { envios } = simularBackend();
      const user = userEvent.setup();
      formulario();
      await elegirDias(user, "18 nov 2026");

      await user.dblClick(enviar());

      await screen.findByTestId("solicitud-enviada");
      expect(envios).toHaveLength(1);
    });

    it("NEG4: sin permiso (403) o con la publicación ya inexistente (404) se explica y no se confirma", async () => {
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
      expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
    });
  });
});
