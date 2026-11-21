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
- `DetallePublicacionCompleto` (FE-12.1, abajo): muestra lo que devuelve
  `GET /publicaciones/{id}`.

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

## FE-12.1. Vista de detalle completo (MP4-38)

El arrendatario ve todo lo que necesita antes de reservar (H12): fotos,
descripción, ubicación, tarifa con su unidad, depósito, condiciones y los
promedios de calificaciones. Consume `GET /publicaciones/{id}` de BE-12.1.

### Pantalla

Es la misma ruta, `/publicaciones/{id}`. Se llega desde las tarjetas del
catálogo (FE-02.1) y tiene el enlace "Volver al catálogo".

- **Publicación desactivada o inexistente** (404 `PUBLICACION_NO_DISPONIBLE`):
  muestra "Publicación no disponible" y el botón "Volver al catálogo", en vez
  de la página 404 genérica.
- Debajo del detalle siguen la disponibilidad con el formulario de solicitud
  (FE-03.1), "Bloquear fechas" para el dueño (FE-14.1) y "Contactar al
  arrendador" (FE-15.1).

### Componentes (`components/publicaciones/`)

- `DetallePublicacionCompleto`: arma la vista. Reemplaza a `DetallePublicacion`.
- `GaleriaFotos`: una foto grande y las demás como miniaturas para elegir. Con
  una sola foto no hay miniaturas; sin fotos dice "Sin fotografías".
- `PromedioCalificacion`: "★ 4.5 de 5 (6 calificaciones)" para el bien y
  "★ 4.8 de 5" para el arrendador, o "Sin calificaciones".
- `BloqueTarifaDeposito`: "$15.00 por hora" y el depósito, o "No pide
  depósito".
- `BloqueCondiciones`: las condiciones de uso y el depósito.

### Condiciones y depósito en el formulario de solicitud

`FormularioSolicitud` (FE-03.1) recibe `condiciones` y muestra
`BloqueCondiciones` justo antes del botón "Solicitar reserva", para que se
lean antes de enviar (H12, criterio 2).

### Decisiones

- **El arrendador puede tener promedio aunque la publicación no tenga
  calificaciones**, porque su promedio junta todas sus publicaciones. En ese
  caso el bien dice "Sin calificaciones" y el arrendador muestra su promedio.
- **Los campos nuevos del tipo `Publicacion` son opcionales**
  (`promedioBien`, `promedioArrendador`, `totalCalificaciones`,
  `requiereVerificacion`). Si el backend todavía no los envía, la vista
  muestra "Sin calificaciones" en vez de fallar.
- **La tarifa y el depósito se leen de `tarifaMonto`, `tarifaUnidad` y
  `depositoMonto`**, que el backend conserva, así el formulario de solicitud y
  el detalle usan el mismo dato.
- **`requiereVerificacion` queda en el tipo pero no se muestra aquí**: la
  insignia y el interruptor son de FE-19.1 (Ricardo), que ya tiene los
  componentes.

### Pruebas

`components/publicaciones/__tests__/detalle-completo.test.tsx` (10 pruebas):
todos los datos del detalle, la galería, sin fotos, sin calificaciones, sin
descripción ni condiciones ni depósito, promedio solo del arrendador, y el
bloque de condiciones dentro del formulario, antes del botón.
