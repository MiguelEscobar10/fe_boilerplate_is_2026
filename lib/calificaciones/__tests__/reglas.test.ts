import { describe, expect, it } from "vitest";
import { validarCalificacion } from "../reglas";

describe("validarCalificacion", () => {
  it.each([1, 3, 5])("acepta el puntaje %i sin comentario", (puntaje) => {
    expect(validarCalificacion(puntaje, "")).toEqual({});
  });

  it.each([
    ["sin elegir", null],
    ["0", 0],
    ["6", 6],
    ["con decimales", 4.5],
  ])("rechaza el puntaje %s", (_caso, puntaje) => {
    expect(validarCalificacion(puntaje, "").puntaje).toBe("Elige de 1 a 5 estrellas.");
  });

  it("acepta 500 caracteres de comentario y rechaza 501", () => {
    expect(validarCalificacion(5, "a".repeat(500))).toEqual({});
    expect(validarCalificacion(5, "a".repeat(501)).comentario).toBe(
      "El comentario no puede pasar de 500 caracteres.",
    );
  });

  it("los espacios de los extremos no cuentan", () => {
    expect(validarCalificacion(5, `  ${"a".repeat(500)}  `)).toEqual({});
  });
});
