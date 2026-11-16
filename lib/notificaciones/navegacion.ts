// En su propio módulo para poder simularlo en las pruebas (jsdom no navega).

/**
 * Navegación completa a /login: el route handler ya borró la cookie, y una
 * carga nueva hace que el layout raíz se vuelva a renderizar sin el
 * encabezado. Con router.push el layout raíz no se vuelve a renderizar y el
 * encabezado quedaría visible en /login.
 */
export function irALogin() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- se necesita recargar el layout raíz (ver arriba)
  window.location.assign("/login");
}
