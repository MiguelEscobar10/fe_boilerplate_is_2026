// Plan de pruebas de H10 (MP4-28). Los números de criterio son los del plan
// de pruebas. En la UI se prueba que la bandeja muestra los avisos que manda
// el backend (AC1, AC5, AC6), la notificación ajena (AC4) y el contador (AC8).
// Qué avisos se generan y para quién lo decide el backend (BE-10.2).
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVALO_CONTEO_MS, IconoNotificaciones } from "../icono-notificaciones";
import { bandeja, crearNotificacion, errorDeRed, json, simularApi } from "./utilidades";
import type { Notificacion } from "@/lib/notificaciones/tipos";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

// Solo se simula el intervalo de 30 s: findBy/waitFor y user-event siguen
// usando el setTimeout real.
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

async function abrirBandeja() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^Notificaciones/ }));
  return user;
}

function itemDe(titulo: string) {
  const li = screen.getByText(titulo).closest("li");
  if (!li) throw new Error(`No hay item para «${titulo}»`);
  return li;
}

/** Abre la bandeja con un solo aviso y comprueba título, mensaje y estado. */
async function verAviso(aviso: Notificacion, modulo: string) {
  simularApi({ conteo: conteos(1), lista: () => json(bandeja([aviso])) });
  render(<IconoNotificaciones />);
  await abrirBandeja();

  await screen.findByText(aviso.titulo);
  const item = itemDe(aviso.titulo);
  expect(within(item).getByText(aviso.mensaje)).toBeInTheDocument();
  expect(within(item).getByText(modulo)).toBeInTheDocument();
  expect(within(item).getByText("Pendiente")).toBeInTheDocument();
  expect(item.querySelector("time")).toHaveAttribute("datetime", aviso.creadaAt);
}

describe("H10. Consultar notificaciones de mi alquiler", () => {
  it("AC1: el arrendatario ve en la bandeja el aviso con la decisión sobre su solicitud", async () => {
    await verAviso(
      crearNotificacion({
        moduloOrigen: "RESERVAS",
        titulo: "Reserva CONFIRMADA",
        mensaje: "Tu reserva de «Proyector» fue confirmada.",
      }),
      "Reservas",
    );
  });

  it("AC4: una notificación ajena (404 al marcarla) no se marca y sale de la lista", async () => {
    const ajena = crearNotificacion({ titulo: "Aviso ajeno" });
    const propia = crearNotificacion({ titulo: "Aviso propio" });
    const api = simularApi({
      conteo: conteos(2, 1),
      lista: () => json(bandeja([ajena, propia])),
      marcar: () => json({ statusCode: 404, message: "La notificación no existe." }, 404),
    });
    render(<IconoNotificaciones />);
    const user = await abrirBandeja();
    await screen.findByText("Aviso ajeno");

    await user.click(within(itemDe("Aviso ajeno")).getByRole("button", { name: "Marcar como leída" }));

    expect(
      await screen.findByText("Esa notificación ya no está disponible y se quitó de la lista."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aviso ajeno")).not.toBeInTheDocument();
    expect(itemDe("Aviso propio")).toHaveAttribute("data-estado", "pendiente");
    expect(api.llamadasMarcar(ajena.id)).toBe(1);
  });

  it("AC4: tras el 404 vuelve a pedir el conteo y no cuenta la notificación ajena", async () => {
    const api = simularApi({
      conteo: conteos(2, 1),
      lista: () => json(bandeja([crearNotificacion({ titulo: "Aviso ajeno" })])),
      marcar: () => json({ statusCode: 404, message: "La notificación no existe." }, 404),
    });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("2");
    const user = await abrirBandeja();
    await screen.findByText("Aviso ajeno");

    await user.click(within(itemDe("Aviso ajeno")).getByRole("button", { name: "Marcar como leída" }));

    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("1");
    expect(api.llamadasConteo()).toBe(2);
  });

  it("AC5: el arrendador ve el aviso de solicitud nueva", async () => {
    await verAviso(
      crearNotificacion({
        moduloOrigen: "RESERVAS",
        titulo: "Solicitud nueva",
        mensaje: "Recibiste una solicitud para «Carpa» del 25/11 al 26/11.",
      }),
      "Reservas",
    );
  });

  it("AC6: el arrendador ve el aviso de pago confirmado", async () => {
    await verAviso(
      crearNotificacion({
        moduloOrigen: "PAGOS_GARANTIA",
        titulo: "Pago confirmado",
        mensaje: "Se pagó la reserva de «Proyector» por $50.05.",
      }),
      "Pagos y garantía",
    );
  });

  it("AC8: muestra el contador de no leídas y lo actualiza solo cada 30 segundos", async () => {
    const api = simularApi({ conteo: conteos(3, 5) });
    render(<IconoNotificaciones />);

    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeInTheDocument();

    await avanzar(INTERVALO_CONTEO_MS - 1);
    expect(api.llamadasConteo()).toBe(1);

    await avanzar(1);
    expect(api.llamadasConteo()).toBe(2);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("5");
  });

  it("AC8: el botón Actualizar pide el conteo al momento y reinicia los 30 segundos", async () => {
    const api = simularApi({ conteo: conteos(2, 7), lista: () => json(bandeja([])) });
    render(<IconoNotificaciones />);
    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("2");

    await avanzar(20_000);
    const user = await abrirBandeja();
    await screen.findByText("No tienes notificaciones.");
    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(await screen.findByTestId("contador-no-leidas")).toHaveTextContent("7");
    expect(api.llamadasConteo()).toBe(2);

    // Sin reinicio, el siguiente tick habría llegado 10 s después.
    await avanzar(INTERVALO_CONTEO_MS - 1);
    expect(api.llamadasConteo()).toBe(2);
    await avanzar(1);
    expect(api.llamadasConteo()).toBe(3);
  });

  it("AC8: al salir de la pantalla se detiene el temporizador", async () => {
    const api = simularApi({ conteo: conteos(1) });
    const { unmount } = render(<IconoNotificaciones />);
    await screen.findByTestId("contador-no-leidas");

    unmount();
    await avanzar(INTERVALO_CONTEO_MS * 3);

    expect(api.llamadasConteo()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Negativo: si falla la red en un tick, el contador conserva el último valor", async () => {
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

  it("Negativo: sin notificaciones no hay contador y la bandeja dice «No tienes notificaciones»", async () => {
    simularApi({ conteo: conteos(0), lista: () => json(bandeja([])) });
    render(<IconoNotificaciones />);
    await abrirBandeja();

    expect(await screen.findByText("No tienes notificaciones.")).toBeInTheDocument();
    expect(screen.queryByTestId("contador-no-leidas")).not.toBeInTheDocument();
  });
});
