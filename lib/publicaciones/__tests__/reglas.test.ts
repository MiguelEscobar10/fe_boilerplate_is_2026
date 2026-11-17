import { describe, expect, it } from "vitest";
import { campoDeMensaje, validarPublicacion } from "../reglas";

describe("campoDeMensaje", () => {
  it.each([
    // Mensajes reales de BE-01.1; el nombre del archivo no debe confundir el campo.
    ['La imagen "nombre.jpg" no es JPG ni PNG.', "imagenes"],
    ['La imagen "tipo.png" pesa más de 5 MB.', "imagenes"],
    ['La imagen "tarifa-ubicacion.jpg" no es JPG ni PNG.', "imagenes"],
    ["Agregá al menos una fotografía.", "imagenes"],
    ["Se permiten como máximo 10 fotografías.", "imagenes"],
    ["Cada imagen puede pesar como máximo 5 MB.", "imagenes"],
    ["El tipo debe ser EQUIPO o ESPACIO.", "tipo"],
    ["El nombre no puede pasar de 100 caracteres.", "nombre"],
    ["La ubicación es obligatoria.", "ubicacion"],
    ["La unidad de cobro debe ser HORA, DIA, NOCHE o SEMANA.", "tarifaUnidad"],
    ["La tarifa debe ser mayor que 0.", "tarifaMonto"],
    ["El depósito debe ser un monto con hasta dos decimales.", "depositoMonto"],
    ["Las condiciones no pueden pasar de 1000 caracteres.", "condiciones"],
    ["Algo que no corresponde a ningún campo", null],
  ])("%s → %s", (mensaje, campo) => {
    expect(campoDeMensaje(mensaje)).toBe(campo);
  });
});

describe("validarPublicacion", () => {
  const foto = { name: "a.jpg", size: 1000, type: "image/jpeg" };
  const valida = {
    tipo: "EQUIPO",
    nombre: "Taladro",
    descripcion: "",
    ubicacion: "Antiguo Cuscatlán",
    tarifaMonto: "15.50",
    tarifaUnidad: "DIA",
    depositoMonto: "",
    condiciones: "",
    imagenes: [foto],
  };

  it("no encuentra errores en una publicación válida", () => {
    expect(validarPublicacion(valida)).toEqual({});
  });

  it.each([
    ["tarifa cero", { tarifaMonto: "0" }, "tarifaMonto"],
    ["tarifa con 3 decimales", { tarifaMonto: "1.234" }, "tarifaMonto"],
    ["depósito negativo", { depositoMonto: "-1" }, "depositoMonto"],
    ["nombre de 101 caracteres", { nombre: "n".repeat(101) }, "nombre"],
    ["sin fotos", { imagenes: [] }, "imagenes"],
    ["11 fotos", { imagenes: Array(11).fill(foto) }, "imagenes"],
    ["foto que no es JPG ni PNG", { imagenes: [{ ...foto, type: "application/pdf" }] }, "imagenes"],
    ["foto de más de 5 MB", { imagenes: [{ ...foto, size: 5 * 1024 * 1024 + 1 }] }, "imagenes"],
  ])("marca el error: %s", (_caso, cambio, campo) => {
    expect(validarPublicacion({ ...valida, ...cambio })).toHaveProperty(campo);
  });
});
