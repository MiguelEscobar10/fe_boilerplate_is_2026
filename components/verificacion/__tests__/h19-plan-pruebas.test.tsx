import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterruptorRequiereVerificacion } from "../interruptor-requiere-verificacion";
import { FormularioSolicitud } from "@/components/reservas/formulario-solicitud";
import PublicacionPage from "@/app/publicaciones/[id]/page";
import { getCurrentUser } from "@/lib/dal";
import { obtenerPublicacion, type Publicacion } from "@/lib/publicaciones/api";

/**
 * Plan de pruebas, H19. Exigir verificación para rentar: pruebas de componente
 * de la interfaz. Un `it('ACn: ...')` por criterio y, al final, los casos
 * negativos.
 */

vi.mock("@/lib/notificaciones/navegacion", () => ({ irALogin: vi.fn() }));
vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/publicaciones/api", () => ({ obtenerPublicacion: vi.fn() }));

const ID = "7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const DUENO = "11111111-1111-4111-8111-111111111111";
const RESERVA_ID = "91b7a5c3-1d2e-4f30-8a4b-5c6d7e8f9a0b";
const MENSAJE =
  "Esta publicación solo acepta usuarios verificados. Envía tu documento de identidad para verificarte.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

async function renderPagina() {
  render(
    await PublicacionPage({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    } as Parameters<typeof PublicacionPage>[0]),
  );
}

type Envio = { publicacionId: string; inicio: string; fin: string };

/**
 * Backend simulado: el PATCH de la opción, la disponibilidad sin ocupados y la
 * solicitud de reserva con la respuesta que pida cada prueba.
 */
function simularBackend({
  patch = (b: { requiereVerificacion: boolean }) => json({ id: ID, ...b }),
  reservar = (e: Envio): Response =>
    json(
      {
        id: RESERVA_ID,
        estado: "PENDIENTE",
        publicacion: { id: ID, nombre: "Proyector" },
        inicio: e.inicio,
        fin: e.fin,
        costoAlquiler: "45.00",
        depositoMonto: "20.00",
        creadaAt: "2026-11-17T16:00:00.000Z",
        decididaAt: null,
        motivoRechazo: null,
      },
      201,
    ),
}: {
  patch?: (b: { requiereVerificacion: boolean }) => Response;
  reservar?: (e: Envio) => Response;
} = {}) {
  const envios: Envio[] = [];
  const fetchMock = vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(entrada), "http://localhost");
    if (init?.method === "PATCH" && url.pathname === `/api/publicaciones/${ID}/requiere-verificacion`) {
      return patch(JSON.parse(String(init.body)));
    }
    if (url.pathname === `/api/publicaciones/${ID}/disponibilidad`) {
      const desde = url.searchParams.get("desde") ?? "";
      const hasta = url.searchParams.get("hasta") ?? "";
      return json({ publicacionId: ID, desde, hasta, ocupados: [] });
    }
    if (url.pathname === "/api/reservas" && init?.method === "POST") {
      const envio = JSON.parse(String(init.body)) as Envio;
      envios.push(envio);
      return reservar(envio);
    }
    throw new Error(`Llamada no esperada: ${init?.method ?? "GET"} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, envios };
}

const interruptor = () =>
  screen.getByRole("switch", { name: "Requiere verificación de identidad" });
const enviar = () => screen.getByRole("button", { name: /Solicitar reserva|Enviando/ });

async function pedirReserva() {
  render(
    <FormularioSolicitud publicacionId={ID} tarifaMonto="15.00" tarifaUnidad="HORA" depositoMonto="20.00" />,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^18 nov 2026, / }));
  await user.click(screen.getByRole("button", { name: /^18 nov 2026, / }));
  await screen.findByText(/\(días libres\)/);
  await user.click(enviar());
}

// Hoy: 17 de noviembre de 2026, 10:00 en El Salvador.
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-17T16:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("H19. Exigir verificación para rentar (interfaz)", () => {
  it("AC1: el dueño ve el interruptor en su publicación, lo activa y queda guardado «solo arrendatarios verificados»", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion());
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDADOR", DUENO));
    const { fetchMock } = simularBackend();
    await renderPagina();
    expect(interruptor()).toHaveAttribute("aria-checked", "false");

    await userEvent.setup().click(interruptor());

    expect(await screen.findByText(/Guardado: solo arrendatarios verificados/)).toBeInTheDocument();
    expect(interruptor()).toHaveAttribute("aria-checked", "true");
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ requiereVerificacion: true });
  });

  it("AC2: con la verificación APROBADA la solicitud se registra con normalidad (PENDIENTE)", async () => {
    const { envios } = simularBackend();

    await pedirReserva();

    const hecho = await screen.findByTestId("solicitud-enviada");
    expect(hecho).toHaveTextContent(RESERVA_ID);
    expect(hecho).toHaveTextContent("PENDIENTE");
    expect(envios).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Verificar mi identidad" })).not.toBeInTheDocument();
  });

  it("AC3: sin verificación APROBADA la solicitud no se envía: veo el motivo y cómo verificarme", async () => {
    simularBackend({
      reservar: () =>
        json(
          {
            statusCode: 422,
            error: "Unprocessable Entity",
            codigo: "VERIFICACION_REQUERIDA",
            message: MENSAJE,
          },
          422,
        ),
    });

    await pedirReserva();

    expect(await screen.findByText(MENSAJE)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Verificar mi identidad" })).toHaveAttribute(
      "href",
      "/verificacion",
    );
    expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
  });

  it("AC4: si la publicación no la requiere, no hay insignia y un arrendatario no verificado reserva con normalidad", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: false }));
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDATARIO"));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderPagina();
    expect(screen.queryByText("Requiere verificación de identidad")).not.toBeInTheDocument();
    document.body.innerHTML = "";

    simularBackend();
    await pedirReserva();

    expect(await screen.findByTestId("solicitud-enviada")).toHaveTextContent("PENDIENTE");
  });

  it("AC5: quien no es el dueño no ve el interruptor, y si el backend responde 403 el valor no cambia", async () => {
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: true }));
    vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDADOR"));
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderPagina();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText("Requiere verificación de identidad")).toBeInTheDocument();
    document.body.innerHTML = "";

    simularBackend({ patch: () => json({ message: "Solo el dueño" }, 403) });
    render(<InterruptorRequiereVerificacion publicacionId={ID} valorInicial={false} />);
    await userEvent.setup().click(interruptor());

    expect(await screen.findByRole("alert")).toHaveTextContent("Acceso restringido");
    expect(interruptor()).toHaveAttribute("aria-checked", "false");
  });

  describe("casos negativos", () => {
    it("NEG1: un arrendatario no ve el interruptor aunque la publicación exija verificación", async () => {
      vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion({ requiereVerificacion: true }));
      vi.mocked(getCurrentUser).mockResolvedValue(usuario("ARRENDATARIO"));
      vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

      await renderPagina();

      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      expect(screen.getByText("Requiere verificación de identidad")).toBeInTheDocument();
    });

    it("NEG2: un 422 con otro código no se confunde con la falta de verificación", async () => {
      simularBackend({
        reservar: () => json({ statusCode: 422, codigo: "OTRO", message: "Otro motivo" }, 422),
      });

      await pedirReserva();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Verificar mi identidad" })).not.toBeInTheDocument();
      expect(screen.queryByTestId("solicitud-enviada")).not.toBeInTheDocument();
    });
  });
});
