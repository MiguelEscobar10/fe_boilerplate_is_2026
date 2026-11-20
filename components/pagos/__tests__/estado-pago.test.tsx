import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EstadoPago } from "../estado-pago";
import { irALogin } from "@/lib/notificaciones/navegacion";
import type { UltimoPago } from "@/lib/pagos/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pago(datos: Partial<UltimoPago> = {}): UltimoPago {
  return {
    pagoId: "8c0d9a3e-1f2b-4c5d-9e8f-7a6b5c4d3e2f",
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

describe("EstadoPago", () => {
  it("muestra cargando y después los datos del JSON", async () => {
    fetchMock.mockResolvedValue(json(pago()));

    render(<EstadoPago reservaId={RESERVA} />);
    expect(screen.getByTestId("pago-cargando")).toBeInTheDocument();

    expect(await screen.findByTestId("estado-pago")).toHaveTextContent("Aprobado");
    expect(screen.getByTestId("pago-reserva")).toHaveTextContent(RESERVA);
    expect(screen.getByTestId("pago-importe")).toHaveTextContent("$65.00");
    // 16:00 UTC = 10:00 en El Salvador.
    expect(screen.getByTestId("pago-fecha")).toHaveTextContent("12 nov 2026, 10:00");
    expect(screen.queryByTestId("pago-motivo")).not.toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe(`/api/reservas/${RESERVA}/pagos/ultimo`);
  });

  it("un pago rechazado muestra el motivo", async () => {
    fetchMock.mockResolvedValue(json(pago({ estado: "RECHAZADO", motivo: "Sin fondos" })));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("estado-pago")).toHaveTextContent("Rechazado");
    expect(screen.getByTestId("pago-motivo")).toHaveTextContent("Sin fondos");
  });

  it("404 con PAGO_NO_REGISTRADO muestra el mensaje de sin pago", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 404, codigo: "PAGO_NO_REGISTRADO" }, 404));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("mensaje-sin-pago")).toHaveTextContent(
      "Aún no hay un pago registrado para esta reserva",
    );
    expect(screen.queryByTestId("detalle-pago")).not.toBeInTheDocument();
  });

  it("cualquier otro 404 muestra «Reserva no disponible»", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 404, message: "La reserva no existe." }, 404));

    render(<EstadoPago reservaId={RESERVA} />);

    expect(await screen.findByTestId("reserva-no-disponible")).toHaveTextContent(
      "Reserva no disponible",
    );
    expect(screen.queryByTestId("mensaje-sin-pago")).not.toBeInTheDocument();
  });

  it("un error del servidor o de red muestra un error, no una pantalla en blanco", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 500 }, 500));
    const { unmount } = render(<EstadoPago reservaId={RESERVA} />);
    expect(await screen.findByTestId("error-pago")).toBeInTheDocument();
    unmount();

    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    render(<EstadoPago reservaId={RESERVA} />);
    expect(await screen.findByTestId("error-pago")).toBeInTheDocument();
  });

  it("«Actualizar estado» vuelve a consultar y refleja el intento más reciente", async () => {
    fetchMock
      .mockResolvedValueOnce(json(pago({ estado: "RECHAZADO", motivo: "Sin fondos" })))
      .mockResolvedValueOnce(json(pago({ estado: "APROBADO" })));
    const user = userEvent.setup();

    render(<EstadoPago reservaId={RESERVA} />);
    expect(await screen.findByTestId("estado-pago")).toHaveTextContent("Rechazado");

    await user.click(screen.getByRole("button", { name: "Actualizar estado" }));

    await waitFor(() => expect(screen.getByTestId("estado-pago")).toHaveTextContent("Aprobado"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("pago-motivo")).not.toBeInTheDocument();
  });

  it("deshabilita el botón mientras consulta", async () => {
    let responder: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (responder = r)));

    render(<EstadoPago reservaId={RESERVA} />);
    expect(screen.getByRole("button", { name: "Actualizar estado" })).toBeDisabled();

    responder(json(pago()));
    await screen.findByTestId("estado-pago");
    expect(screen.getByRole("button", { name: "Actualizar estado" })).toBeEnabled();
  });

  it("401 lleva al login", async () => {
    fetchMock.mockResolvedValue(json({ statusCode: 401 }, 401));

    render(<EstadoPago reservaId={RESERVA} />);

    await waitFor(() => expect(irALogin).toHaveBeenCalled());
  });
});
