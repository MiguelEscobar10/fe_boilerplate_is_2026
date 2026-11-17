# Publicaciones (Módulo 1)

## FE-01.1. Formulario y vista de publicación (MP4-34)

### Pantallas

| Ruta | Quién | Qué hace |
|---|---|---|
| `/publicaciones/nueva` | `ARRENDADOR` | Formulario para publicar un equipo o espacio. Otro rol ve "Acceso restringido". |
| `/publicaciones/{id}` | Con sesión | Detalle de la publicación. Con `?nueva=1` muestra el aviso de que quedó registrada. |
| `/publicaciones/{id}/imagenes/{orden}` | Con sesión | Reenvía la foto desde el backend (ver abajo). |

Desde el inicio, una cuenta de arrendador tiene el botón "Publicar un equipo o
espacio".

### Componentes

- `FormularioPublicacion`: tipo, nombre, descripción, ubicación, tarifa y
  unidad de cobro, depósito, condiciones y fotos.
- `CargaImagenes`: selector de fotos con vista previa; la primera es la
  portada.
- `DetallePublicacion`: muestra lo que devuelve `GET /publicaciones/{id}`.

### Validación

Las reglas están en un solo lugar, `lib/publicaciones/reglas.ts`, y se usan
dos veces:

1. **En el navegador, antes de enviar.** Si falta algo o no cumple, el error
   sale debajo de cada campo y no se hace ninguna petición.
2. **En la Server Action**, por si alguien se salta el navegador.

Reglas: tipo `EQUIPO` o `ESPACIO`; nombre obligatorio de máximo 100
caracteres; ubicación obligatoria; tarifa mayor que 0 con hasta dos decimales y
su unidad (hora, día, noche o semana); depósito opcional de 0 o más; de 1 a 10
fotos JPG o PNG de máximo 5 MB.

### Envío y estados

La Server Action `crearPublicacion` (`app/actions/publicaciones.ts`) arma un
`FormData` solo con los campos esperados y lo manda a `POST /publicaciones`
con el token de la cookie httpOnly. Estados:

| Estado | Qué ve la persona |
|---|---|
| inicial | El formulario vacío. |
| enviando | El botón dice "Guardando..." y queda deshabilitado (no hay doble envío). |
| éxito (201) | Pasa al detalle de la publicación con el aviso de que quedó registrada. |
| error (400) | El mensaje del backend debajo del campo que corresponde (por ejemplo, un PDF renombrado a `.jpg` sale debajo de las fotos). |
| restringido (401/403) | "Acceso restringido". |

El formulario se envía con `onSubmit` (y no con `action=`) para validar primero
y para que React no lo limpie si el backend devuelve un error: la persona solo
corrige lo que está mal.

### Decisiones

- **Fotos por medio de una ruta propia.** El backend sirve cada foto en
  `/api/v1/publicaciones/{id}/imagenes/{orden}`, pero esa URL (`API_URL`) puede
  ser interna. `app/publicaciones/[id]/imagenes/[orden]/route.ts` la pide al
  backend y la devuelve desde el mismo origen que la página.
- **Límite de subida de 55 MB** en `next.config.ts`. Por defecto las Server
  Actions aceptan 1 MB y el proxy guarda 10 MB; con 10 fotos de 5 MB el envío
  se cortaría.

### Cómo lo probé

Con el backend de la rama de BE-01.1 y un navegador headless:

- Enviar vacío muestra los 6 errores de campos obligatorios sin hacer ningún
  POST.
- Un PDF renombrado a `.jpg` pasa la revisión del navegador, el backend lo
  rechaza y el error sale debajo de las fotos sin borrar lo demás.
- Mientras se envía, Guardar queda deshabilitado.
- Con 201 se ve el detalle con la tarifa `$15.50 por día`, el depósito y las
  dos fotos cargadas.
- Una cuenta de arrendatario ve "Acceso restringido" en `/publicaciones/nueva`.
