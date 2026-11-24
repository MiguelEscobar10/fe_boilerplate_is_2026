import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EstadoPago } from "../estado-pago";
import type { UltimoPago } from "@/lib/pagos/tipos";

/**
 * Plan de pruebas, H06. Consultar el estado de un pago: pruebas de componente
 * de la interfaz. Un `it('ACn: ...')` por criterio y, al final, los casos
 * negativos.
 */

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const PAGO = "8c0d9a3e-1f2b-4c5d-9e8f-7a6b5c4d3e2f";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pago(datos: Partial<UltimoPago> = {}): UltimoPago {
  return {
    pagoId: PAGO,
    reservaId: RESERVA,
    montoTotal: "65.00",
    fechaRegistro: "2026-11-12T16:00:00.000Z",
    estado: "APROBADO",
    simulado: true,
    ...datos,
  };
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});

describe("H06. Consultar el estado de un pago (interfaz)", () => {
  it("AC1: con un pago veo el monto, la fecha, el número de reserva y el estado", async () => {
    fetchMock.mockResolvedValue(json(pago()));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("detalle-pago")).toBeInTheDocument();
    expect(screen.getByTestId("pago-importe")).toHaveTextContent("$65.00");
    expect(screen.getByTestId("pago-fecha")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("pago-reserva")).toHaveTextContent(RESERVA);
    expect(screen.getByTestId("estado-pago")).toHaveTextContent(/aprobado/i);
  });

  it("AC2: tras un intento rechazado y otro aprobado, al actualizar veo el más reciente", async () => {
    fetchMock
      .mockResolvedValueOnce(json(pago({ estado: "RECHAZADO", motivo: "Sin fondos" })))
      .mockResolvedValueOnce(json(pago({ estado: "APROBADO" })));
    const user = userEvent.setup();
    render(<EstadoPago reservaId={RESERVA} />);
    expect(await screen.findByTestId("estado-pago")).toHaveTextContent(/rechazado/i);

    await user.click(screen.getByRole("button", { name: /Actualizar estado/ }));

    await screen.findByText(/aprobado/i);
    expect(screen.getByTestId("estado-pago")).toHaveTextContent(/aprobado/i);
    expect(screen.queryByTestId("pago-motivo")).not.toBeInTheDocument();
  });

  it("AC3: si mi reserva aún no tiene pagos, se avisa que aún no hay pago registrado", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 404, codigo: "PAGO_NO_REGISTRADO" }, 404));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("mensaje-sin-pago")).toHaveTextContent(
      "Aún no hay un pago registrado para esta reserva",
    );
    expect(screen.queryByTestId("detalle-pago")).not.toBeInTheDocument();
  });

  it("AC4: si la reserva es de otro arrendatario no se muestra ningún pago y se avisa que la reserva no está disponible", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 404, message: "La reserva no existe." }, 404));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("reserva-no-disponible")).toHaveTextContent(
      "Reserva no disponible",
    );
    expect(screen.queryByTestId("detalle-pago")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mensaje-sin-pago")).not.toBeInTheDocument();
  });

  describe("casos negativos", () => {
    it("NEG1: un pago rechazado muestra el motivo y no se presenta como aprobado", async () => {
      fetchMock.mockResolvedValue(json(pago({ estado: "RECHAZADO", motivo: "Sin fondos" })));

      render(<EstadoPago reservaId={RESERVA} />);

      expect(await screen.findByTestId("pago-motivo")).toHaveTextContent("Sin fondos");
      expect(screen.getByTestId("estado-pago")).not.toHaveTextContent(/aprobado/i);
    });

    it("NEG2: un error del servidor muestra un error, no una pantalla en blanco ni «sin pago»", async () => {
      fetchMock.mockResolvedValue(json({ statusCode: 500 }, 500));

      render(<EstadoPago reservaId={RESERVA} />);

      expect(await screen.findByTestId("error-pago")).toBeInTheDocument();
      expect(screen.queryByTestId("mensaje-sin-pago")).not.toBeInTheDocument();
    });

    it("NEG3: no muestra datos de tarjeta", async () => {
      fetchMock.mockResolvedValue(json(pago()));

      render(<EstadoPago reservaId={RESERVA} />);

      const detalle = await screen.findByTestId("detalle-pago");
      expect(detalle).not.toHaveTextContent(/4242|tarjeta|cvv/i);
    });
  });
});
