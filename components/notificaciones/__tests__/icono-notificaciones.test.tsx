import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INTERVALO_CONTEO_MS,
  IconoNotificaciones,
} from "../icono-notificaciones";
import { irALogin } from "@/lib/notificaciones/navegacion";
import { bandeja, crearNotificacion, errorDeRed, json, simularApi } from "./utilidades";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

// Solo se simula el intervalo: findBy/waitFor y user-event siguen usando el
// setTimeout real.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.useRealTimers();
});

async function avanzar(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

function conteos(...valores: number[]) {
  let i = 0;
  return () => json({ noLeidas: valores[Math.min(i++, valores.length - 1)] });
}

describe("IconoNotificaciones: contador de no leídas", () => {
  it("muestra el conteo de no leídas al montarse", async () => {
    simularApi({ conteo: conteos(3) });

    render(<IconoNotificaciones />);

    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("3");
    expect(
      screen.getByRole("button", { name: "Notificaciones, 3 sin leer" }),
    ).toBeInTheDocument();
  });

  it("no muestra el contador si no hay pendientes", async () => {
    const api = simularApi({ conteo: conteos(0) });

    render(<IconoNotificaciones />);

    expect(
      await screen.findByRole("button", { name: "Notificaciones, ninguna sin leer" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("contador-no-leidas")).not.toBeInTheDocument();
    expect(api.llamadasConteo()).toBe(1);
  });

  it("vuelve a pedir el conteo cada 30 segundos", async () => {
    const api = simularApi({ conteo: conteos(3, 5, 6) });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("3");

    await avanzar(INTERVALO_CONTEO_MS - 1);
    expect(api.llamadasConteo()).toBe(1);

    await avanzar(1);
    expect(api.llamadasConteo()).toBe(2);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("5");

    await avanzar(INTERVALO_CONTEO_MS);
    expect(api.llamadasConteo()).toBe(3);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("6");
  });

  it("«Actualizar» pide el conteo al momento y reinicia el intervalo", async () => {
    const user = userEvent.setup();
    const api = simularApi({ conteo: conteos(2, 7), lista: () => json(bandeja([])) });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("2");

    await avanzar(20_000);
    await user.click(screen.getByRole("button", { name: /^Notificaciones/ }));
    await screen.findByText("No tienes notificaciones.");
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(api.llamadasConteo()).toBe(2);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("7");
    // También recarga la lista.
    expect(api.llamadasLista()).toHaveLength(2);

    // Sin el reinicio, el tick tocaba a los 10 s.
    await avanzar(INTERVALO_CONTEO_MS - 1);
    expect(api.llamadasConteo()).toBe(2);
    await avanzar(1);
    expect(api.llamadasConteo()).toBe(3);
  });

  it("detiene el temporizador al salir de la pantalla", async () => {
    const api = simularApi({ conteo: conteos(1) });
    const { unmount } = render(<IconoNotificaciones />);
    await screen.findByTestId("contador-no-leidas");

    unmount();
    await avanzar(INTERVALO_CONTEO_MS * 3);

    expect(api.llamadasConteo()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("conserva el último conteo si falla la red", async () => {
    let llamada = 0;
    const api = simularApi({
      conteo: () => (++llamada === 1 ? json({ noLeidas: 4 }) : errorDeRed()),
    });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("4");

    await avanzar(INTERVALO_CONTEO_MS);

    expect(api.llamadasConteo()).toBe(2);
    expect(screen.getByTestId("contador-no-leidas")).toHaveTextContent("4");
  });

  it("lleva a /login si la sesión expiró", async () => {
    simularApi({ conteo: () => json({ statusCode: 401, message: "La sesión expiró." }, 401) });

    render(<IconoNotificaciones />);

    await vi.waitFor(() => expect(irALogin).toHaveBeenCalledOnce());
  });

  it("abre y cierra la bandeja con el botón y con Esc", async () => {
    const user = userEvent.setup();
    simularApi({
      conteo: conteos(1),
      lista: () => json(bandeja([crearNotificacion({ titulo: "Reserva confirmada" })])),
    });
    render(<IconoNotificaciones />);
    const boton = await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" });

    await user.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("Reserva confirmada")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Reserva confirmada")).not.toBeInTheDocument();
    expect(boton).toHaveFocus();
  });
});
