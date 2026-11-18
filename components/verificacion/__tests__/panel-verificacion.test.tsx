import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PanelVerificacion } from "../panel-verificacion";
import { validarArchivo } from "../formulario-verificacion";
import { archivo, crearVerificacion, errorDeRed, json, simularApi } from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

async function elegir(file: File) {
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(await screen.findByLabelText("Documento de identidad"), file);
  return user;
}

describe("PanelVerificacion (arrendatario)", () => {
  it("sin solicitudes muestra que no está verificado y el formulario", async () => {
    simularApi({ ultima: () => json({ message: "No" }, 404) });

    render(<PanelVerificacion />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando tu verificación...");
    expect(await screen.findByText("Todavía no has verificado tu identidad.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar documento" })).toBeInTheDocument();
  });

  it.each([
    ["PENDIENTE", "En revisión", false],
    ["APROBADA", "Identidad verificada", false],
    ["RECHAZADA", "Verificación rechazada", true],
  ] as const)("con una %s muestra «%s»", async (estado, texto, conFormulario) => {
    simularApi({ ultima: () => json(crearVerificacion({ estado })) });

    render(<PanelVerificacion />);

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar documento" }) !== null).toBe(conFormulario);
  });

  it("muestra el motivo de una RECHAZADA", async () => {
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

    expect(await screen.findByText("Documento ilegible")).toBeInTheDocument();
    expect(screen.getByText(/Revisada el/)).toBeInTheDocument();
  });

  it("envía el documento en el campo `documento` y queda en revisión", async () => {
    let estado: "nada" | "pendiente" = "nada";
    const api = simularApi({
      ultima: () =>
        estado === "nada" ? json({ message: "No" }, 404) : json(crearVerificacion()),
      enviar: (datos) => {
        expect((datos.get("documento") as File).name).toBe("dui.pdf");
        estado = "pendiente";
        return json({ id: "v-1", estado: "PENDIENTE" }, 201);
      },
    });
    render(<PanelVerificacion />);
    const user = await elegir(archivo());

    await user.click(screen.getByRole("button", { name: "Enviar documento" }));

    expect(await screen.findByText("En revisión")).toBeInTheDocument();
    expect(screen.getByText("Documento enviado. Quedó en revisión.")).toBeInTheDocument();
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Enviar documento" })).not.toBeInTheDocument();
  });

  it("no envía nada si no se eligió archivo", async () => {
    const api = simularApi({});
    render(<PanelVerificacion />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Enviar documento" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Elige el archivo");
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(0);
  });

  it.each([
    ["un formato no admitido", archivo("dui.docx", "application/msword"), "JPG, PNG o PDF"],
    ["un archivo de más de 5 MB", archivo("dui.pdf", "application/pdf", 5 * 1024 * 1024 + 1), "5 MB"],
  ])("rechaza %s sin llamar al backend", async (_, file, mensaje) => {
    const api = simularApi({});
    render(<PanelVerificacion />);
    const user = await elegir(file);

    await user.click(screen.getByRole("button", { name: "Enviar documento" }));

    expect(screen.getByRole("alert")).toHaveTextContent(mensaje);
    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(0);
  });

  it.each([
    [409, { message: "Ya tenés una PENDIENTE" }, "Ya tienes una solicitud en revisión"],
    [400, { message: 'El documento "x.pdf" no es JPG, PNG ni PDF.' }, "no es JPG, PNG ni PDF"],
    [403, { message: "Prohibido" }, "Solo las cuentas de arrendatario"],
  ])("explica un %s del backend sin registrar otra", async (status, body, mensaje) => {
    simularApi({ enviar: () => json(body, status) });
    render(<PanelVerificacion />);
    const user = await elegir(archivo());

    await user.click(screen.getByRole("button", { name: "Enviar documento" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
    expect(screen.getByText("Todavía no has verificado tu identidad.")).toBeInTheDocument();
  });

  it("desactiva el botón mientras envía para evitar el doble envío", async () => {
    let responder: (r: Response) => void = () => {};
    const api = simularApi({ enviar: () => new Promise<Response>((r) => (responder = r)) });
    render(<PanelVerificacion />);
    const user = await elegir(archivo());

    await user.click(screen.getByRole("button", { name: "Enviar documento" }));
    const boton = screen.getByRole("button", { name: "Enviando..." });
    expect(boton).toBeDisabled();
    await user.click(boton);

    expect(api.llamadasA("/api/usuarios/me/verificaciones", "POST")).toHaveLength(1);
    responder(json({ message: "x" }, 409));
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar documento" })).toBeEnabled());
  });

  it("muestra «Acceso restringido» si la cuenta no es de arrendatario (403)", async () => {
    simularApi({ ultima: () => json({ message: "Prohibido" }, 403) });

    render(<PanelVerificacion />);

    expect(await screen.findByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.queryByLabelText("Documento de identidad")).not.toBeInTheDocument();
  });

  it("si no hay conexión permite reintentar", async () => {
    let falla = true;
    simularApi({ ultima: () => (falla ? errorDeRed() : json(crearVerificacion({ estado: "APROBADA" }))) });
    render(<PanelVerificacion />);
    const user = userEvent.setup();

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");
    falla = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Identidad verificada")).toBeInTheDocument();
  });
});

describe("validarArchivo", () => {
  it.each([
    ["dui.jpg", "image/jpeg"],
    ["dui.png", "image/png"],
    ["dui.pdf", "application/pdf"],
    ["DUI.PDF", ""],
  ])("acepta %s", (nombre, tipo) => {
    expect(validarArchivo(archivo(nombre, tipo))).toBeNull();
  });

  it("acepta exactamente 5 MB", () => {
    expect(validarArchivo(archivo("a.pdf", "application/pdf", 5 * 1024 * 1024))).toBeNull();
  });
});
