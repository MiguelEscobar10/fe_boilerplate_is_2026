import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enlacesPara } from "@/lib/navegacion";
import { MenuNavegacion } from "../menu-navegacion";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const etiquetas = (rol: Parameters<typeof enlacesPara>[0]) =>
  enlacesPara(rol).map((e) => e.etiqueta);

describe("enlacesPara", () => {
  it("al arrendador le muestra sus pantallas y no las de otros roles", () => {
    expect(etiquetas("ARRENDADOR")).toEqual([
      "Inicio",
      "Buscar equipos y espacios",
      "Publicar",
      "Solicitudes",
      "Ingresos",
      "Ocupación",
    ]);
  });

  it("al arrendatario le muestra la verificación de identidad", () => {
    expect(etiquetas("ARRENDATARIO")).toEqual([
      "Inicio",
      "Buscar equipos y espacios",
      "Verificar identidad",
    ]);
  });

  it("al revisor le muestra solo la cola de revisión además de lo común", () => {
    expect(etiquetas("REVISOR")).toEqual([
      "Inicio",
      "Buscar equipos y espacios",
      "Revisar verificaciones",
    ]);
  });
});

describe("MenuNavegacion", () => {
  beforeEach(() => {
    pathname = "/";
  });

  it("empieza cerrado y se abre con el botón", () => {
    render(<MenuNavegacion enlaces={enlacesPara("REVISOR")} />);
    const boton = screen.getByRole("button", { name: "Abrir menú" });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(boton);

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("link", { name: "Revisar verificaciones" }),
    ).toHaveAttribute("href", "/verificacion/revision");
  });

  it("marca la página actual", () => {
    pathname = "/ingresos";
    render(<MenuNavegacion enlaces={enlacesPara("ARRENDADOR")} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("link", { name: "Ingresos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("se cierra con Escape", () => {
    render(<MenuNavegacion enlaces={enlacesPara("ARRENDATARIO")} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("MenuNavegacion al elegir una ruta", () => {
  it("se cierra al tocar un enlace", () => {
    render(<MenuNavegacion enlaces={enlacesPara("ARRENDATARIO")} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.click(screen.getByRole("link", { name: "Verificar identidad" }));
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
