import type { Rol } from "@/lib/dal";

export type EnlaceNavegacion = {
  href: string;
  etiqueta: string;
};

type Entrada = EnlaceNavegacion & {
  /** Roles que ven el enlace. Sin `roles`, lo ven todos. */
  roles?: Rol[];
};

// Mismas restricciones que cada página declara en <RutaProtegida>. Esconder un
// enlace es solo comodidad: la página y el backend vuelven a revisar el rol.
const ENTRADAS: Entrada[] = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/publicaciones", etiqueta: "Buscar equipos y espacios" },
  { href: "/publicaciones/nueva", etiqueta: "Publicar", roles: ["ARRENDADOR"] },
  {
    href: "/arrendador/solicitudes?estado=PENDIENTE",
    etiqueta: "Solicitudes",
    roles: ["ARRENDADOR"],
  },
  { href: "/ingresos", etiqueta: "Ingresos", roles: ["ARRENDADOR"] },
  { href: "/reportes/ocupacion", etiqueta: "Ocupación", roles: ["ARRENDADOR"] },
  {
    href: "/verificacion",
    etiqueta: "Verificar identidad",
    roles: ["ARRENDATARIO"],
  },
  {
    href: "/verificacion/revision",
    etiqueta: "Revisar verificaciones",
    roles: ["REVISOR"],
  },
];

/** Los enlaces del menú que le corresponden a un rol, en orden. */
export function enlacesPara(rol: Rol): EnlaceNavegacion[] {
  return ENTRADAS.filter((e) => !e.roles || e.roles.includes(rol)).map(
    ({ href, etiqueta }) => ({ href, etiqueta }),
  );
}

/** Si el enlace es la página actual (se compara la ruta, sin la query). */
export function esRutaActual(href: string, pathname: string): boolean {
  return href.split("?")[0] === pathname;
}
