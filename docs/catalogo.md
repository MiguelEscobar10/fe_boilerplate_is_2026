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
