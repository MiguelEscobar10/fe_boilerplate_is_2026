import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ESTADOS } from "@/lib/solicitudes/tipos";
import { EstadoReserva } from "../estado-reserva";
import { ResumenReserva } from "../resumen-reserva";

describe("EstadoReserva", () => {
  it("una solicitud PENDIENTE nunca se presenta como confirmada", () => {
    render(<EstadoReserva estado="PENDIENTE" numero="abc" />);

    expect(screen.getByText("PENDIENTE")).toBeInTheDocument();
    expect(screen.getByText(/no es una reserva confirmada/i)).toBeInTheDocument();
    expect(screen.queryByText("CONFIRMADA")).not.toBeInTheDocument();
  });

  it("muestra el número de la solicitud", () => {
    render(<EstadoReserva estado="CONFIRMADA" numero="91b7a5c3" />);

    expect(screen.getByText("91b7a5c3")).toBeInTheDocument();
  });

  it("tiene explicación para todos los estados", () => {
    for (const estado of ESTADOS) {
      const { container, unmount } = render(<EstadoReserva estado={estado} />);
      expect(container.querySelector("p")?.textContent?.length).toBeGreaterThan(10);
      unmount();
    }
  });
});

describe("ResumenReserva", () => {
  it("muestra el período en hora local, el costo y el depósito aparte", () => {
    render(
      <ResumenReserva
        inicio="2026-11-12T09:00:00-06:00"
        fin="2026-11-12T12:00:00-06:00"
        costo="45.00"
        deposito="20.00"
      />,
    );

    expect(screen.getByTestId("periodo")).toHaveTextContent("12 nov 2026, 09:00 – 12:00");
    expect(screen.getByTestId("costo")).toHaveTextContent("$45.00");
    expect(screen.getByTestId("deposito")).toHaveTextContent("$20.00");
    expect(screen.getByText("Costo del alquiler")).toBeInTheDocument();
  });

  it("antes de enviar el costo es una estimación y explica cómo se calculó", () => {
    render(
      <ResumenReserva
        estimado
        detalle="3 horas × $15.00"
        inicio="2026-11-12T09:00:00-06:00"
        fin="2026-11-12T12:00:00-06:00"
        costo="45.00"
        deposito="20.00"
      />,
    );

    expect(screen.getByText("Costo estimado")).toBeInTheDocument();
    expect(screen.getByText("3 horas × $15.00")).toBeInTheDocument();
  });
});
