import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColaRevision } from "../cola-revision";
import { PanelVerificacion } from "../panel-verificacion";
import { archivo, crearSolicitud, crearVerificacion, json, simularApi } from "./utilidades";

/**
 * Plan de pruebas, H07. Solicitar verificación de identidad: pruebas de
 * componente de la interfaz. Un `it('ACn: ...')` por criterio y, al final,
 * los casos negativos.
 */

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const ENVIAR = { name: "Enviar documento" };

async function elegir(file: File) {
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(await screen.findByLabelText("Documento de identidad"), file);
  return user;
}

describe("H07. Solicitar verificación de identidad (interfaz)", () => {
  it("AC1: sin verificación APROBADA, cargo un PDF admitido y la solicitud queda En revisión (PENDIENTE)", async () => {
    let enviado = false;
    const api = simularApi({
      ultima: () => (enviado ? json(crearVerificacion()) : json({ message: "No" }, 404)),
      enviar: (datos) => {
        expect((datos.get("documento") as File).name).toBe("dui.pdf");
        enviado = true;
        return json({ id: "v-1", estado: "PENDIENTE" }, 201);
      },
    });
    render(<PanelVerificacion />);
    const user = await elegir(archivo("dui.pdf", "application/pdf", 1024 * 1024));

    await user.click(screen.getByRole("button", ENVIAR));

    expect(await screen.findByText("En revisión")).toBeInTheDocument();
    expect(screen.getByText("Documento enviado. Quedó en revisión.")).toBeInTheDocument();
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(1);
  });

  it("AC2: el REVISOR decide y el arrendatario ve si quedó APROBADA o RECHAZADA", async () => {
    const solicitud = crearSolicitud({ usuario: { id: "u", email: "ana@t.l", nombre: "Ana" } });
    const decisiones: unknown[] = [];
    simularApi({
      cola: () => json([solicitud]),
      decidir: (id, body) => {
        decisiones.push(body);
        return json({ id, estado: "APROBADA" });
      },
    });
    const revisor = render(<ColaRevision />);
    const user = userEvent.setup();
    await screen.findByText("Ana");

    await user.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText("Aprobaste la verificación de Ana.")).toBeInTheDocument();
    expect(decisiones).toEqual([{ decision: "APROBAR" }]);
    revisor.unmount();

    for (const [estado, texto] of [
      ["APROBADA", "Identidad verificada"],
      ["RECHAZADA", "Verificación rechazada"],
    ] as const) {
      simularApi({ ultima: () => json(crearVerificacion({ estado })) });
      const vista = render(<PanelVerificacion />);
      expect(await screen.findByText(texto)).toBeInTheDocument();
      vista.unmount();
    }
  });

  it("AC3: con una solicitud RECHAZADA veo el motivo registrado", async () => {
    simularApi({
      ultima: () =>
        json(
          crearVerificacion({
            estado: "RECHAZADA",
            motivoRechazo: "Documento ilegible",
            revisadaAt: "2026-11-16T09:00:00.000Z",
          }),
        ),
    });

    render(<PanelVerificacion />);

    expect(await screen.findByText("Verificación rechazada")).toBeInTheDocument();
    expect(screen.getByText("Documento ilegible")).toBeInTheDocument();
  });

  it("AC4: quien no es REVISOR no ve la cola ni ningún enlace al documento (403)", async () => {
    simularApi({ cola: () => json({ message: "Prohibido" }, 403) });

    render(<ColaRevision />);

    expect(await screen.findByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver documento/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });

  it("AC5: con otra solicitud PENDIENTE, el 409 se explica y no queda registrada otra", async () => {
    const api = simularApi({
      enviar: () => json({ message: "Ya tenés una solicitud PENDIENTE" }, 409),
    });
    render(<PanelVerificacion />);
    const user = await elegir(archivo());

    await user.click(screen.getByRole("button", ENVIAR));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ya tienes una solicitud en revisión");
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(1);
    expect(screen.queryByText("Documento enviado. Quedó en revisión.")).not.toBeInTheDocument();
  });

  it.each([
    ["un formato no admitido (.docx)", archivo("dui.docx", "application/msword"), "JPG, PNG o PDF"],
    ["un archivo de más de 5 MB", archivo("dui.pdf", "application/pdf", 5 * 1024 * 1024 + 1), "5 MB"],
  ])("AC6: %s no se envía y se indica qué corregir", async (_, file, mensaje) => {
    const api = simularApi({});
    render(<PanelVerificacion />);
    const user = await elegir(file);

    await user.click(screen.getByRole("button", ENVIAR));

    expect(screen.getByRole("alert")).toHaveTextContent(mensaje);
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(0);
  });

  it("AC7: a una cuenta de arrendador no se le pide verificación: la pantalla es solo para arrendatarios", async () => {
    simularApi({ ultima: () => json({ message: "Prohibido" }, 403) });

    render(<PanelVerificacion />);

    expect(await screen.findByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.queryByLabelText("Documento de identidad")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", ENVIAR)).not.toBeInTheDocument();
  });

  describe("casos negativos", () => {
    it("NEG1: sin elegir archivo no se envía nada", async () => {
      const api = simularApi({});
      render(<PanelVerificacion />);
      const user = userEvent.setup();

      await user.click(await screen.findByRole("button", ENVIAR));

      expect(screen.getByRole("alert")).toHaveTextContent("Elige el archivo");
      expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(0);
    });

    it("NEG2: el 400 del backend (archivo disfrazado) se muestra y la cuenta sigue sin verificar", async () => {
      simularApi({ enviar: () => json({ message: 'El documento "x.pdf" no es JPG, PNG ni PDF.' }, 400) });
      render(<PanelVerificacion />);
      const user = await elegir(archivo());

      await user.click(screen.getByRole("button", ENVIAR));

      expect(await screen.findByRole("alert")).toHaveTextContent("no es JPG, PNG ni PDF");
      expect(screen.getByText("Todavía no has verificado tu identidad.")).toBeInTheDocument();
    });

    it("NEG3: el estado del arrendatario nunca muestra un enlace a su documento", async () => {
      simularApi({ ultima: () => json(crearVerificacion({ estado: "PENDIENTE" })) });

      render(<PanelVerificacion />);

      expect(await screen.findByText("En revisión")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /documento/i })).not.toBeInTheDocument();
    });
  });
});
