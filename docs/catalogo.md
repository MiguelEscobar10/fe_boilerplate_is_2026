# Catálogo: búsqueda y filtros (Módulo 2)

## FE-02.1. Barra de búsqueda y listado del catálogo (MP4-42)

Cualquier usuario con sesión busca equipos y espacios por palabra clave y
recorre los resultados de 12 en 12 (H02). Consume `GET /publicaciones` de
BE-02.1 (`docs/modulos/catalogo.md` en el backend).

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/publicaciones` | Con sesión | Barra de búsqueda, tarjetas de las publicaciones activas y paginación. |

- Acepta `?buscar=taladro&page=2` en la URL. Al buscar o cambiar de página se
  actualiza la URL, así se puede recargar o compartir.
- El inicio tiene el botón "Buscar equipos y espacios" para todos los roles.
- Cada tarjeta enlaza al detalle, `/publicaciones/{id}`.

### Componentes (`components/catalogo/`)

- `ListadoCatalogo`: la consulta (búsqueda y página), la carga, los estados y
  la URL.
- `BarraBusqueda`: el campo y los botones "Buscar" y "Borrar búsqueda". Busca
  al enviar (botón o Enter), no en cada tecla. Recorta los espacios y limita a
  100 caracteres, que es lo que acepta el backend.
- `TarjetaPublicacion`: fotografía principal, tipo, nombre, ubicación y tarifa
  (`$15.50 por día`). Sin foto muestra "Sin fotografía".
- `Paginacion`: "Anterior · Página 2 de 5 · Siguiente". No aparece si todo
  cabe en una página.

### Estados

| Estado | Qué se ve |
|---|---|
| Cargando | "Cargando publicaciones..." |
| Resultados | El total, las tarjetas y la paginación. |
| Vacío | "No encontramos publicaciones para «texto»..." y el botón "Ver todas las publicaciones". La barra sigue disponible para cambiar la búsqueda. Sin búsqueda: "Todavía no hay publicaciones disponibles." |
| Error | El mensaje y "Reintentar", que repite la misma consulta. En fallas de red (sin conexión o 502 a 504) pide revisar la conexión. |

Con un 401 se va a `/login`, como en las demás pantallas.

### Datos

`lib/catalogo/` (`tipos.ts`, `cliente.ts`, `formato.ts`) y un route handler:

| Route handler | Backend |
|---|---|
| `GET /api/publicaciones` | `GET /publicaciones`. Solo pasan `buscar`, `page` y `limit`. |

### Decisiones

- **La foto se pide a nuestra ruta.** El backend da `imagenUrl` como
  `/api/v1/publicaciones/{id}/imagenes/0`, relativa a la API. `rutaDeImagen`
  la convierte en `/publicaciones/{id}/imagenes/0`, la ruta de FE-01.1 que
  reenvía la foto, porque `API_URL` puede ser interna.
- **La ruta es `/publicaciones`**, junto al detalle y al formulario de
  publicar, y pide sesión como el resto de la aplicación (`proxy.ts`).
- **Estado local**, sin librería, según `docs/decisiones/manejo-de-estado.md`.

### Pruebas

`components/catalogo/__tests__/listado-catalogo.test.tsx` (14 pruebas): carga
y datos de la tarjeta, publicación sin foto, consulta inicial y desde la URL,
buscar con botón y con Enter, borrar la búsqueda, estado vacío, paginación,
falla de red con reintento, 502, otro error y 401.

## FE-11.1. Panel de filtros del catálogo (MP4-46)

Encima del listado, el usuario filtra por tipo, ubicación, rango de precios y
fechas disponibles (H11). Los filtros se combinan entre sí y con la búsqueda.
Consume los parámetros de BE-11.1 sobre el mismo `GET /publicaciones`.

### Pantalla

Es la misma, `/publicaciones`. Acepta además
`?tipo=ESPACIO&ubicacion=San Salvador&precioMin=5&precioMax=30&fechaInicio=2026-12-01&fechaFin=2026-12-03`.
Al aplicar o quitar filtros se actualiza la URL y se vuelve a la página 1.

### Componentes (`components/catalogo/`)

- `FiltrosCatalogo`: el formulario con tipo, ubicación, precio mínimo y máximo
  y las fechas, y el botón "Aplicar filtros". Mientras hay una consulta en
  curso el botón dice "Aplicando..." y está deshabilitado.
- `SelectorRangoFechas`: "Fecha de inicio" y "Fecha de fin". No deja elegir
  días anteriores a hoy.
- `FiltrosActivos`: una etiqueta por cada filtro aplicado, con su botón para
  quitarlo, y "Limpiar filtros".

### Validación antes de enviar

Las reglas están en `lib/catalogo/filtros.ts` (`validarFiltros`) y son las
mismas de BE-11.1:

| Regla | Mensaje |
|---|---|
| Precio que no es un número de 0 en adelante con hasta dos decimales | "El precio mínimo (o máximo) debe ser un número de 0 en adelante, con hasta dos decimales." |
| Precio mínimo mayor que el máximo | "El precio mínimo no puede ser mayor que el máximo." |
| Solo una de las dos fechas | "Para filtrar por fechas elige la fecha de inicio y la de fin." |
| Fecha de inicio anterior a hoy (día de El Salvador) | "La fecha de inicio no puede estar en el pasado." |
| Fecha de fin anterior a la de inicio | "La fecha de fin no puede ser anterior a la de inicio." |

Con un rango inválido el error aparece en el panel y **no se consulta**: los
resultados, los filtros activos y la URL quedan como estaban.

### Estados

Los de FE-02.1, con dos cambios en el vacío:

- Con filtros: "Ninguna publicación cumple estos filtros..." y el botón
  "Limpiar filtros".
- Con búsqueda y filtros: el mensaje nombra las dos cosas y están los dos
  botones, "Limpiar filtros" y "Ver todas las publicaciones".

### Decisiones

- **Los filtros se aplican con el botón**, no al cambiar cada campo: así un
  rango a medio escribir no dispara consultas ni errores.
- **Los filtros de la URL que no sirven se ignoran** (`leerFiltros`): un tipo
  que no existe, un precio mal escrito, un rango al revés o unas fechas
  pasadas. Un enlace viejo con fechas que ya pasaron abre el catálogo sin ese
  filtro en vez de dar error.
- **La fecha de fin puede ser igual a la de inicio** (un solo día). La ficha
  dice "fin posterior al inicio"; el backend acepta el mismo día porque las
  dos fechas van incluidas.
- El route handler `GET /api/publicaciones` ahora deja pasar también `tipo`,
  `ubicacion`, `precioMin`, `precioMax`, `fechaInicio` y `fechaFin`.

### Pruebas

- `lib/catalogo/__tests__/filtros.test.ts` (14 pruebas): las reglas, la
  lectura de la URL y las etiquetas de los filtros activos.
- `components/catalogo/__tests__/filtros-catalogo.test.tsx` (13 pruebas):
  aplicar, filtros desde la URL, botón al cargar, cada rango inválido sin
  cambiar los resultados, corregir, quitar un filtro, limpiar y los dos
  estados vacíos.
