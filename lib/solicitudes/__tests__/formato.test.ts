import { describe, expect, it } from "vitest";
import {
  formatearDia,
  formatearHora,
  formatearMonto,
  formatearPeriodo,
} from "../formato";

describe("formato de solicitudes (hora de El Salvador)", () => {
  it("muestra el día y la hora locales de un instante UTC", () => {
    // 15:00 UTC son las 09:00 en El Salvador (UTC-6).
    expect(formatearDia("2026-11-12T15:00:00.000Z")).toBe("12 nov 2026");
    expect(formatearHora("2026-11-12T15:00:00.000Z")).toBe("09:00");
  });

  it("una madrugada en UTC cae en el día anterior local", () => {
    expect(formatearDia("2026-12-01T03:30:00.000Z")).toBe("30 nov 2026");
    expect(formatearHora("2026-12-01T03:30:00.000Z")).toBe("21:30");
  });

  it("la medianoche local es 00:00", () => {
    expect(formatearHora("2026-11-20T06:00:00.000Z")).toBe("00:00");
  });

  it("período del mismo día: el día una sola vez", () => {
    expect(
      formatearPeriodo("2026-11-12T15:00:00.000Z", "2026-11-12T18:00:00.000Z"),
    ).toBe("12 nov 2026, 09:00 – 12:00");
  });

  it("período de varios días: los dos días", () => {
    expect(
      formatearPeriodo("2026-11-20T06:00:00.000Z", "2026-11-21T06:00:00.000Z"),
    ).toBe("20 nov 2026, 00:00 – 21 nov 2026, 00:00");
  });

  it("monto con signo de dólar", () => {
    expect(formatearMonto("45.00")).toBe("$45.00");
  });
});
