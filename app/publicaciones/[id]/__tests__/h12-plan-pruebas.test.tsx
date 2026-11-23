// Plan de pruebas de H12 (MP4-38). Los números de criterio son los del plan
// de pruebas. En la UI se prueba la ficha completa (AC1), las condiciones y el
// depósito dentro del formulario de solicitud (AC2), los promedios o «Sin
// calificaciones» (AC3) y el mensaje de publicación no disponible (AC4). El
// cálculo de los promedios y el 404 de una desactivada son del backend
// (BE-12.1, test/qa/qa-12.1-detalle.e2e-spec.ts).
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicacionPage from "../page";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion, type Publicacion } from "@/lib/publicaciones/api";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/publicaciones/api", () => ({ obtenerPublicacion: vi.fn() }));
vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ID = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

const publicacion = (cambios: Partial<Publicacion> = {}): Publicacion => ({
  id: ID,
  tipo: "EQUIPO",
  nombre: "Taladro percutor",
  activo: true,
  arrendadorId: "11111111-1111-4111-8111-111111111111",
  descripcion: "Percutor de 800 W con estuche",
  ubicacion: "San Salvador",
  tarifaMonto: "15.00",
  tarifaUnidad: "HORA",
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

/** La página es un Server Component async: se resuelve y se renderiza su árbol. */
async function abrir(resultado: Publicacion | null) {
  vi.mocked(obtenerPublicacion).mockResolvedValue(resultado);
  render(
    await PublicacionPage({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    } as Parameters<typeof PublicacionPage>[0]),
  );
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: "22222222-2222-4222-8222-222222222222",
    email: "a@a.a",
    rol: "ARRENDATARIO",
    nombre: null,
    telefono: null,
  });
  // La disponibilidad del formulario de solicitud.
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
});

describe("H12. Ver el detalle completo de una publicación", () => {
  it("AC1: el detalle muestra las fotos, la descripción, la ubicación, la tarifa con su unidad, el depósito y las condiciones", async () => {
    await abrir(publicacion());

    expect(
      screen.getByRole("heading", { level: 1, name: "Taladro percutor" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Taladro percutor, foto 1 de 3" }),
    ).toHaveAttribute("src", `/publicaciones/${ID}/imagenes/0`);
    expect(screen.getAllByRole("button", { name: /Ver la foto/ })).toHaveLength(
      3,
    );
    expect(
      screen.getByText("Percutor de 800 W con estuche"),
    ).toBeInTheDocument();
    expect(screen.getByText("San Salvador")).toBeInTheDocument();
    expect(screen.getByText("$15.00 por hora")).toBeInTheDocument();
    expect(
      screen.getByText("Depósito de garantía").nextElementSibling,
    ).toHaveTextContent("$20.00");
    expect(screen.getAllByText("Devolver limpio").length).toBeGreaterThan(0);
  });

  it("AC2: el formulario de solicitud muestra las condiciones y el depósito antes del botón de enviar", async () => {
    await abrir(publicacion());

    const boton = await screen.findByRole("button", {
      name: "Solicitar reserva",
    });
    const formulario = boton.closest("form")!;
    const condiciones = within(formulario).getByRole("region", {
      name: "Condiciones y depósito",
    });
    expect(condiciones).toHaveTextContent("Devolver limpio");
    expect(condiciones).toHaveTextContent("Depósito de garantía: $20.00");
    expect(
      condiciones.compareDocumentPosition(boton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("AC3: con calificaciones muestra el promedio del bien y el del arrendador", async () => {
    await abrir(publicacion());

    const calificaciones = screen.getByLabelText("Calificaciones");
    expect(
      within(calificaciones).getByText("Calificación del bien")
        .nextElementSibling,
    ).toHaveTextContent("★ 4.5 de 5");
    expect(
      within(calificaciones).getByText("(6 calificaciones)"),
    ).toBeInTheDocument();
    expect(within(calificaciones).getByText("★ 4.8 de 5")).toBeInTheDocument();
  });

  it("AC3: sin calificaciones muestra «Sin calificaciones»", async () => {
    await abrir(
      publicacion({
        promedioBien: null,
        promedioArrendador: null,
        totalCalificaciones: 0,
      }),
    );

    expect(screen.getByLabelText("Calificaciones")).toHaveTextContent(
      "Sin calificaciones",
    );
    expect(screen.queryByText(/de 5/)).not.toBeInTheDocument();
  });

  it("AC4: una publicación desactivada no se abre: muestra «Publicación no disponible» y el enlace al catálogo", async () => {
    await abrir(null);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Publicación no disponible",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Esta publicación fue desactivada o ya no existe."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver al catálogo" }),
    ).toHaveAttribute("href", "/publicaciones");
    // No se muestra ningún dato del bien ni el formulario de solicitud.
    expect(screen.queryByText("Taladro percutor")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Solicitar reserva" }),
    ).not.toBeInTheDocument();
  });

  it("Negativo: sin descripción, sin condiciones y sin depósito lo dice en vez de dejar huecos", async () => {
    await abrir(
      publicacion({
        descripcion: null,
        condiciones: null,
        depositoMonto: "0.00",
      }),
    );

    expect(screen.getByText("Sin descripción.")).toBeInTheDocument();
    expect(
      screen.getAllByText("El arrendador no indicó condiciones especiales.")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("No pide depósito")).toBeInTheDocument();
  });
});
