import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnlacesReserva } from "../enlaces-reserva";

describe("EnlacesReserva", () => {
  it("enlaza la entrega y la conversación de una reserva confirmada", () => {
    render(<EnlacesReserva reservaId="r1" estado="CONFIRMADA" />);
    expect(screen.getByRole("link", { name: "Entrega" })).toHaveAttribute(
      "href",
      "/reservas/r1/entrega",
    );
    expect(screen.getByRole("link", { name: "Conversación" })).toHaveAttribute(
      "href",
      "/reservas/r1/conversacion",
    );
  });

  it.each(["PENDIENTE", "RECHAZADA", "CANCELADA"] as const)(
    "no muestra nada si está %s",
    (estado) => {
      const { container } = render(
        <EnlacesReserva reservaId="r1" estado={estado} />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );
});
