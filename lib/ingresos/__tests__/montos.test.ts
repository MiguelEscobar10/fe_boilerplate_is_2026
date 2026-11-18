import { describe, expect, it } from "vitest";
import { formatearImporte } from "../montos";

describe("formatearImporte", () => {
  it("agrega $ y deja los dos decimales del backend", () => {
    expect(formatearImporte("130.00")).toBe("$130.00");
    expect(formatearImporte("0.00")).toBe("$0.00");
    expect(formatearImporte("92.50")).toBe("$92.50");
  });

  it("completa a dos decimales", () => {
    expect(formatearImporte("45.5")).toBe("$45.50");
    expect(formatearImporte("7")).toBe("$7.00");
  });

  it("no pierde precisión con importes grandes (no pasa por number)", () => {
    expect(formatearImporte("12345678901234567.89")).toBe("$12345678901234567.89");
  });

  it("muestra «—» si no es un importe válido", () => {
    expect(formatearImporte("abc")).toBe("—");
    expect(formatearImporte("1.234")).toBe("—");
    expect(formatearImporte("")).toBe("—");
  });
});
