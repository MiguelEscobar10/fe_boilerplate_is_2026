import { describe, expect, it } from "vitest";
import { filtrosActivos, hayFiltros, leerFiltros, validarFiltros } from "../filtros";
import { SIN_FILTROS, type FiltrosCatalogo } from "../tipos";

const HOY = "2026-11-20";
const con = (cambios: Partial<FiltrosCatalogo>): FiltrosCatalogo => ({ ...SIN_FILTROS, ...cambios });

describe("validarFiltros", () => {
  it("acepta no tener filtros y cada filtro válido", () => {
    expect(validarFiltros(SIN_FILTROS, HOY)).toBeNull();
    expect(
      validarFiltros(
        con({
          tipo: "ESPACIO",
          ubicacion: "San Salvador",
          precioMin: "5",
          precioMax: "30.50",
          fechaInicio: HOY,
          fechaFin: HOY,
        }),
        HOY,
      ),
    ).toBeNull();
    expect(validarFiltros(con({ precioMin: "10", precioMax: "10" }), HOY)).toBeNull();
  });

  it.each([
    [{ precioMin: "30", precioMax: "5" }, "El precio mínimo no puede ser mayor que el máximo."],
    [{ precioMin: "-1" }, "El precio mínimo debe ser un número de 0 en adelante, con hasta dos decimales."],
    [{ precioMax: "caro" }, "El precio máximo debe ser un número de 0 en adelante, con hasta dos decimales."],
    [{ precioMax: "1.234" }, "El precio máximo debe ser un número de 0 en adelante, con hasta dos decimales."],
    [{ fechaInicio: "2026-11-25" }, "Para filtrar por fechas elige la fecha de inicio y la de fin."],
    [{ fechaFin: "2026-11-25" }, "Para filtrar por fechas elige la fecha de inicio y la de fin."],
    [
      { fechaInicio: "2026-11-19", fechaFin: "2026-11-25" },
      "La fecha de inicio no puede estar en el pasado.",
    ],
    [
      { fechaInicio: "2026-11-25", fechaFin: "2026-11-24" },
      "La fecha de fin no puede ser anterior a la de inicio.",
    ],
  ])("rechaza %o", (cambios, mensaje) => {
    expect(validarFiltros(con(cambios), HOY)).toBe(mensaje);
  });
});

describe("leerFiltros", () => {
  it("lee de la URL los filtros válidos", () => {
    expect(
      leerFiltros(
        {
          tipo: "EQUIPO",
          ubicacion: "  Santa Tecla ",
          precioMin: "5",
          precioMax: "30",
          fechaInicio: "2026-11-21",
          fechaFin: "2026-11-23",
        },
        HOY,
      ),
    ).toEqual({
      tipo: "EQUIPO",
      ubicacion: "Santa Tecla",
      precioMin: "5",
      precioMax: "30",
      fechaInicio: "2026-11-21",
      fechaFin: "2026-11-23",
    });
  });

  it("ignora lo que el backend rechazaría", () => {
    expect(
      leerFiltros(
        {
          tipo: "VEHICULO",
          precioMin: "abc",
          precioMax: ["1", "2"],
          fechaInicio: "21/11/2026",
          fechaFin: "2026-11-23",
        },
        HOY,
      ),
    ).toEqual(SIN_FILTROS);
    expect(leerFiltros({ precioMin: "30", precioMax: "5" }, HOY)).toEqual(SIN_FILTROS);
    expect(leerFiltros({ fechaInicio: "2026-11-01", fechaFin: "2026-11-23" }, HOY)).toEqual(
      SIN_FILTROS,
    );
    expect(leerFiltros({ fechaInicio: "2026-11-25", fechaFin: "2026-11-23" }, HOY)).toEqual(
      SIN_FILTROS,
    );
  });
});

describe("filtrosActivos", () => {
  it("no hay ninguno sin filtros", () => {
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
    expect(filtrosActivos(SIN_FILTROS)).toEqual([]);
  });

  it("describe cada filtro y qué queda al quitarlo", () => {
    const f = con({
      tipo: "ESPACIO",
      ubicacion: "Escalón",
      precioMin: "5",
      precioMax: "30",
      fechaInicio: "2026-12-01",
      fechaFin: "2026-12-03",
    });
    const activos = filtrosActivos(f);

    expect(hayFiltros(f)).toBe(true);
    expect(activos.map((a) => a.etiqueta)).toEqual([
      "Tipo: Espacio",
      "Ubicación: Escalón",
      "Precio: $5 a $30",
      "Disponible: 01/12/2026 a 03/12/2026",
    ]);
    expect(activos[2].sinEl).toEqual({ ...f, precioMin: "", precioMax: "" });
    expect(activos[3].sinEl).toEqual({ ...f, fechaInicio: "", fechaFin: "" });
  });

  it("el precio con un solo extremo dice desde o hasta", () => {
    expect(filtrosActivos(con({ precioMin: "5" }))[0].etiqueta).toBe("Precio: desde $5");
    expect(filtrosActivos(con({ precioMax: "30" }))[0].etiqueta).toBe("Precio: hasta $30");
  });
});
