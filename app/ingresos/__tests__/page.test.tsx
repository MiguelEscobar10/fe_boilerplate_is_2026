import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import IngresosPage from "../page";
import { RutaProtegida } from "@/components/ruta-protegida";
import { requireUser, type Rol } from "@/lib/dal";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));

function usuario(rol: Rol) {
  return { id: "1", email: "a@a.a", rol, nombre: null, telefono: null };
}

/** Renderiza la página resolviendo RutaProtegida, que es un Server Component async. */
async function renderPagina() {
  const elemento = IngresosPage() as ReactElement<{ roles: Rol[]; children: ReactNode }>;
  render(await RutaProtegida(elemento.props));
}

describe("/ingresos", () => {
  it("un arrendatario ve «Acceso restringido» y no se consulta el reporte", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(requireUser).mockResolvedValue(usuario("ARRENDATARIO"));

    await renderPagina();

    expect(screen.getByRole("heading", { name: "Acceso restringido" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reporte de ingresos" })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un arrendador ve el panel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    vi.mocked(requireUser).mockResolvedValue(usuario("ARRENDADOR"));

    await renderPagina();

    expect(screen.getByRole("heading", { name: "Reporte de ingresos" })).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
  });
});
