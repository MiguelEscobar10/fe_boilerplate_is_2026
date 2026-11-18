import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColaRevision } from "../cola-revision";
import { crearSolicitud, errorDeRed, json, simularApi } from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

function itemDe(nombre: string) {
  const li = screen.getByText(nombre).closest("li");
  if (!li) throw new Error(`No hay item para «${nombre}»`);
  return within(li);
}

describe("ColaRevision (REVISOR)", () => {
  it("pide las PENDIENTE y las muestra con el enlace protegido al documento", async () => {
    const solicitud = crearSolicitud({
      usuario: { id: "u-1", email: "ana@test.local", nombre: "Ana López" },
    });
    const api = simularApi({ cola: () => json([solicitud]) });

    render(<ColaRevision />);

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("1 solicitud pendiente")).toBeInTheDocument();
    const enlace = screen.getByRole("link", { name: "Ver documento de Ana López" });
    expect(enlace).toHaveAttribute("href", `/api/verificaciones/${solicitud.id}/documento`);
    expect(enlace).toHaveAttribute("target", "_blank");
    const query = new URL(String(api.llamadasA("/api/verificaciones")[0][0]), "http://localhost").searchParams;
    expect(query.get("estado")).toBe("PENDIENTE");
  });

  it("muestra la cola vacía", async () => {
    simularApi({ cola: () => json([]) });
    render(<ColaRevision />);
    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeInTheDocument();
  });

  it("aprueba una solicitud y la saca de la cola", async () => {
    const solicitud = crearSolicitud({ usuario: { id: "u", email: "a@t.l", nombre: "Ana" } });
    const decisiones: unknown[] = [];
    simularApi({
      cola: () => json([solicitud]),
      decidir: (id, body) => {
        decisiones.push({ id, ...body });
        return json({ id, estado: "APROBADA" });
      },
    });
    render(<ColaRevision />);
    const user = userEvent.setup();

    await screen.findByText("Ana");

    await user.click(itemDe("Ana").getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("Aprobaste la verificación de Ana.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
    expect(decisiones).toEqual([{ id: solicitud.id, decision: "APROBAR" }]);
  });

  it("rechaza con motivo", async () => {
    const solicitud = crearSolicitud({ usuario: { id: "u", email: "b@t.l", nombre: "Beto" } });
    const decisiones: unknown[] = [];
    simularApi({
      cola: () => json([solicitud]),
      decidir: (id, body) => {
        decisiones.push(body);
        return json({ id, estado: "RECHAZADA" });
      },
    });
    render(<ColaRevision />);
    const user = userEvent.setup();
    await screen.findByText("Beto");

    await user.click(itemDe("Beto").getByRole("button", { name: "Rechazar" }));
    await user.type(screen.getByLabelText("Motivo del rechazo (opcional)"), "  Documento ilegible ");
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    expect(await screen.findByText("Rechazaste la verificación de Beto.")).toBeInTheDocument();
    expect(decisiones).toEqual([{ decision: "RECHAZAR", motivo: "Documento ilegible" }]);
  });

  it("rechaza sin motivo si no se escribe ninguno", async () => {
    const solicitud = crearSolicitud({ usuario: { id: "u", email: "c@t.l", nombre: "Carla" } });
    const decisiones: unknown[] = [];
    simularApi({
      cola: () => json([solicitud]),
      decidir: (id, body) => {
        decisiones.push(body);
        return json({ id, estado: "RECHAZADA" });
      },
    });
    render(<ColaRevision />);
    const user = userEvent.setup();
    await screen.findByText("Carla");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    expect(await screen.findByText("Rechazaste la verificación de Carla.")).toBeInTheDocument();
    expect(decisiones).toEqual([{ decision: "RECHAZAR" }]);
  });

  it("si otra persona ya la resolvió (409) lo avisa y la quita", async () => {
    const solicitud = crearSolicitud({ usuario: { id: "u", email: "d@t.l", nombre: "Dani" } });
    simularApi({
      cola: () => json([solicitud]),
      decidir: () => json({ message: "Ya fue resuelta" }, 409),
    });
    render(<ColaRevision />);
    const user = userEvent.setup();
    await screen.findByText("Dani");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("La solicitud de Dani ya fue resuelta por otra persona.")).toBeInTheDocument();
    expect(screen.queryByText("d@t.l")).not.toBeInTheDocument();
  });

  it("muestra el 400 del backend sin quitar la solicitud", async () => {
    simularApi({
      cola: () => json([crearSolicitud({ usuario: { id: "u", email: "e@t.l", nombre: "Eva" } })]),
      decidir: () => json({ message: ["motivo puede tener como máximo 500 caracteres."] }, 400),
    });
    render(<ColaRevision />);
    const user = userEvent.setup();
    await screen.findByText("Eva");

    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar rechazo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("como máximo 500");
    expect(screen.getByText("Eva")).toBeInTheDocument();
  });

  it("muestra «Acceso restringido» y ninguna acción a quien no es REVISOR (403)", async () => {
    simularApi({ cola: () => json({ message: "Prohibido" }, 403) });

    render(<ColaRevision />);

    expect(await screen.findByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("si no hay conexión permite reintentar", async () => {
    let falla = true;
    simularApi({ cola: () => (falla ? errorDeRed() : json([])) });
    render(<ColaRevision />);
    const user = userEvent.setup();

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");
    falla = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("No hay solicitudes pendientes.")).toBeInTheDocument();
  });
});
