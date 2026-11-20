import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AvisoVerificacionRequerida } from "../aviso-verificacion-requerida";
import { InsigneVerificacionRequerida } from "../insigne-verificacion-requerida";
import { InterruptorRequiereVerificacion } from "../interruptor-requiere-verificacion";
import { ErrorDeApi } from "@/lib/verificacion/cliente";
import {
  esErrorVerificacionRequerida,
  esVerificacionRequerida,
} from "@/lib/verificacion/requisito";
import { errorDeRed, json } from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const PUBLICACION = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const MENSAJE =
  "Esta publicación solo acepta usuarios verificados. Envía tu documento de identidad para verificarte.";

function simularPatch(responder: (body: { requiereVerificacion: boolean }) => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    if (init?.method === "PATCH" && url.pathname === `/api/publicaciones/${PUBLICACION}/requiere-verificacion`) {
      return responder(JSON.parse(String(init.body)));
    }
    throw new Error(`Llamada no esperada: ${init?.method} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function interruptor() {
  return screen.getByRole("switch", { name: "Requiere verificación de identidad" });
}

describe("InterruptorRequiereVerificacion (arrendador)", () => {
  it("el dueño la activa y ve el cambio guardado", async () => {
    const fetchMock = simularPatch((b) => json({ id: PUBLICACION, requiereVerificacion: b.requiereVerificacion }));
    render(<InterruptorRequiereVerificacion publicacionId={PUBLICACION} valorInicial={false} />);
    const user = userEvent.setup();
    expect(interruptor()).toHaveAttribute("aria-checked", "false");

    await user.click(interruptor());

    expect(await screen.findByText(/Guardado: solo arrendatarios verificados/)).toBeInTheDocument();
    expect(interruptor()).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ requiereVerificacion: true });
  });

  it("la desactiva", async () => {
    simularPatch((b) => json({ id: PUBLICACION, requiereVerificacion: b.requiereVerificacion }));
    render(<InterruptorRequiereVerificacion publicacionId={PUBLICACION} valorInicial />);
    const user = userEvent.setup();

    await user.click(interruptor());

    expect(await screen.findByText(/cualquier arrendatario podrá/)).toBeInTheDocument();
    expect(interruptor()).toHaveAttribute("aria-checked", "false");
  });

  it("se desactiva mientras guarda: un segundo clic no envía otro PATCH", async () => {
    let responder: (r: Response) => void = () => {};
    const fetchMock = simularPatch(() => new Promise<Response>((r) => (responder = r)));
    render(<InterruptorRequiereVerificacion publicacionId={PUBLICACION} valorInicial={false} />);
    const user = userEvent.setup();

    await user.click(interruptor());
    expect(interruptor()).toBeDisabled();
    expect(screen.getByText("Guardando...")).toBeInTheDocument();
    await user.click(interruptor());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    responder(json({ id: PUBLICACION, requiereVerificacion: true }));
    await waitFor(() => expect(interruptor()).toBeEnabled());
  });

  it("muestra 403 como acceso restringido y conserva el valor guardado", async () => {
    simularPatch(() => json({ message: "Solo el dueño" }, 403));
    render(<InterruptorRequiereVerificacion publicacionId={PUBLICACION} valorInicial={false} />);
    const user = userEvent.setup();

    await user.click(interruptor());

    expect(await screen.findByRole("alert")).toHaveTextContent("Acceso restringido");
    expect(interruptor()).toHaveAttribute("aria-checked", "false");
  });

  it("sin conexión avisa y conserva el valor", async () => {
    simularPatch(() => errorDeRed());
    render(<InterruptorRequiereVerificacion publicacionId={PUBLICACION} valorInicial />);
    const user = userEvent.setup();

    await user.click(interruptor());

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisa tu conexión");
    expect(interruptor()).toHaveAttribute("aria-checked", "true");
  });
});

describe("InsigneVerificacionRequerida (detalle)", () => {
  it("se muestra si la publicación exige verificación", () => {
    render(<InsigneVerificacionRequerida requiereVerificacion />);
    expect(screen.getByText("Requiere verificación de identidad")).toBeInTheDocument();
  });

  it("no muestra nada si no la exige", () => {
    const { container } = render(<InsigneVerificacionRequerida requiereVerificacion={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AvisoVerificacionRequerida (solicitud de reserva)", () => {
  it("muestra el motivo del backend y el enlace a la verificación", () => {
    render(<AvisoVerificacionRequerida mensaje={MENSAJE} />);

    expect(screen.getByRole("alert")).toHaveTextContent(MENSAJE);
    expect(screen.getByRole("link", { name: "Verificar mi identidad" })).toHaveAttribute("href", "/verificacion");
  });
});

describe("detección del 422 VERIFICACION_REQUERIDA", () => {
  const cuerpo = { statusCode: 422, error: "Unprocessable Entity", codigo: "VERIFICACION_REQUERIDA", message: MENSAJE };

  it("reconoce el cuerpo del backend", () => {
    expect(esVerificacionRequerida(422, cuerpo)).toBe(true);
  });

  it.each([
    ["otro status", 409, cuerpo],
    ["otro código", 422, { ...cuerpo, codigo: "OTRO" }],
    ["sin código", 422, { statusCode: 422, message: "x" }],
    ["cuerpo vacío", 422, null],
  ])("no confunde %s", (_, status, body) => {
    expect(esVerificacionRequerida(status, body)).toBe(false);
  });

  it("reconoce un ErrorDeApi con ese código", () => {
    expect(esErrorVerificacionRequerida(new ErrorDeApi(422, MENSAJE, "VERIFICACION_REQUERIDA"))).toBe(true);
    expect(esErrorVerificacionRequerida(new ErrorDeApi(422, MENSAJE))).toBe(false);
    expect(esErrorVerificacionRequerida(new Error("x"))).toBe(false);
  });
});
