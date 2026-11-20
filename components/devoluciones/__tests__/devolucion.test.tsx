import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PantallaDevolucion } from "../pantalla-devolucion";
import { calcularResolucion } from "@/lib/devoluciones/tipos";
import type { Devolucion, Garantia } from "@/lib/devoluciones/tipos";
import { irALogin } from "@/lib/notificaciones/navegacion";

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));

const RESERVA = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const devolucion = (cambios: Partial<Devolucion> = {}): Devolucion => ({
  devolucionId: "d-1",
  reservaId: RESERVA,
  fechaReal: "2026-12-03T18:15:00.000Z",
  estadoFinal: "CON_OBSERVACIONES",
  danos: "Rayón lateral",
  ...cambios,
});

const garantia = (cambios: Partial<Garantia> = {}): Garantia => ({
  depositoOriginal: 20,
  montoRetenido: null,
  montoLiberado: null,
  estadoGarantia: "PENDIENTE",
  motivo: null,
  estadoReserva: "EN_CURSO",
  simulado: true,
  ...cambios,
});

type Respuesta = Response | Promise<Response>;
type Rutas = {
  devolucion?: () => Respuesta;
  garantia?: () => Respuesta;
  registrar?: (cuerpo: Record<string, unknown>) => Respuesta;
  resolver?: (cuerpo: Record<string, unknown>) => Respuesta;
};

/** Simula los route handlers de la devolución y de la resolución del depósito. */
function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const ruta = new URL(String(entrada), "http://localhost").pathname;
    const esPost = init?.method === "POST";
    const cuerpo = esPost ? (JSON.parse(String(init?.body)) as Record<string, unknown>) : {};
    if (ruta === `/api/reservas/${RESERVA}/devolucion`) {
      if (esPost && rutas.registrar) return rutas.registrar(cuerpo);
      if (!esPost) return rutas.devolucion ? rutas.devolucion() : json({ message: "No" }, 404);
    }
    if (ruta === `/api/reservas/${RESERVA}/deposito/resolucion`) {
      if (esPost && rutas.resolver) return rutas.resolver(cuerpo);
      if (!esPost) return rutas.garantia ? rutas.garantia() : json(garantia());
    }
    throw new Error(`Llamada no esperada: ${init?.method ?? "GET"} ${ruta}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    posts: (sufijo: string) =>
      fetchMock.mock.calls
        .filter(([url, init]) => init?.method === "POST" && String(url).endsWith(sufijo))
        .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>),
  };
}

const pantalla = (esArrendador = true) =>
  render(<PantallaDevolucion reservaId={RESERVA} esArrendador={esArrendador} />);

const resumen = () => screen.getByRole("region", { name: "Resumen de la garantía" });
const fila = (termino: string) =>
  within(resumen()).getByText(termino).nextElementSibling as HTMLElement;

describe("calcularResolucion", () => {
  it("calcula el liberado a dos decimales y el estado de la garantía", () => {
    expect(calcularResolucion(20, "5")).toEqual({ retenido: 5, liberado: 15, estado: "RETENIDA" });
    expect(calcularResolucion(20, "0")).toEqual({ retenido: 0, liberado: 20, estado: "LIBERADA" });
    expect(calcularResolucion(20, "20")).toEqual({ retenido: 20, liberado: 0, estado: "RETENIDA" });
    expect(calcularResolucion(0.3, "0.1")).toEqual({
      retenido: 0.1,
      liberado: 0.2,
      estado: "RETENIDA",
    });
  });

  it.each(["", "abc", "-1", "1.234"])("rechaza el monto «%s»", (texto) => {
    expect(calcularResolucion(20, texto)).toEqual({
      error: "El monto retenido debe ser un número de 0 en adelante, con hasta dos decimales.",
    });
  });

  it("rechaza un monto mayor que el depósito", () => {
    expect(calcularResolucion(20, "20.01")).toEqual({
      error: "El monto retenido no puede superar el depósito.",
    });
  });
});

describe("PantallaDevolucion: primero la devolución", () => {
  it("sin devolución muestra el formulario y la resolución todavía no está habilitada", async () => {
    simularApi({});

    pantalla();

    expect(screen.getByRole("status")).toHaveTextContent("Cargando...");
    expect(await screen.findByRole("form", { name: "Registrar devolución" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "2. La resolución del depósito se habilita después de registrar la devolución.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolver depósito" })).not.toBeInTheDocument();
    expect(screen.getByText("EN_CURSO")).toBeInTheDocument();
  });

  it("registra una devolución sin observaciones y habilita la resolución", async () => {
    const user = userEvent.setup();
    let registrada = false;
    const api = simularApi({
      devolucion: () =>
        registrada
          ? json(devolucion({ estadoFinal: "SIN_OBSERVACIONES", danos: null }))
          : json({ message: "No" }, 404),
      registrar: () => {
        registrada = true;
        return json({ devolucionId: "d-1", reservaId: RESERVA, devolucionRegistrada: true }, 201);
      },
    });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });

    fireEvent.change(screen.getByLabelText("Fecha y hora real de la devolución"), {
      target: { value: "2026-12-03T12:15" },
    });
    await user.click(screen.getByRole("button", { name: "Registrar devolución" }));

    expect(await screen.findByRole("button", { name: "Resolver depósito" })).toBeInTheDocument();
    expect(api.posts("/devolucion")).toEqual([
      { fechaReal: "2026-12-03T12:15:00-06:00", estadoFinal: "SIN_OBSERVACIONES" },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("Devolución registrada.");
    expect(screen.queryByRole("form", { name: "Registrar devolución" })).not.toBeInTheDocument();
    // La reserva sigue abierta hasta resolver el depósito.
    expect(screen.getByText("EN_CURSO")).toBeInTheDocument();
  });

  it("con observaciones exige los daños y los envía recortados", async () => {
    const user = userEvent.setup();
    const api = simularApi({ registrar: () => json({ devolucionId: "d-1" }, 201) });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });

    await user.click(screen.getByLabelText("Con observaciones (daños o faltantes)"));
    await user.click(screen.getByRole("button", { name: "Registrar devolución" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Describe los daños o faltantes.");
    expect(api.posts("/devolucion")).toHaveLength(0);

    await user.type(screen.getByLabelText("Daños o faltantes"), "  Rayón lateral ");
    await user.click(screen.getByRole("button", { name: "Registrar devolución" }));

    await waitFor(() => expect(api.posts("/devolucion")).toHaveLength(1));
    expect(api.posts("/devolucion")[0]).toMatchObject({
      estadoFinal: "CON_OBSERVACIONES",
      danos: "Rayón lateral",
    });
  });

  it("deshabilita el botón mientras se registra", async () => {
    const user = userEvent.setup();
    simularApi({ registrar: () => new Promise<Response>(() => {}) });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });

    await user.click(screen.getByRole("button", { name: "Registrar devolución" }));

    expect(screen.getByRole("button", { name: "Registrando..." })).toBeDisabled();
  });

  it("un 409 al registrar muestra el mensaje del backend y no habilita la resolución", async () => {
    const user = userEvent.setup();
    simularApi({
      registrar: () => json({ message: "La reserva no tiene una entrega registrada." }, 409),
    });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });

    await user.click(screen.getByRole("button", { name: "Registrar devolución" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La reserva no tiene una entrega registrada.",
    );
    expect(screen.queryByRole("button", { name: "Resolver depósito" })).not.toBeInTheDocument();
  });
});

describe("PantallaDevolucion: resolución del depósito", () => {
  it("muestra original, retenido y liberado calculado mientras se escribe", async () => {
    const user = userEvent.setup();
    simularApi({ devolucion: () => json(devolucion()) });
    pantalla();
    await screen.findByRole("button", { name: "Resolver depósito" });

    expect(fila("Depósito original")).toHaveTextContent("$20.00");
    expect(fila("Monto retenido")).toHaveTextContent("$0.00");
    expect(fila("Monto liberado")).toHaveTextContent("$20.00");
    expect(fila("Estado de la garantía")).toHaveTextContent("LIBERADA (al confirmar)");

    const campo = screen.getByLabelText("Monto a retener (USD)");
    await user.clear(campo);
    await user.type(campo, "5.50");

    expect(fila("Monto retenido")).toHaveTextContent("$5.50");
    expect(fila("Monto liberado")).toHaveTextContent("$14.50");
    expect(fila("Estado de la garantía")).toHaveTextContent("RETENIDA (al confirmar)");
    expect(
      within(resumen()).getByText("Importes simulados: no son devoluciones bancarias reales."),
    ).toBeInTheDocument();
  });

  it("exige el motivo si se retiene algo y no deja superar el depósito", async () => {
    const user = userEvent.setup();
    const api = simularApi({ devolucion: () => json(devolucion()) });
    pantalla();
    await screen.findByRole("button", { name: "Resolver depósito" });
    const campo = screen.getByLabelText("Monto a retener (USD)");

    await user.clear(campo);
    await user.type(campo, "5");
    await user.click(screen.getByRole("button", { name: "Resolver depósito" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe el motivo de la retención.");

    await user.clear(campo);
    await user.type(campo, "20.01");
    await user.click(screen.getByRole("button", { name: "Resolver depósito" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "El monto retenido no puede superar el depósito.",
    );

    expect(screen.queryByRole("group", { name: "Confirmar el cierre" })).not.toBeInTheDocument();
    expect(api.posts("/resolucion")).toHaveLength(0);
  });

  it("confirma, retiene con motivo y muestra la reserva COMPLETADA con montos consistentes", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      devolucion: () => json(devolucion()),
      resolver: () =>
        json(
          garantia({
            montoRetenido: 5,
            montoLiberado: 15,
            estadoGarantia: "RETENIDA",
            motivo: "Daño reportado",
            estadoReserva: "COMPLETADA",
          }),
        ),
    });
    pantalla();
    await screen.findByRole("button", { name: "Resolver depósito" });

    const campo = screen.getByLabelText("Monto a retener (USD)");
    await user.clear(campo);
    await user.type(campo, "5");
    await user.type(screen.getByLabelText("Motivo de la retención"), " Daño reportado ");
    await user.click(screen.getByRole("button", { name: "Resolver depósito" }));

    const confirmacion = screen.getByRole("group", { name: "Confirmar el cierre" });
    expect(confirmacion).toHaveTextContent("Se liberan $15.00 y se retienen $5.00.");
    expect(confirmacion).toHaveTextContent("no se hace ninguna devolución bancaria real");
    // Nada se envía hasta confirmar.
    expect(api.posts("/resolucion")).toHaveLength(0);

    await user.click(within(confirmacion).getByRole("button", { name: "Confirmar y cerrar" }));

    expect(await screen.findByText("COMPLETADA")).toBeInTheDocument();
    expect(api.posts("/resolucion")).toEqual([{ montoRetenido: 5, motivo: "Daño reportado" }]);
    expect(fila("Depósito original")).toHaveTextContent("$20.00");
    expect(fila("Monto retenido")).toHaveTextContent("$5.00");
    expect(fila("Monto liberado")).toHaveTextContent("$15.00");
    expect(fila("Estado de la garantía")).toHaveTextContent("RETENIDA");
    expect(within(resumen()).getByText("Daño reportado")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("La reserva quedó COMPLETADA.");
    expect(screen.queryByRole("button", { name: "Resolver depósito" })).not.toBeInTheDocument();
  });

  it("libera todo sin motivo", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      devolucion: () => json(devolucion()),
      resolver: () =>
        json(
          garantia({
            montoRetenido: 0,
            montoLiberado: 20,
            estadoGarantia: "LIBERADA",
            estadoReserva: "COMPLETADA",
          }),
        ),
    });
    pantalla();
    await user.click(await screen.findByRole("button", { name: "Resolver depósito" }));
    await user.click(screen.getByRole("button", { name: "Confirmar y cerrar" }));

    await waitFor(() => expect(fila("Estado de la garantía")).toHaveTextContent("LIBERADA"));
    expect(api.posts("/resolucion")).toEqual([{ montoRetenido: 0 }]);
  });

  it("con una devolución sin observaciones no deja retener", async () => {
    simularApi({
      devolucion: () => json(devolucion({ estadoFinal: "SIN_OBSERVACIONES", danos: null })),
    });
    pantalla();
    await screen.findByRole("button", { name: "Resolver depósito" });

    expect(screen.getByLabelText("Monto a retener (USD)")).toBeDisabled();
    expect(
      screen.getByText(/sin observaciones, así que el depósito se libera completo/),
    ).toBeInTheDocument();
  });

  it("deshabilita las acciones mientras se procesa y «Volver» regresa sin enviar", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      devolucion: () => json(devolucion()),
      resolver: () => new Promise<Response>(() => {}),
    });
    pantalla();
    await user.click(await screen.findByRole("button", { name: "Resolver depósito" }));

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("group", { name: "Confirmar el cierre" })).not.toBeInTheDocument();
    expect(api.posts("/resolucion")).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Resolver depósito" }));
    await user.click(screen.getByRole("button", { name: "Confirmar y cerrar" }));

    expect(screen.getByRole("button", { name: "Procesando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
  });

  it.each([
    [422, "RETENCION_SUPERA_DEPOSITO", "El monto retenido no puede superar el depósito"],
    [
      422,
      "RETENCION_SIN_OBSERVACIONES",
      "No se puede retener la garantía de una devolución sin observaciones",
    ],
  ])("un %i %s muestra el error y la reserva no se ve cerrada", async (status, codigo, message) => {
    const user = userEvent.setup();
    simularApi({
      devolucion: () => json(devolucion()),
      resolver: () => json({ statusCode: status, codigo, message }, status),
    });
    pantalla();
    await user.click(await screen.findByRole("button", { name: "Resolver depósito" }));
    await user.click(screen.getByRole("button", { name: "Confirmar y cerrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByText("EN_CURSO")).toBeInTheDocument();
    expect(screen.queryByText("COMPLETADA")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolver depósito" })).toBeEnabled();
    expect(screen.queryByRole("group", { name: "Confirmar el cierre" })).not.toBeInTheDocument();
  });

  it("un 409 muestra el error, no cierra por su cuenta y vuelve a consultar el estado real", async () => {
    const user = userEvent.setup();
    let resuelta = false;
    simularApi({
      devolucion: () => json(devolucion()),
      garantia: () =>
        json(
          resuelta
            ? garantia({
                montoRetenido: 0,
                montoLiberado: 20,
                estadoGarantia: "LIBERADA",
                estadoReserva: "COMPLETADA",
              })
            : garantia(),
        ),
      resolver: () => {
        resuelta = true;
        return json({ statusCode: 409, message: "La garantía de esta reserva ya fue resuelta." }, 409);
      },
    });
    pantalla();
    await user.click(await screen.findByRole("button", { name: "Resolver depósito" }));
    await user.click(screen.getByRole("button", { name: "Confirmar y cerrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La garantía de esta reserva ya fue resuelta.",
    );
    // El estado que se muestra es el que devolvió el backend al volver a consultar.
    expect(await screen.findByText("COMPLETADA")).toBeInTheDocument();
    expect(fila("Estado de la garantía")).toHaveTextContent("LIBERADA");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("PantallaDevolucion: consulta", () => {
  it("el arrendatario ve la devolución y la garantía sin acciones", async () => {
    simularApi({ devolucion: () => json(devolucion()) });

    pantalla(false);

    expect(await screen.findByText("Rayón lateral")).toBeInTheDocument();
    expect(screen.getByText("Con observaciones")).toBeInTheDocument();
    expect(fila("Estado de la garantía")).toHaveTextContent("PENDIENTE");
    expect(fila("Monto retenido")).toHaveTextContent("—");
    expect(
      screen.getByText("El arrendador todavía no ha resuelto el depósito."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolver depósito" })).not.toBeInTheDocument();
  });

  it("el arrendatario sin devolución ve que falta registrarla", async () => {
    simularApi({});

    pantalla(false);

    expect(
      await screen.findByText("El arrendador todavía no ha registrado la devolución."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Registrar devolución" })).not.toBeInTheDocument();
  });

  it.each([
    [404, "La reserva no existe."],
    [403, "Esta reserva no es tuya."],
    [500, "No se pudo consultar la reserva. Inténtalo de nuevo."],
    [502, "No se pudo consultar la reserva. Revisa tu conexión."],
  ])("con un %i al consultar muestra «%s»", async (status, mensaje) => {
    simularApi({ garantia: () => json({ statusCode: status, message: "x" }, status) });

    pantalla();

    expect(await screen.findByRole("alert")).toHaveTextContent(mensaje);
  });

  it("con un 401 va al login", async () => {
    simularApi({ garantia: () => json({ statusCode: 401 }, 401) });

    pantalla();

    await waitFor(() => expect(irALogin).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
