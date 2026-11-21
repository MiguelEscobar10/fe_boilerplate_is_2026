import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormularioSolicitud } from "@/components/reservas/formulario-solicitud";
import { BloqueCondiciones } from "../bloque-condiciones";
import { DetallePublicacionCompleto } from "../detalle-publicacion-completo";
import { PromedioCalificacion } from "../promedio-calificacion";

// La página importa el tipo desde un módulo "server-only".
vi.mock("server-only", () => ({}));
vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ID = "7c1e0f3a-2b4d-4c6e-8f90-a1b2c3d4e5f6";

const publicacion = (cambios = {}) => ({
  id: ID,
  tipo: "EQUIPO" as const,
  nombre: "Taladro percutor",
  activo: true,
  arrendadorId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  descripcion: "Percutor de 800 W\ncon estuche",
  ubicacion: "San Salvador",
  tarifaMonto: "15.00",
  tarifaUnidad: "HORA" as const,
  depositoMonto: "20.00",
  condiciones: "Devolver limpio",
  createdAt: "2026-11-01T00:00:00.000Z",
  imagenes: [
    { orden: 0, url: "/x/0" },
    { orden: 1, url: "/x/1" },
    { orden: 2, url: "/x/2" },
  ],
  promedioBien: 4.5,
  promedioArrendador: 4.8,
  totalCalificaciones: 6,
  requiereVerificacion: false,
  ...cambios,
});

describe("DetallePublicacionCompleto", () => {
  it("muestra fotos, descripción, ubicación, tarifa con unidad, depósito, condiciones y promedios", () => {
    render(<DetallePublicacionCompleto publicacion={publicacion()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Taladro percutor" })).toBeInTheDocument();
    expect(screen.getByText("Equipo")).toBeInTheDocument();
    expect(screen.getByText("San Salvador")).toBeInTheDocument();
    expect(screen.getByText(/Percutor de 800 W/)).toBeInTheDocument();
    expect(screen.getByText("$15.00 por hora")).toBeInTheDocument();
    expect(screen.getByText("Depósito de garantía").nextElementSibling).toHaveTextContent("$20.00");

    const condiciones = screen.getByRole("region", { name: "Condiciones y depósito" });
    expect(within(condiciones).getByText("Devolver limpio")).toBeInTheDocument();
    expect(condiciones).toHaveTextContent("Depósito de garantía: $20.00");

    const calificaciones = screen.getByLabelText("Calificaciones");
    expect(within(calificaciones).getByText("★ 4.5 de 5")).toBeInTheDocument();
    expect(within(calificaciones).getByText("(6 calificaciones)")).toBeInTheDocument();
    expect(within(calificaciones).getByText("★ 4.8 de 5")).toBeInTheDocument();

    expect(screen.getByRole("img", { name: "Taladro percutor, foto 1 de 3" })).toHaveAttribute(
      "src",
      `/publicaciones/${ID}/imagenes/0`,
    );
  });

  it("la galería cambia la foto grande al elegir una miniatura", async () => {
    const user = userEvent.setup();
    render(<DetallePublicacionCompleto publicacion={publicacion()} />);

    await user.click(screen.getByRole("button", { name: "Ver la foto 3" }));

    expect(screen.getByRole("img", { name: "Taladro percutor, foto 3 de 3" })).toHaveAttribute(
      "src",
      `/publicaciones/${ID}/imagenes/2`,
    );
    expect(screen.getByRole("button", { name: "Ver la foto 3" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("con una sola foto no hay miniaturas y sin fotos lo dice", () => {
    const { rerender } = render(
      <DetallePublicacionCompleto publicacion={publicacion({ imagenes: [{ orden: 0, url: "/x" }] })} />,
    );
    expect(screen.queryByRole("button", { name: /Ver la foto/ })).not.toBeInTheDocument();

    rerender(<DetallePublicacionCompleto publicacion={publicacion({ imagenes: [] })} />);
    expect(screen.getByText("Sin fotografías")).toBeInTheDocument();
  });

  it("sin calificaciones muestra «Sin calificaciones»", () => {
    render(
      <DetallePublicacionCompleto
        publicacion={publicacion({
          promedioBien: null,
          promedioArrendador: null,
          totalCalificaciones: 0,
        })}
      />,
    );

    expect(screen.getByLabelText("Calificaciones")).toHaveTextContent("Sin calificaciones");
    expect(screen.queryByText(/de 5/)).not.toBeInTheDocument();
  });

  it("sin descripción, sin condiciones y sin depósito lo dice en vez de dejar huecos", () => {
    render(
      <DetallePublicacionCompleto
        publicacion={publicacion({ descripcion: null, condiciones: null, depositoMonto: "0.00" })}
      />,
    );

    expect(screen.getByText("Sin descripción.")).toBeInTheDocument();
    expect(screen.getByText("El arrendador no indicó condiciones especiales.")).toBeInTheDocument();
    expect(screen.getByText("No pide depósito")).toBeInTheDocument();
  });
});

describe("PromedioCalificacion", () => {
  it("el arrendador puede tener promedio aunque esta publicación no tenga calificaciones", () => {
    render(<PromedioCalificacion promedioBien={null} promedioArrendador={4.25} total={0} />);

    const bloque = screen.getByLabelText("Calificaciones");
    expect(within(bloque).getByText("Calificación del bien").nextElementSibling).toHaveTextContent(
      "Sin calificaciones",
    );
    expect(within(bloque).getByText("★ 4.3 de 5")).toBeInTheDocument();
  });

  it("con una sola calificación usa el singular y muestra un decimal", () => {
    render(<PromedioCalificacion promedioBien={5} promedioArrendador={5} total={1} />);

    expect(screen.getAllByText("★ 5.0 de 5")).toHaveLength(2);
    expect(screen.getByText("(1 calificación)")).toBeInTheDocument();
  });

  it("si el backend todavía no manda los promedios, muestra «Sin calificaciones»", () => {
    render(<PromedioCalificacion />);

    expect(screen.getByText("Sin calificaciones")).toBeInTheDocument();
  });
});

describe("BloqueCondiciones en el formulario de solicitud", () => {
  it("muestra las condiciones y el depósito antes del botón de enviar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (entrada: RequestInfo | URL) => {
        const url = new URL(String(entrada), "http://localhost");
        return new Response(
          JSON.stringify({
            publicacionId: ID,
            desde: url.searchParams.get("desde"),
            hasta: url.searchParams.get("hasta"),
            ocupados: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    render(
      <FormularioSolicitud
        publicacionId={ID}
        tarifaMonto="15.00"
        tarifaUnidad="HORA"
        depositoMonto="20.00"
        condiciones="Devolver limpio"
      />,
    );

    const condiciones = await screen.findByRole("region", { name: "Condiciones y depósito" });
    expect(condiciones).toHaveTextContent("Devolver limpio");
    expect(condiciones).toHaveTextContent("Depósito de garantía: $20.00");
    const boton = screen.getByRole("button", { name: "Solicitar reserva" });
    // El bloque está antes del botón en el formulario.
    expect(
      condiciones.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(boton.closest("form")).toContainElement(condiciones);
  });

  it("sin condiciones y sin depósito también lo deja dicho", () => {
    render(<BloqueCondiciones condiciones={null} depositoMonto="0" />);

    expect(screen.getByText("El arrendador no indicó condiciones especiales.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Condiciones y depósito" })).toHaveTextContent(
      "Depósito de garantía: no pide depósito",
    );
  });
});
