// Plan de pruebas de H09 (MP4-79). Los números de criterio son los del plan
// de pruebas. En la UI se prueba el registro de la devolución (AC1), la
// liberación completa (AC2), la retención con monto y motivo (AC3), lo que la
// pantalla no deja resolver (AC4) y la reserva COMPLETADA al cerrar (AC5).
// El aviso al arrendatario (AC6) lo manda el backend al resolver (BE-09.2,
// test/qa/qa-09.1-devolucion.e2e-spec.ts).
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PantallaDevolucion } from "../pantalla-devolucion";
import type { Devolucion, Garantia } from "@/lib/devoluciones/tipos";

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

const SIN_DANOS = devolucion({ estadoFinal: "SIN_OBSERVACIONES", danos: null });

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
  registrar?: (cuerpo: Record<string, unknown>) => Respuesta;
  resolver?: (cuerpo: Record<string, unknown>) => Respuesta;
};

/** Simula los route handlers de la devolución y de la resolución del depósito. */
function simularApi(rutas: Rutas) {
  const fetchMock = vi.fn(
    async (entrada: RequestInfo | URL, init?: RequestInit) => {
      const ruta = new URL(String(entrada), "http://localhost").pathname;
      const esPost = init?.method === "POST";
      const cuerpo = esPost
        ? (JSON.parse(String(init?.body)) as Record<string, unknown>)
        : {};
      if (ruta === `/api/reservas/${RESERVA}/devolucion`) {
        if (esPost && rutas.registrar) return rutas.registrar(cuerpo);
        if (!esPost)
          return rutas.devolucion
            ? rutas.devolucion()
            : json({ message: "No" }, 404);
      }
      if (ruta === `/api/reservas/${RESERVA}/deposito/resolucion`) {
        if (esPost && rutas.resolver) return rutas.resolver(cuerpo);
        if (!esPost) return json(garantia());
      }
      throw new Error(`Llamada no esperada: ${init?.method ?? "GET"} ${ruta}`);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return {
    posts: (sufijo: string) =>
      fetchMock.mock.calls
        .filter(
          ([url, init]) =>
            init?.method === "POST" && String(url).endsWith(sufijo),
        )
        .map(
          ([, init]) =>
            JSON.parse(String(init?.body)) as Record<string, unknown>,
        ),
  };
}

const pantalla = () =>
  render(<PantallaDevolucion reservaId={RESERVA} esArrendador />);
const resumen = () =>
  screen.getByRole("region", { name: "Resumen de la garantía" });
const fila = (termino: string) =>
  within(resumen()).getByText(termino).nextElementSibling as HTMLElement;
const resolver = () =>
  screen.getByRole("button", { name: "Resolver depósito" });

describe("H09. Registrar la devolución y resolver la garantía", () => {
  it("AC1: registrar la devolución de una reserva EN_CURSO envía la fecha y la condición final del bien", async () => {
    const user = userEvent.setup();
    let registrada = false;
    const api = simularApi({
      devolucion: () =>
        registrada ? json(SIN_DANOS) : json({ message: "No" }, 404),
      registrar: () => {
        registrada = true;
        return json(
          {
            devolucionId: "d-1",
            reservaId: RESERVA,
            devolucionRegistrada: true,
          },
          201,
        );
      },
    });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });
    expect(screen.getByText("EN_CURSO")).toBeInTheDocument();

    fireEvent.change(
      screen.getByLabelText("Fecha y hora real de la devolución"),
      {
        target: { value: "2026-12-03T12:15" },
      },
    );
    await user.click(
      screen.getByRole("button", { name: "Registrar devolución" }),
    );

    expect(
      await screen.findByRole("button", { name: "Resolver depósito" }),
    ).toBeInTheDocument();
    expect(api.posts("/devolucion")).toEqual([
      {
        fechaReal: "2026-12-03T12:15:00-06:00",
        estadoFinal: "SIN_OBSERVACIONES",
      },
    ]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Devolución registrada.",
    );
  });

  it("AC2: sin daños ni faltantes no deja retener y la garantía queda LIBERADA con el monto completo", async () => {
    const user = userEvent.setup();
    const api = simularApi({
      devolucion: () => json(SIN_DANOS),
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
    await screen.findByRole("button", { name: "Resolver depósito" });
    expect(screen.getByLabelText("Monto a retener (USD)")).toBeDisabled();

    await user.click(resolver());
    await user.click(
      screen.getByRole("button", { name: "Confirmar y cerrar" }),
    );

    await waitFor(() =>
      expect(fila("Estado de la garantía")).toHaveTextContent("LIBERADA"),
    );
    expect(api.posts("/resolucion")).toEqual([{ montoRetenido: 0 }]);
    expect(fila("Depósito original")).toHaveTextContent("$20.00");
    expect(fila("Monto liberado")).toHaveTextContent("$20.00");
    expect(fila("Monto retenido")).toHaveTextContent("$0.00");
  });

  it("AC3: con daños, retener pide el monto y el motivo y la garantía queda RETENIDA", async () => {
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

    // Sin motivo no avanza.
    await user.clear(campo);
    await user.type(campo, "5");
    await user.click(resolver());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escribe el motivo de la retención.",
    );
    expect(api.posts("/resolucion")).toHaveLength(0);

    await user.type(
      screen.getByLabelText("Motivo de la retención"),
      "Daño reportado",
    );
    await user.click(resolver());
    await user.click(
      screen.getByRole("button", { name: "Confirmar y cerrar" }),
    );

    await waitFor(() =>
      expect(fila("Estado de la garantía")).toHaveTextContent("RETENIDA"),
    );
    expect(api.posts("/resolucion")).toEqual([
      { montoRetenido: 5, motivo: "Daño reportado" },
    ]);
    expect(fila("Monto retenido")).toHaveTextContent("$5.00");
    expect(fila("Monto liberado")).toHaveTextContent("$15.00");
    expect(within(resumen()).getByText("Daño reportado")).toBeInTheDocument();
  });

  it("AC4: un monto retenido mayor que el depósito se rechaza y no se envía", async () => {
    const user = userEvent.setup();
    const api = simularApi({ devolucion: () => json(devolucion()) });
    pantalla();
    await screen.findByRole("button", { name: "Resolver depósito" });
    const campo = screen.getByLabelText("Monto a retener (USD)");

    await user.clear(campo);
    await user.type(campo, "25");
    await user.click(resolver());

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El monto retenido no puede superar el depósito.",
    );
    expect(
      screen.queryByRole("group", { name: "Confirmar el cierre" }),
    ).not.toBeInTheDocument();
    expect(api.posts("/resolucion")).toHaveLength(0);
  });

  it("AC4: sin devolución registrada la resolución de la garantía no está disponible", async () => {
    simularApi({});

    pantalla();

    await screen.findByRole("form", { name: "Registrar devolución" });
    expect(
      screen.getByText(
        "2. La resolución del depósito se habilita después de registrar la devolución.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Resolver depósito" }),
    ).not.toBeInTheDocument();
  });

  it("AC5: al quedar registrado el cierre, la reserva aparece COMPLETADA y ya no se puede resolver de nuevo", async () => {
    const user = userEvent.setup();
    simularApi({
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
    await screen.findByRole("button", { name: "Resolver depósito" });
    expect(screen.getByText("EN_CURSO")).toBeInTheDocument();

    await user.click(resolver());
    await user.click(
      screen.getByRole("button", { name: "Confirmar y cerrar" }),
    );

    expect(await screen.findByText("COMPLETADA")).toBeInTheDocument();
    expect(screen.queryByText("EN_CURSO")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "La reserva quedó COMPLETADA.",
    );
    expect(
      screen.queryByRole("button", { name: "Resolver depósito" }),
    ).not.toBeInTheDocument();
  });

  it("Negativo: si el backend rechaza el registro (409) muestra su mensaje y no habilita la resolución", async () => {
    const user = userEvent.setup();
    simularApi({
      registrar: () =>
        json({ statusCode: 409, message: "La reserva no está EN_CURSO." }, 409),
    });
    pantalla();
    await screen.findByRole("form", { name: "Registrar devolución" });

    fireEvent.change(
      screen.getByLabelText("Fecha y hora real de la devolución"),
      {
        target: { value: "2026-12-03T12:15" },
      },
    );
    await user.click(
      screen.getByRole("button", { name: "Registrar devolución" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La reserva no está EN_CURSO.",
    );
    expect(
      screen.queryByRole("button", { name: "Resolver depósito" }),
    ).not.toBeInTheDocument();
  });
});
