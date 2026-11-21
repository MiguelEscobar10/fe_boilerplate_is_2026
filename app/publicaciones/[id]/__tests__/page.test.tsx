import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicacionPage from "../page";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion, type Publicacion } from "@/lib/publicaciones/api";

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/publicaciones/api", () => ({ obtenerPublicacion: vi.fn() }));

const ID = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const DUENO = "11111111-1111-4111-8111-111111111111";

const publicacion = (cambios: Partial<Publicacion> = {}): Publicacion => ({
  id: ID,
  tipo: "EQUIPO",
  nombre: "Proyector",
  activo: true,
  arrendadorId: DUENO,
  descripcion: "Con cables",
  ubicacion: "San Salvador",
  tarifaMonto: "20.00",
  tarifaUnidad: "DIA",
  depositoMonto: "10.00",
  condiciones: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  imagenes: [],
  requiereVerificacion: false,
  ...cambios,
});

const usuario = (rol: "ARRENDADOR" | "ARRENDATARIO", id = "otro") => ({
  id,
  email: "a@a.a",
  rol,
  nombre: null,
  telefono: null,
});

/** La página es un Server Component async: se resuelve y se renderiza su árbol. */
async function renderPagina() {
  render(
    await PublicacionPage({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    } as Parameters<typeof PublicacionPage>[0]),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
});

describe("/publicaciones/[id] — verificación requerida (FE-19.1)", () => {
  it("si la publicación exige verificación, el arrendatario ve la insignia antes de reservar", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: true }));
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDATARIO"));

    await renderPagina();

    expect(screen.getByText("Requiere verificación de identidad")).toBeInTheDocument();
  });

  it("si no la exige, no aparece la insignia", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion());
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDATARIO"));

    await renderPagina();

    expect(screen.queryByText("Requiere verificación de identidad")).not.toBeInTheDocument();
  });

  it("el dueño ve el interruptor con el valor guardado", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: true }));
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDADOR", DUENO));

    await renderPagina();

    const interruptor = screen.getByRole("switch", {
      name: "Requiere verificación de identidad",
    });
    expect(interruptor).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("heading", { name: "Gestión de la publicación" })).toBeInTheDocument();
  });

  it("el interruptor arranca apagado cuando la publicación no la exige", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion());
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDADOR", DUENO));

    await renderPagina();

    expect(
      screen.getByRole("switch", { name: "Requiere verificación de identidad" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("un arrendador que no es el dueño no ve el interruptor", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: true }));
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDADOR"));

    await renderPagina();

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("Requiere verificación de identidad")).toBeInTheDocument();
  });

  it("un arrendatario no ve el interruptor", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion());
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDATARIO"));

    await renderPagina();

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
