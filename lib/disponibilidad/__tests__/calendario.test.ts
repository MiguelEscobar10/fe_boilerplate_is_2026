import { describe, expect, it } from "vitest";
import { estadoDelDia, semanasDelMes } from "../calendario";
import {
  aIsoLocal,
  diaLocal,
  hoyLocal,
  limitesDelMes,
  nombreDelMes,
  sumarDias,
  sumarMeses,
} from "../fechas";
import type { PeriodoOcupado } from "../tipos";

const reserva = (inicio: string, fin: string): PeriodoOcupado => ({ inicio, fin, origen: "RESERVA" });
const bloqueo = (inicio: string, fin: string): PeriodoOcupado => ({ inicio, fin, origen: "BLOQUEO" });

describe("fechas en hora de El Salvador", () => {
  it("hoy cambia de día a las 00:00 locales (06:00 UTC)", () => {
    expect(hoyLocal(new Date("2026-11-17T05:59:00Z"))).toBe("2026-11-16");
    expect(hoyLocal(new Date("2026-11-17T06:00:00Z"))).toBe("2026-11-17");
  });

  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("convierte días a la API y de vuelta", () => {
    expect(aIsoLocal("2026-11-20")).toBe("2026-11-20T00:00:00-06:00");
    expect(diaLocal("2026-11-20T00:00:00-06:00")).toBe("2026-11-20");
    expect(diaLocal("2026-12-01T03:00:00.000Z")).toBe("2026-11-30");
  });

  it("límites, nombre y cambio de mes", () => {
    expect(limitesDelMes("2026-02")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(limitesDelMes("2028-02").hasta).toBe("2028-02-29");
    expect(nombreDelMes("2026-11")).toBe("noviembre de 2026");
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
  });
});

describe("estadoDelDia", () => {
  const hoy = "2026-11-17";

  it("un día anterior a hoy es pasado, aunque esté ocupado", () => {
    expect(estadoDelDia("2026-11-16", [bloqueo("2026-11-10T00:00:00-06:00", "2026-11-30T00:00:00-06:00")], hoy)).toBe("pasado");
  });

  it("hoy y los días sin nada están libres", () => {
    expect(estadoDelDia(hoy, [], hoy)).toBe("libre");
  });

  it("un período de unas horas ocupa ese día", () => {
    const ocupados = [reserva("2026-11-20T09:00:00-06:00", "2026-11-20T12:00:00-06:00")];
    expect(estadoDelDia("2026-11-20", ocupados, hoy)).toBe("reserva");
    expect(estadoDelDia("2026-11-21", ocupados, hoy)).toBe("libre");
  });

  it("el fin no está incluido: un bloqueo hasta el 22 a las 00:00 deja libre el 22", () => {
    const ocupados = [bloqueo("2026-11-20T00:00:00-06:00", "2026-11-22T00:00:00-06:00")];
    expect(estadoDelDia("2026-11-20", ocupados, hoy)).toBe("bloqueo");
    expect(estadoDelDia("2026-11-21", ocupados, hoy)).toBe("bloqueo");
    expect(estadoDelDia("2026-11-22", ocupados, hoy)).toBe("libre");
  });

  it("una reserva gana sobre un bloqueo el mismo día", () => {
    const ocupados = [
      bloqueo("2026-11-20T00:00:00-06:00", "2026-11-21T00:00:00-06:00"),
      reserva("2026-11-20T09:00:00-06:00", "2026-11-20T12:00:00-06:00"),
    ];
    expect(estadoDelDia("2026-11-20", ocupados, hoy)).toBe("reserva");
  });

  it("compara instantes, no texto: un período en UTC cae en su día local", () => {
    // 21:00 del 20 en El Salvador = 03:00 UTC del 21.
    const ocupados = [reserva("2026-11-21T03:00:00Z", "2026-11-21T05:00:00Z")];
    expect(estadoDelDia("2026-11-20", ocupados, hoy)).toBe("reserva");
    expect(estadoDelDia("2026-11-21", ocupados, hoy)).toBe("libre");
  });
});

describe("semanasDelMes", () => {
  it("noviembre de 2026 empieza en domingo: seis huecos antes del 1", () => {
    const semanas = semanasDelMes("2026-11", [], "2026-11-01");
    expect(semanas[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(semanas[0][6]?.dia).toBe("2026-11-01");
    expect(semanas.flat().filter(Boolean)).toHaveLength(30);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
  });
});
