import { describe, expect, it } from "vitest";
import { esTarjetaDePrueba, normalizarTarjeta, validarTarjeta } from "../tarjeta";

const VALIDA = { numeroTarjeta: "4242424242424242", vencimiento: "12/28", cvv: "123" };

describe("validación de la tarjeta de prueba", () => {
  it("acepta solo tarjetas terminadas en 4242 o 0002", () => {
    expect(esTarjetaDePrueba("4242424242424242")).toBe(true);
    expect(esTarjetaDePrueba("4000000000000002")).toBe(true);
    expect(esTarjetaDePrueba("4111111111111111")).toBe(false);
    expect(esTarjetaDePrueba("5555555555554444")).toBe(false);
  });

  it("no da errores con una tarjeta de prueba bien escrita", () => {
    expect(validarTarjeta(VALIDA)).toEqual({});
    expect(validarTarjeta({ ...VALIDA, numeroTarjeta: "4000000000000002", cvv: "1234" })).toEqual({});
  });

  it("explica que solo se aceptan tarjetas de prueba", () => {
    const errores = validarTarjeta({ ...VALIDA, numeroTarjeta: "4111111111111111" });
    expect(errores.numeroTarjeta).toMatch(/solo se aceptan tarjetas de prueba/i);
    expect(errores.numeroTarjeta).toMatch(/4242/);
    expect(errores.numeroTarjeta).toMatch(/0002/);
  });

  it("quita los espacios antes de validar", () => {
    const datos = normalizarTarjeta({
      numeroTarjeta: "4242 4242 4242 4242",
      vencimiento: " 12/28 ",
      cvv: " 123",
    });
    expect(datos).toEqual(VALIDA);
    expect(validarTarjeta(datos)).toEqual({});
  });

  it("valida el formato de cada campo", () => {
    expect(validarTarjeta({ numeroTarjeta: "", vencimiento: "", cvv: "" })).toEqual({
      numeroTarjeta: expect.any(String),
      vencimiento: expect.any(String),
      cvv: expect.any(String),
    });
    expect(validarTarjeta({ ...VALIDA, numeroTarjeta: "424242" }).numeroTarjeta).toMatch(/13 a 19/);
    expect(validarTarjeta({ ...VALIDA, numeroTarjeta: "4242abcd42424242" }).numeroTarjeta).toBeDefined();
    expect(validarTarjeta({ ...VALIDA, vencimiento: "13/28" }).vencimiento).toMatch(/MM\/AA/);
    expect(validarTarjeta({ ...VALIDA, vencimiento: "1228" }).vencimiento).toMatch(/MM\/AA/);
    expect(validarTarjeta({ ...VALIDA, cvv: "12" }).cvv).toMatch(/3 o 4/);
  });

  it("los mensajes no repiten lo que escribió el usuario", () => {
    const errores = validarTarjeta({ numeroTarjeta: "4111111111111111", vencimiento: "99/99", cvv: "98" });
    for (const mensaje of Object.values(errores)) {
      expect(mensaje).not.toContain("4111");
      expect(mensaje).not.toContain("99/99");
      expect(mensaje).not.toContain("98");
    }
  });
});
