import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoPublicacion } from "@/app/actions/publicaciones";
import { MAX_FOTOS, validarPublicacion } from "@/lib/publicaciones/reglas";
import { FormularioPublicacion } from "../formulario-publicacion";

// La Server Action se reemplaza: aquí solo se prueba el componente.
const crearPublicacion = vi.fn<
  (previo: EstadoPublicacion, datos: FormData) => Promise<EstadoPublicacion>
>(async () => ({ estado: "inicial" }));
vi.mock("@/app/actions/publicaciones", () => ({
  crearPublicacion: (previo: EstadoPublicacion, datos: FormData) =>
    crearPublicacion(previo, datos),
}));

// En jsdom, new FormData(form) no copia los archivos del <input type="file">.
// Aquí se toman del input para que el formulario vea la foto como en el navegador.
vi.mock("@/lib/publicaciones/reglas", async (original) => {
  const real = await original<typeof import("@/lib/publicaciones/reglas")>();
  return {
    ...real,
    leerFormulario: (datos: FormData) => {
      const leido = real.leerFormulario(datos);
      if (leido.imagenes.length > 0) return leido;
      const input = document.getElementById("imagenes") as HTMLInputElement | null;
      return { ...leido, imagenes: Array.from(input?.files ?? []) };
    },
  };
});

const foto = (nombre = "foto.jpg", tipo = "image/jpeg", bytes = 1024) =>
  new File(["a".repeat(bytes)], nombre, { type: tipo });

const validos = {
  tipo: "EQUIPO",
  nombre: "Proyector Epson",
  descripcion: "",
  ubicacion: "San Salvador",
  tarifaMonto: "10",
  tarifaUnidad: "DIA",
  depositoMonto: "5",
  condiciones: "",
  imagenes: [foto()],
};

async function llenarValido(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole("radio", { name: "Equipo" }));
  await usuario.type(screen.getByLabelText("Nombre"), validos.nombre);
  await usuario.type(screen.getByLabelText("Ubicación"), validos.ubicacion);
  await usuario.type(screen.getByLabelText("Tarifa (USD)"), validos.tarifaMonto);
  await usuario.selectOptions(screen.getByLabelText("Unidad de cobro"), "DIA");
  await usuario.type(screen.getByLabelText(/Depósito de garantía/), validos.depositoMonto);
  await usuario.upload(screen.getByLabelText("Fotografías"), foto());
}

describe("H01. Publicar un equipo o espacio (componente)", () => {
  // jsdom no crea vistas previas de archivos.
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:vista-previa");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  it("AC1: con los datos completos y una foto, envía la publicación", async () => {
    const usuario = userEvent.setup();
    render(<FormularioPublicacion />);
    await llenarValido(usuario);
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(crearPublicacion).toHaveBeenCalledTimes(1));
    const datos = crearPublicacion.mock.calls[0][1];
    expect(datos.get("nombre")).toBe("Proyector Epson");
    expect(datos.get("tarifaUnidad")).toBe("DIA");
    expect((screen.getByLabelText("Fotografías") as HTMLInputElement).files?.[0]?.name).toBe(
      "foto.jpg",
    );
  });

  it("AC2: el formulario pide los datos que luego muestra el detalle", () => {
    render(<FormularioPublicacion />);
    for (const etiqueta of [
      "Nombre",
      "Ubicación",
      "Tarifa (USD)",
      "Unidad de cobro",
      /Depósito de garantía/,
      /Condiciones de uso/,
      "Fotografías",
    ]) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Equipo" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Espacio" })).toBeInTheDocument();
  });

  it("AC3: sin foto no se envía y dice qué corregir", async () => {
    const usuario = userEvent.setup();
    render(<FormularioPublicacion />);
    await usuario.click(screen.getByRole("radio", { name: "Equipo" }));
    await usuario.type(screen.getByLabelText("Nombre"), "Proyector");
    await usuario.type(screen.getByLabelText("Ubicación"), "San Salvador");
    await usuario.type(screen.getByLabelText("Tarifa (USD)"), "10");
    await usuario.selectOptions(screen.getByLabelText("Unidad de cobro"), "DIA");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Agregá al menos una fotografía.")).toBeInTheDocument();
    expect(screen.getByText("Revisá los campos marcados.")).toBeInTheDocument();
    expect(crearPublicacion).not.toHaveBeenCalled();
  });

  it("AC3: con tarifa 0 no se envía y marca el campo", async () => {
    const usuario = userEvent.setup();
    render(<FormularioPublicacion />);
    await llenarValido(usuario);
    await usuario.clear(screen.getByLabelText("Tarifa (USD)"));
    await usuario.type(screen.getByLabelText("Tarifa (USD)"), "0");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("La tarifa debe ser mayor que 0, con hasta dos decimales."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tarifa (USD)")).toHaveAttribute("aria-invalid", "true");
    expect(crearPublicacion).not.toHaveBeenCalled();
  });

  it("AC3: el nombre no deja escribir más de 100 caracteres", () => {
    render(<FormularioPublicacion />);
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("maxLength", "100");
  });

  it.each([
    ["nombre vacío", { nombre: "" }, "nombre", "El nombre es obligatorio."],
    [
      "nombre de 101 caracteres",
      { nombre: "a".repeat(101) },
      "nombre",
      "El nombre no puede pasar de 100 caracteres.",
    ],
    ["sin tipo", { tipo: "" }, "tipo", "Elegí si es un equipo o un espacio."],
    ["sin ubicación", { ubicacion: "" }, "ubicacion", "La ubicación es obligatoria."],
    [
      "tarifa negativa",
      { tarifaMonto: "-5" },
      "tarifaMonto",
      "La tarifa debe ser mayor que 0, con hasta dos decimales.",
    ],
    [
      "tarifa con tres decimales",
      { tarifaMonto: "10.999" },
      "tarifaMonto",
      "La tarifa debe ser mayor que 0, con hasta dos decimales.",
    ],
    ["sin unidad", { tarifaUnidad: "" }, "tarifaUnidad", "Elegí la unidad de cobro."],
    [
      "depósito negativo",
      { depositoMonto: "-1" },
      "depositoMonto",
      "El depósito debe ser 0 o más, con hasta dos decimales.",
    ],
    [
      "foto GIF",
      { imagenes: [foto("200.gif", "image/gif")] },
      "imagenes",
      '"200.gif" no es JPG ni PNG.',
    ],
    [
      "foto de más de 5 MB",
      { imagenes: [foto("grande.jpg", "image/jpeg", 5 * 1024 * 1024 + 1)] },
      "imagenes",
      '"grande.jpg" pesa más de 5 MB.',
    ],
    [
      "más de 10 fotos",
      { imagenes: Array.from({ length: MAX_FOTOS + 1 }, (_, i) => foto(`f${i}.jpg`)) },
      "imagenes",
      `Se permiten como máximo ${MAX_FOTOS} fotografías.`,
    ],
  ])("AC3: rechaza %s con un mensaje claro", (_caso, cambio, campo, mensaje) => {
    const errores = validarPublicacion({ ...validos, ...cambio });
    expect(errores).toEqual({ [campo]: mensaje });
  });

  it("AC3: los datos válidos no tienen errores", () => {
    expect(validarPublicacion(validos)).toEqual({});
  });

  it("AC4: si el servidor responde que la cuenta no es de arrendador, muestra Acceso restringido", async () => {
    crearPublicacion.mockResolvedValueOnce({ estado: "restringido" });
    const usuario = userEvent.setup();
    render(<FormularioPublicacion />);
    await llenarValido(usuario);
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Acceso restringido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });
});
