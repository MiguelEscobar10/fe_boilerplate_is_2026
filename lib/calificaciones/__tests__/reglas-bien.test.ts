import { describe, expect, it } from "vitest";
import { validarCalificacionBien } from "../reglas";

describe("validarCalificacionBien", () => {
  it("acepta puntajes de 1 a 5 y un comentario de hasta 500 caracteres", () => {
    expect(validarCalificacionBien(1, 5, "a".repeat(500))).toEqual({});
    expect(validarCalificacionBien(5, 1, "")).toEqual({});
  });

  it.each([null, 0, 6, 4.5, Number.NaN])("rechaza el puntaje %s", (valor) => {
    expect(validarCalificacionBien(valor, 3, "").puntajeBien).toBeDefined();
    expect(validarCalificacionBien(3, valor, "").puntajeArrendador).toBeDefined();
  });

  it("marca cada escala por separado", () => {
    const errores = validarCalificacionBien(3, null, "");
    expect(errores.puntajeBien).toBeUndefined();
    expect(errores.puntajeArrendador).toBeDefined();
  });

  it("rechaza un comentario de más de 500 caracteres, medido sin espacios de los extremos", () => {
    expect(validarCalificacionBien(3, 3, "a".repeat(501)).comentario).toBeDefined();
    expect(validarCalificacionBien(3, 3, `  ${"a".repeat(500)}  `).comentario).toBeUndefined();
  });
});
