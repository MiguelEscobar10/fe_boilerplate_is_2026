import { describe, expect, it } from "vitest";
import { costoEstimado, unidadesDeCobro } from "../costo";

const T0 = Date.parse("2026-11-12T15:00:00Z");
const H = 3_600_000;
const D = 24 * H;

describe("unidadesDeCobro", () => {
  it("HORA: duración en horas, con la fracción hacia arriba y mínimo 1", () => {
    expect(unidadesDeCobro(T0, T0 + 3 * H, "HORA")).toBe(3);
    expect(unidadesDeCobro(T0, T0 + 3 * H + 1, "HORA")).toBe(4);
    expect(unidadesDeCobro(T0, T0 + 1, "HORA")).toBe(1);
  });

  it("DIA y NOCHE: días de 24 horas", () => {
    expect(unidadesDeCobro(T0, T0 + 2 * D, "DIA")).toBe(2);
    expect(unidadesDeCobro(T0, T0 + 2 * D + H, "NOCHE")).toBe(3);
  });

  it("SEMANA: semanas de 7 días", () => {
    expect(unidadesDeCobro(T0, T0 + 7 * D, "SEMANA")).toBe(1);
    expect(unidadesDeCobro(T0, T0 + 7 * D + 1, "SEMANA")).toBe(2);
  });
});

describe("costoEstimado", () => {
  it("3 horas × 15.00 = 45.00 (ejemplo de la ficha)", () => {
    expect(costoEstimado("15.00", "HORA", T0, T0 + 3 * H)).toBe("45.00");
  });

  it("2 h 10 min × 15.00 se cobra como 3 horas", () => {
    expect(costoEstimado("15.00", "HORA", T0, T0 + 2 * H + 10 * 60_000)).toBe("45.00");
  });

  it("siempre con dos decimales y sin errores de coma flotante", () => {
    expect(costoEstimado("15.1", "HORA", T0, T0 + 3 * H)).toBe("45.30");
    expect(costoEstimado("0.10", "HORA", T0, T0 + 3 * H)).toBe("0.30");
    expect(costoEstimado("25", "DIA", T0, T0 + 2 * D)).toBe("50.00");
  });
});
