// Plan de pruebas de H05 (MP4-18). Los números de criterio son los de Jira.
// Solo se cubren los criterios que se ven en la UI; la persistencia, los
// avisos (AC8) y la cancelación por falta de pago (AC9) se prueban en el
// backend.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PantallaPago } from "../pantalla-pago";
import ReservaPage from "@/app/reservas/[id]/page";
import { RutaProtegida } from "@/components/ruta-protegida";
import { getCurrentUser, requireUser, type Rol } from "@/lib/dal";
import type { PagoSimulado } from "@/lib/pagos/tipos";
import { obtenerReserva } from "@/lib/reservas/api";
import type { EstadoReserva, Reserva } from "@/lib/reservas/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireUser: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@/lib/reservas/api", () => ({ obtenerReserva: vi.fn() }));

const RESERVA = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const APRUEBA = "4242424242424242";
const RECHAZA = "4000000000000002";
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
  return pago({ estado: "RECHAZADO", intento, motivo: "Fondos insuficientes (simulado)" });
}

function errorConCodigo(status: number, codigo: string) {
  return json({ statusCode: status, message: "mensaje del backend", error: "x", codigo }, status);
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

function renderizar(alquiler = "45", deposito = "5.05") {
  const user = userEvent.setup();
  render(<PantallaPago reservaId={RESERVA} alquiler={alquiler} deposito={deposito} />);
  return user;
}

async function llenar(user: ReturnType<typeof userEvent.setup>, numero = APRUEBA) {
  await user.type(screen.getByLabelText("Número de tarjeta"), numero);
  await user.type(screen.getByLabelText("Vencimiento (MM/AA)"), "1228");
  await user.type(screen.getByLabelText("Código de seguridad"), "987");
}

function botonPagar() {
  return screen.getByRole("button", { name: /pagar|procesando/i });
}

/**
 * Renderiza /reservas/{id}: resuelve RutaProtegida y luego ContenidoReserva,
 * que son Server Components async y no están exportados.
 */
async function renderDetalle(estado: EstadoReserva, rol: Rol = "ARRENDATARIO") {
  const usuario = { id: "1", email: "a@a.a", rol, nombre: null, telefono: null };
  vi.mocked(requireUser).mockResolvedValue(usuario);
  vi.mocked(getCurrentUser).mockResolvedValue(usuario);
  const reserva: Reserva = {
    id: RESERVA,
    estado,
    publicacion: { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", nombre: "Proyector" },
    inicio: "2026-11-25T09:00:00-06:00",
    fin: "2026-11-26T09:00:00-06:00",
    costoAlquiler: "45.00",
    depositoMonto: "5.05",
    creadaAt: "2026-11-20T10:00:00.000Z",
    decididaAt: null,
    motivoRechazo: null,
  };
  vi.mocked(obtenerReserva).mockResolvedValue(reserva);
  // EstadoPago consulta el último pago al montarse; no hace falta responder.
  fetchMock.mockReturnValue(new Promise(() => {}));

  const pagina = (await ReservaPage({
    params: Promise.resolve({ id: RESERVA }),
  } as PageProps<"/reservas/[id]">)) as ReactElement<{ roles: Rol[]; children: ReactNode }>;
  const ruta = (await RutaProtegida(pagina.props)) as ReactElement<{ children: ReactElement }>;
  const contenido = ruta.props.children as ReactElement<{ id: string }>;
  const componente = contenido.type as (p: { id: string }) => Promise<ReactElement>;
  render(await componente(contenido.props));
}

describe("H05. Realizar un pago simulado", () => {
  it("AC1: muestra el costo del alquiler, el depósito y el total como la suma de ambos", () => {
    renderizar("45", "5.05");

    expect(screen.getByTestId("monto-alquiler")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("monto-deposito")).toHaveTextContent("$5.05");
    expect(screen.getByTestId("monto-total")).toHaveTextContent("$50.05");
  });

  it("AC1: con depósito 0 el total es igual al alquiler", () => {
    renderizar("30.5", "0.00");

    expect(screen.getByTestId("monto-deposito")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("monto-total")).toHaveTextContent("$30.50");
  });

  it("AC3: con 0002 muestra RECHAZADO con el motivo y permite volver a intentar", async () => {
    fetchMock
      .mockResolvedValueOnce(json(rechazo(1), 201))
      .mockResolvedValueOnce(json(pago({ intento: 2 }), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    const resultado = await screen.findByTestId("resultado-pago");
    expect(resultado).toHaveTextContent("Pago rechazado");
    expect(within(resultado).getByTestId("motivo-rechazo")).toHaveTextContent(
      "Fondos insuficientes (simulado)",
    );
    expect(screen.getByTestId("intentos-restantes")).toHaveTextContent("Te quedan 2 intentos de 3");

    // Reintento
    await llenar(user, APRUEBA);
    await user.click(botonPagar());
    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each<EstadoReserva>(["PENDIENTE", "RECHAZADA", "CANCELADA"])(
    "AC4: una reserva %s no ofrece «Pagar reserva» en su detalle",
    async (estado) => {
      await renderDetalle(estado);

      expect(screen.getByRole("heading", { name: "Reserva" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Pagar reserva" })).not.toBeInTheDocument();
    },
  );

  it("AC4: una reserva CONFIRMADA sí ofrece «Pagar reserva» (control)", async () => {
    await renderDetalle("CONFIRMADA");

    expect(screen.getByRole("link", { name: "Pagar reserva" })).toHaveAttribute(
      "href",
      `/reservas/${RESERVA}/pago`,
    );
  });

  it("AC4: si el backend responde RESERVA_NO_CONFIRMADA, no deja pagar y explica que debe estar confirmada", async () => {
    fetchMock.mockResolvedValue(errorConCodigo(409, "RESERVA_NO_CONFIRMADA"));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(
      /solo se puede pagar una reserva confirmada/i,
    );
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("AC5: un doble clic en Pagar registra una sola petición", async () => {
    let responder!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (responder = resolve)));
    const user = renderizar();

    await llenar(user);
    await user.dblClick(botonPagar());

    expect(botonPagar()).toBeDisabled();
    responder(json(pago(), 201));
    expect(await screen.findByText("Pago aprobado")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("AC5: con el pago APROBADO ya no se puede volver a pagar", async () => {
    fetchMock.mockResolvedValue(json(pago(), 201));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    await screen.findByText("Pago aprobado");
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Número de tarjeta")).not.toBeInTheDocument();
  });

  it("AC5: si el backend responde PAGO_YA_APROBADO, no muestra el formulario otra vez", async () => {
    fetchMock.mockResolvedValue(errorConCodigo(409, "PAGO_YA_APROBADO"));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(/ya tiene un pago aprobado/i);
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("AC6: después del tercer rechazo no ofrece un cuarto intento", async () => {
    fetchMock.mockResolvedValue(json(rechazo(3), 201));
    const user = renderizar();

    await llenar(user, RECHAZA);
    await user.click(botonPagar());

    expect(await screen.findByTestId("intentos-restantes")).toHaveTextContent(
      "Ya no te quedan intentos de pago para esta reserva.",
    );
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  it("AC6: si el backend responde INTENTOS_AGOTADOS, bloquea el pago", async () => {
    fetchMock.mockResolvedValue(errorConCodigo(409, "INTENTOS_AGOTADOS"));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(/3 intentos/);
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
  });

  // DEFECTO (H05-AC6): el criterio pide el texto «Se alcanzó el máximo de 3
  // intentos de pago»; la UI muestra «Ya usaste los 3 intentos de pago de esta
  // reserva. El cobro sigue pendiente.» (lib/pagos/errores.ts). Cuando se
  // corrija, esta prueba fallará: quitar `.fails`.
  it.fails("AC6: al intentar un cuarto pago muestra «Se alcanzó el máximo de 3 intentos de pago»", async () => {
    fetchMock.mockResolvedValue(errorConCodigo(409, "INTENTOS_AGOTADOS"));
    const user = renderizar();

    await llenar(user);
    await user.click(botonPagar());

    expect(await screen.findByTestId("resultado-pago")).toHaveTextContent(
      "Se alcanzó el máximo de 3 intentos de pago",
    );
  });

  it("AC7: el aviso de que no hay cargos reales se ve antes, durante y después del pago", async () => {
    let responder!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (responder = resolve)))
      .mockResolvedValueOnce(errorConCodigo(409, "INTENTOS_AGOTADOS"));
    const user = renderizar();
    expect(screen.getByRole("note")).toHaveTextContent(AVISO);

    await llenar(user, RECHAZA);
    await user.click(botonPagar());
    expect(screen.getByRole("note")).toHaveTextContent(AVISO);

    responder(json(rechazo(1), 201));
    await screen.findByText("Pago rechazado");
    expect(screen.getByRole("note")).toHaveTextContent(AVISO);

    await llenar(user);
    await user.click(botonPagar());
    await screen.findByText("No se pudo completar el pago");
    expect(screen.getByRole("note")).toHaveTextContent(AVISO);
  });

  it("Negativo: una tarjeta que no es de prueba no se envía y se marca el campo", async () => {
    const user = renderizar();

    await llenar(user, "4111111111111111");
    await user.click(botonPagar());

    expect(screen.getByText(/solo se aceptan tarjetas de prueba: usa una terminada en 4242/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Número de tarjeta")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Negativo: un vencimiento con mes 13 no se envía", async () => {
    const user = renderizar();

    await user.type(screen.getByLabelText("Número de tarjeta"), APRUEBA);
    await user.type(screen.getByLabelText("Vencimiento (MM/AA)"), "1328");
    await user.type(screen.getByLabelText("Código de seguridad"), "987");
    await user.click(botonPagar());

    expect(screen.getByLabelText("Vencimiento (MM/AA)")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
