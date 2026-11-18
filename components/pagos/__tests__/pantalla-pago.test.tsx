import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PantallaPago } from "../pantalla-pago";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { PagoSimulado } from "@/lib/pagos/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const APRUEBA = "4242424242424242";
const RECHAZA = "4000000000000002";
const CVV = "987";
const AVISO = "Pago simulado: no se realizará ningún cargo real.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pago(datos: Partial<PagoSimulado> = {}): PagoSimulado {
  return {
    pagoId: "8c0d9a3e-1f2b-4c5d-9e8f-7a6b5c4d3e2f",
    reservaId: RESERVA,
    montoTotal: "50.05",
    estado: "APROBADO",
    simulado: true,
    intento: 1,
    ...datos,
  };
}

function rechazo(intento: number) {
  return pago({
    estado: "RECHAZADO",
    intento,
    motivo: "Tarjeta rechazada por la pasarela de prueba",
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

function renderizar() {
  const user = userEvent.setup();
  render(<PantallaPago reservaId={RESERVA} alquiler="45" deposito="5.05" />);
  return user;
}

function campos() {
  return {
    numero: screen.getByLabelText("Número de tarjeta") as HTMLInputElement,
    vencimiento: screen.getByLabelText("Vencimiento (MM/AA)") as HTMLInputElement,
    cvv: screen.getByLabelText("Código de seguridad") as HTMLInputElement,
  };
}

async function llenar(user: ReturnType<typeof userEvent.setup>, numero = APRUEBA) {
  const c = campos();
  await user.type(c.numero, numero);
  await user.type(c.vencimiento, "1228");
  await user.type(c.cvv, CVV);
}

function botonPagar() {
  return screen.getByRole("button", { name: /pagar|procesando/i });
}

function bodyEnviado(i = 0) {
  return JSON.parse(String(fetchMock.mock.calls[i][1]?.body));
}

describe("PantallaPago: resumen del cobro", () => {
  it("muestra alquiler, depósito y total por separado con dos decimales", () => {
    renderizar();

    expect(screen.getByTestId("monto-alquiler")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("monto-deposito")).toHaveTextContent("$5.05");
    expect(screen.getByTestId("monto-total")).toHaveTextContent("$50.05");
  });

  it("indica las tarjetas de prueba", () => {
    renderizar();

    expect(screen.getByText(/el pago se aprueba/i)).toHaveTextContent("4242");
    expect(screen.getByText(/el pago se rechaza/i)).toHaveTextContent("0002");
  });
});

describe("PantallaPago: envío", () => {
  it("envía solo los datos de la tarjeta, sin montos, a su route handler", async () => {
    fetchMock.mockResolvedValue(json(pago(), 201));
    const user = renderizar();

    await llenar(user, "4242 4242 4242 4242");
    await user.click(botonPagar());

    await screen.findByText("Pago aprobado");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/reservas/${RESERVA}/pagos/simulados`);
    expect(init?.method).toBe("POST");
    expect(bodyEnviado()).toEqual({ numeroTarjeta: APRUEBA, vencimiento: "12/28", cvv: CVV });
    expect(JSON.stringify(bodyEnviado())).not.toMatch(/monto|50\.05|45|5\.05/);
  });

  it("deshabilita Pagar mientras procesa y un doble clic envía una sola petición", async () => {
    let responder!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (responder = resolve)));
    const user = renderizar();

    await llenar(user);
    await user.dblClick(botonPagar());

    expect(botonPagar()).toBeDisabled();
    expect(botonPagar()).toHaveTextContent("Procesando pago…");
    await user.click(botonPagar());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    responder(json(pago(), 201));
    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("borra los datos de la tarjeta del formulario al enviar", async () => {
    fetchMock.mockResolvedValue(json(rechazo(1), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    await screen.findByText("Pago rechazado");
    const c = campos();
    expect(c.numero.value).toBe("");
    expect(c.vencimiento.value).toBe("");
    expect(c.cvv.value).toBe("");
  });

  it("solo acepta tarjetas de prueba y no envía nada si no lo es", async () => {
    const user = renderizar();

    await llenar(user, "4111111111111111");
    await user.click(botonPagar());

    expect(screen.getByText(/solo se aceptan tarjetas de prueba: usa una terminada en 4242/i)).toBeInTheDocument();
    expect(campos().numero).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("valida el formato antes de enviar", async () => {
    const user = renderizar();

    await user.click(botonPagar());

    expect(screen.getByText("Ingresa el número de tarjeta.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa el vencimiento.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa el código de seguridad.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("los campos no piden autocompletar y usan teclado numérico", () => {
    renderizar();

    for (const campo of Object.values(campos())) {
      expect(campo).toHaveAttribute("autocomplete", "off");
      expect(campo).toHaveAttribute("inputmode", "numeric");
      expect(campo).not.toHaveAttribute("name");
    }
  });
});

describe("PantallaPago: resultados", () => {
  it("aprobado muestra el total que devuelve el backend", async () => {
    fetchMock.mockResolvedValue(json(pago({ montoTotal: "61.5" }), 201));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    const resultado = await screen.findByTestId("resultado-pago");
    expect(resultado).toHaveTextContent("Pago aprobado");
    expect(resultado).toHaveTextContent("$61.50");
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("rechazado muestra el motivo, que el cobro sigue pendiente y los intentos restantes", async () => {
    fetchMock.mockResolvedValue(json(rechazo(1), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    const resultado = await screen.findByTestId("resultado-pago");
    expect(within(resultado).getByTestId("motivo-rechazo")).toHaveTextContent(
      "Tarjeta rechazada por la pasarela de prueba",
    );
    expect(resultado).toHaveTextContent(/el cobro sigue pendiente/i);
    expect(screen.getByTestId("intentos-restantes")).toHaveTextContent("Te quedan 2 intentos de 3");
    // Puede reintentar.
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled();
  });

  it("calcula los intentos restantes con el intento que devuelve el backend", async () => {
    fetchMock.mockResolvedValue(json(rechazo(2), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    expect(await screen.findByTestId("intentos-restantes")).toHaveTextContent("Te queda 1 intento de 3");
  });

  it("con el tercer rechazo no vuelve a mostrar el formulario y dice que no quedan intentos", async () => {
    fetchMock.mockResolvedValue(json(rechazo(3), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    expect(await screen.findByTestId("intentos-restantes")).toHaveTextContent(
      "Ya no te quedan intentos de pago para esta reserva.",
    );
    expect(screen.getByTestId("resultado-pago")).toHaveTextContent(/el cobro sigue pendiente/i);
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Número de tarjeta")).not.toBeInTheDocument();
  });

  it("permite reintentar después de un rechazo", async () => {
    fetchMock
      .mockResolvedValueOnce(json(rechazo(1), 201))
      .mockResolvedValueOnce(json(pago({ intento: 2 }), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());
    await screen.findByText("Pago rechazado");

    await llenar(user, APRUEBA);
    await user.click(botonPagar());

    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(screen.getByTestId("resultado-pago")).toHaveTextContent("Intento 2 de 3");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("PantallaPago: errores del backend", () => {
  function errorConCodigo(status: number, codigo: string) {
    return json({ statusCode: status, message: "mensaje del backend", error: "x", codigo }, status);
  }

  it.each([
    [400, "TARJETA_NO_VALIDA", /no es válida para la pasarela de prueba/i, true],
    [409, "PAGO_EN_PROCESO", /ya hay un pago en proceso/i, true],
    [409, "PAGO_YA_APROBADO", /ya tiene un pago aprobado/i, false],
    [409, "INTENTOS_AGOTADOS", /ya usaste los 3 intentos/i, false],
    [409, "RESERVA_NO_CONFIRMADA", /solo se puede pagar una reserva confirmada/i, false],
  ])("%i %s muestra su mensaje", async (status, codigo, mensaje, reintentable) => {
    fetchMock.mockResolvedValue(errorConCodigo(status, codigo));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    const resultado = await screen.findByTestId("resultado-pago");
    expect(resultado).toHaveTextContent(mensaje);
    expect(resultado).not.toHaveTextContent("mensaje del backend");
    if (reintentable) {
      expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled();
    } else {
      expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    }
  });

  it.each([
    [403, { statusCode: 403, message: "Forbidden resource" }, /solo el arrendatario de la reserva/i],
    [404, { statusCode: 404, message: "La reserva no existe." }, /la reserva no existe o no es tuya/i],
    [502, { statusCode: 502, message: "x" }, /no se pudo conectar con el servidor/i],
    [500, { statusCode: 500, message: "x" }, /error inesperado/i],
  ])("%i sin codigo muestra un mensaje claro", async (status, body, mensaje) => {
    fetchMock.mockResolvedValue(json(body, status));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(mensaje);
  });

  it("400 de validación sin codigo muestra el primer mensaje del backend", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          statusCode: 400,
          message: ["El vencimiento debe tener el formato MM/AA, con mes de 01 a 12."],
          error: "Bad Request",
        },
        400,
      ),
    );
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(
      "El vencimiento debe tener el formato MM/AA, con mes de 01 a 12.",
    );
  });

  it("sin conexión muestra un error y deja reintentar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(/no se pudo conectar/i);
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled();
  });

  it("401 vuelve al login", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 401, message: "La sesión expiró." }, 401));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    await vi.waitFor(() => expect(irALogin).toHaveBeenCalledTimes(1));
  });
});

describe("PantallaPago: aviso y privacidad", () => {
  it("el aviso de pago simulado se ve en todos los estados", async () => {
    let responder!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (responder = resolve)))
      .mockResolvedValueOnce(json(pago({ intento: 2 }), 201));
    const user = renderizar();

    // listo
    expect(screen.getByTestId("aviso-pago-simulado")).toHaveTextContent(AVISO);

    // procesando
    await llenar(user, RECHAZA);
    await user.click(botonPagar());
    expect(screen.getByTestId("aviso-pago-simulado")).toHaveTextContent(AVISO);

    // rechazado
    responder(json(rechazo(1), 201));
    await screen.findByText("Pago rechazado");
    expect(screen.getByTestId("aviso-pago-simulado")).toHaveTextContent(AVISO);

    // aprobado
    await llenar(user, APRUEBA);
    await user.click(botonPagar());
    await screen.findByText("Pago aprobado");
    expect(screen.getByTestId("aviso-pago-simulado")).toHaveTextContent(AVISO);
  });

  it("el aviso también se ve con un error", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 409, codigo: "INTENTOS_AGOTADOS" }, 409));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    await screen.findByTestId("resultado-pago");
    expect(screen.getByTestId("aviso-pago-simulado")).toHaveTextContent(AVISO);
  });

  it("no guarda la tarjeta en storage, cookies, URL ni consola", async () => {
    // Almacenamientos falsos: el localStorage experimental de Node tapa al de
    // jsdom, así que se reemplazan los dos para espiar cualquier escritura.
    function almacenamientoFalso() {
      const datos = new Map<string, string>();
      return {
        get length() {
          return datos.size;
        },
        key: vi.fn((i: number) => [...datos.keys()][i] ?? null),
        getItem: vi.fn((k: string) => datos.get(k) ?? null),
        setItem: vi.fn((k: string, v: string) => void datos.set(k, String(v))),
        removeItem: vi.fn((k: string) => void datos.delete(k)),
        clear: vi.fn(() => datos.clear()),
      };
    }
    const local = almacenamientoFalso();
    const sesion = almacenamientoFalso();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", sesion);
    const indexedDbOpen = vi.fn();
    vi.stubGlobal("indexedDB", { open: indexedDbOpen });
    const consola = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m),
    );
    fetchMock.mockResolvedValue(json(rechazo(1), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());
    await screen.findByText("Pago rechazado");

    expect(local.setItem).not.toHaveBeenCalled();
    expect(sesion.setItem).not.toHaveBeenCalled();
    expect(local.length).toBe(0);
    expect(sesion.length).toBe(0);
    expect(indexedDbOpen).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain("0002");
    expect(window.location.href).not.toContain("0002");
    const escrito = consola.flatMap((s) => s.mock.calls.flat()).map(String).join(" ");
    expect(escrito).not.toContain(RECHAZA);
    expect(escrito).not.toContain(CVV);
  });
});
