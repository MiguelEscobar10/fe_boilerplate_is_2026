import { describe, expect, it } from "vitest";
import { aCentavos, formatearMonto, sumarMontos } from "../montos";

describe("montos", () => {
  it("formatea siempre con dos decimales", () => {
    expect(formatearMonto("45")).toBe("45.00");
    expect(formatearMonto("45.5")).toBe("45.50");
    expect(formatearMonto("0.05")).toBe("0.05");
    expect(formatearMonto(12.3)).toBe("12.30");
  });

  it("suma sin errores de punto flotante", () => {
    expect(sumarMontos("0.10", "0.20")).toBe("0.30");
    expect(sumarMontos("45.00", "5.05")).toBe("50.05");
    expect(sumarMontos("1999.99", "0.01")).toBe("2000.00");
  });

  it("rechaza importes que no son válidos", () => {
    expect(() => aCentavos("abc")).toThrow();
    expect(() => aCentavos("-1")).toThrow();
    expect(() => aCentavos("1.234")).toThrow();
  });
});
