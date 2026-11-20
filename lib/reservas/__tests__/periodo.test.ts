import { describe, expect, it } from "vitest";
import { armarPeriodo, errorDePeriodo } from "../periodo";

const AHORA = Date.parse("2026-11-17T16:00:00Z"); // 17 nov, 10:00 en El Salvador

describe("armarPeriodo", () => {
  it("tarifa por hora: del primer día a su hora de inicio al último a su hora de fin", () => {
    const p = armarPeriodo("2026-11-18", "2026-11-18", "HORA", "09:00", "12:00");
    expect(p?.inicio).toBe("2026-11-18T09:00:00-06:00");
    expect(p?.fin).toBe("2026-11-18T12:00:00-06:00");
    expect(p!.finMs - p!.inicioMs).toBe(3 * 3_600_000);
  });

  it("tarifa por hora en varios días", () => {
    const p = armarPeriodo("2026-11-18", "2026-11-19", "HORA", "20:00", "08:00");
    expect(p?.inicio).toBe("2026-11-18T20:00:00-06:00");
    expect(p?.fin).toBe("2026-11-19T08:00:00-06:00");
    expect(p!.finMs - p!.inicioMs).toBe(12 * 3_600_000);
  });

  it("las demás tarifas: días completos, con el fin al día siguiente del último", () => {
    const p = armarPeriodo("2026-11-18", "2026-11-19", "DIA", "09:00", "12:00");
    expect(p?.inicio).toBe("2026-11-18T00:00:00-06:00");
    expect(p?.fin).toBe("2026-11-20T00:00:00-06:00");
    expect(p!.finMs - p!.inicioMs).toBe(2 * 86_400_000);
  });

  it("fin de mes y de año", () => {
    expect(armarPeriodo("2026-12-31", "2026-12-31", "NOCHE", "", "")?.fin).toBe(
      "2027-01-01T00:00:00-06:00",
    );
  });

  it("null si falta un día o una hora está mal escrita", () => {
    expect(armarPeriodo(null, null, "HORA", "09:00", "12:00")).toBeNull();
    expect(armarPeriodo("2026-11-18", null, "DIA", "", "")).toBeNull();
    expect(armarPeriodo("2026-11-18", "2026-11-18", "HORA", "", "12:00")).toBeNull();
    expect(armarPeriodo("2026-11-18", "2026-11-18", "HORA", "25:00", "12:00")).toBeNull();
  });
});

describe("errorDePeriodo", () => {
  it("sin errores si empieza después de ahora y termina después de empezar", () => {
    const p = armarPeriodo("2026-11-18", "2026-11-18", "HORA", "09:00", "12:00");
    expect(errorDePeriodo(p, "HORA", AHORA)).toBeNull();
  });

  it("fin igual o anterior al inicio", () => {
    for (const fin of ["09:00", "08:00"]) {
      const p = armarPeriodo("2026-11-18", "2026-11-18", "HORA", "09:00", fin);
      expect(errorDePeriodo(p, "HORA", AHORA)).toMatch(/fin debe ser posterior/);
    }
  });

  it("inicio en el pasado, con el texto según la tarifa", () => {
    const hora = armarPeriodo("2026-11-17", "2026-11-17", "HORA", "09:00", "12:00");
    expect(errorDePeriodo(hora, "HORA", AHORA)).toMatch(/hora de inicio ya pasó/);
    const dia = armarPeriodo("2026-11-17", "2026-11-17", "DIA", "", "");
    expect(errorDePeriodo(dia, "DIA", AHORA)).toMatch(/empezar en el pasado/);
  });

  it("empezar justo ahora no es el pasado", () => {
    const p = armarPeriodo("2026-11-17", "2026-11-17", "HORA", "10:00", "12:00");
    expect(errorDePeriodo(p, "HORA", AHORA)).toBeNull();
  });

  it("sin período pide las horas", () => {
    expect(errorDePeriodo(null, "HORA", AHORA)).toMatch(/horas/);
  });
});
