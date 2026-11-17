import { describe, expect, it } from "vitest";
import { fechaLegible, hoyEnElSalvador, mesEnCurso, validarRango } from "../fechas";

describe("mesEnCurso (hora de El Salvador)", () => {
  it("da el primer y el último día del mes", () => {
    expect(mesEnCurso(new Date("2026-11-16T15:00:00Z"))).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
    });
  });

  it("el 1 de diciembre a las 05:59:59Z todavía es noviembre en El Salvador", () => {
    const ahora = new Date("2026-12-01T05:59:59.999Z");
    expect(hoyEnElSalvador(ahora)).toBe("2026-11-30");
    expect(mesEnCurso(ahora)).toEqual({ desde: "2026-11-01", hasta: "2026-11-30" });
  });

  it("a las 06:00Z ya es diciembre", () => {
    expect(mesEnCurso(new Date("2026-12-01T06:00:00Z"))).toEqual({
      desde: "2026-12-01",
      hasta: "2026-12-31",
    });
  });

  it("cambio de año y febrero bisiesto", () => {
    expect(mesEnCurso(new Date("2027-01-01T05:00:00Z"))).toEqual({
      desde: "2026-12-01",
      hasta: "2026-12-31",
    });
    expect(mesEnCurso(new Date("2028-02-10T12:00:00Z"))).toEqual({
      desde: "2028-02-01",
      hasta: "2028-02-29",
    });
  });
});

describe("validarRango", () => {
  it("acepta un rango válido y un solo día", () => {
    expect(validarRango({ desde: "2026-11-01", hasta: "2026-11-30" })).toBeNull();
    expect(validarRango({ desde: "2026-11-05", hasta: "2026-11-05" })).toBeNull();
  });

  it("rechaza desde posterior a hasta", () => {
    expect(validarRango({ desde: "2026-11-20", hasta: "2026-11-10" })).toBe(
      "La fecha «Desde» no puede ser posterior a «Hasta».",
    );
  });

  it("acepta 366 días contando los extremos y rechaza 367", () => {
    expect(validarRango({ desde: "2026-01-01", hasta: "2027-01-01" })).toBeNull();
    expect(validarRango({ desde: "2026-01-01", hasta: "2027-01-02" })).toBe(
      "El rango no puede tener más de 366 días.",
    );
  });

  it("rechaza campos vacíos y fechas que no existen", () => {
    expect(validarRango({ desde: "", hasta: "2026-11-30" })).toBe(
      "Elige la fecha de inicio y la de fin.",
    );
    expect(validarRango({ desde: "2026-02-30", hasta: "2026-03-05" })).toBe(
      "Alguna de las fechas no es válida.",
    );
  });
});

describe("fechaLegible", () => {
  it("pasa AAAA-MM-DD a DD/MM/AAAA", () => {
    expect(fechaLegible("2026-11-01")).toBe("01/11/2026");
  });
});
