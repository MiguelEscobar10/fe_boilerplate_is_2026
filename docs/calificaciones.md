# Reseñas y calificaciones (Módulo 6)

## FE-18.1. Formulario para calificar al arrendatario (MP4-95)

El arrendador califica al arrendatario de una reserva `COMPLETADA` de uno de
sus bienes (H18): de 1 a 5 estrellas y un comentario opcional. Consume
`POST /reservas/{id}/calificacion-arrendatario` de BE-18.1.

### Dónde está

En el mismo panel de FE-04.1, `/arrendador/solicitudes?estado=COMPLETADA`. El
wireframe lo dibuja en `/arrendador/reservas?estado=COMPLETADA`, pero es la
misma lista: el backend no tiene otra ruta de reservas del arrendador y el
panel ya filtra por estado.

- En las `COMPLETADA` sin calificar, la fila tiene "Calificar al arrendatario".
- En las ya calificadas, "Ya calificado ✓" en lugar del botón.
- El dato sale de `arrendatarioCalificado`, que agrega BE-18.1 a "Mis
  solicitudes". Si el backend todavía no lo manda, se ofrece la acción en todas
  las `COMPLETADA` y el 409 avisa si ya estaba calificada.

### Componentes (`components/calificaciones/`)

- `FormularioCalificacionArrendatario`: el formulario, con el bien y el período
  de la reserva arriba.
- `SelectorEstrellas`: cinco estrellas. Por dentro son radios, así se eligen
  con el mouse o con las flechas del teclado, y el lector de pantalla dice
  "4 estrellas".
- `ContadorComentario`: `0/500`.

Las reglas están en `lib/calificaciones/reglas.ts` (las mismas del backend) y
la llamada en `lib/calificaciones/cliente.ts`, que pasa por el route handler
`POST /api/reservas/{id}/calificacion-arrendatario` (solo reenvía `puntaje` y
`comentario`).

### Estados

| Situación | Qué ve el arrendador |
|---|---|
| Sin estrellas al enviar | "Elige de 1 a 5 estrellas." y no se envía nada (H18, criterio 5). |
| Comentario | Contador `n/500`; el campo no deja escribir más. |
| Enviando | "Enviando..." y el botón bloqueado; un segundo clic no manda otra petición. |
| 201 | "Calificación guardada." y la fila pasa a "Ya calificado ✓". |
| 409 | "Esta reserva ya fue calificada." (H18, criterio 3) y la fila pasa a "Ya calificado ✓". |
| 422 | "Solo puedes calificar al arrendatario de una reserva COMPLETADA." y la lista se recarga. |
| 404 | "Esta reserva ya no existe." y la lista se recarga. |
| 400 | El mensaje del backend. |
| Sin conexión | "No se pudo enviar la calificación. Revisa tu conexión." y se puede volver a intentar. |

### Cómo lo probé

- `npm test`: 121 pruebas, 28 nuevas: las reglas, el route handler y el
  formulario dentro del panel (dónde aparece la acción, enviar con y sin
  comentario, sin estrellas, teclado, límite de 500, doble clic, 409, 422,
  400, sin conexión y cancelar).
- `npm run lint` y `npm run build` sin errores.
- Recorrido en Chrome contra el backend de la rama de BE-18.1 con dos reservas
  `COMPLETADA`, una ya calificada: la calificada muestra "Ya calificado ✓";
  enviar sin estrellas avisa; con 5 estrellas y comentario se guarda y la fila
  cambia; al recargar sigue calificada. A 375 px la página no se desplaza a lo
  ancho.

## FE-17.1. Formulario de calificación del bien y del arrendador (MP4-91)

Historia H17. En el detalle de una reserva COMPLETADA (`/reservas/{id}`) el
arrendatario ve una sección «Calificación». Solo la ve el `ARRENDATARIO`.
Consume BE-17.1 (PR #71 del backend).

### Componentes y archivos

- `SeccionCalificacion` (`components/calificaciones/seccion-calificacion.tsx`):
  al abrirse consulta si la reserva ya tiene calificación. Si no, ofrece
  «Calificar»; si ya la tiene, muestra lo que se guardó y no ofrece la acción.
- `FormularioCalificacion`: dos escalas de estrellas (bien y arrendador) y un
  comentario opcional.
- `SelectorEstrellas` y `ContadorComentario`: los de FE-18.1. El selector
  recibe ahora la leyenda por prop (`etiqueta`); por defecto sigue siendo la
  del arrendatario.
- `lib/calificaciones/cliente-bien.ts`: `calificarBienYArrendador` (POST) y
  `consultarCalificacionPropia` (GET), con los errores de FE-18.1.
- `validarCalificacionBien` en `lib/calificaciones/reglas.ts`.
- Route handler `app/api/reservas/{id}/calificacion` (POST y GET): el POST
  reenvía solo `puntajeBien`, `puntajeArrendador` y `comentario`.

### Qué se envía y qué se muestra

`POST /reservas/{id}/calificacion` con
`{ puntajeBien, puntajeArrendador, comentario? }`. El comentario va recortado y
no se envía si queda vacío. Antes de enviar se valida: las dos escalas son
obligatorias (1 a 5) y el comentario no pasa de 500 caracteres (el campo no deja
escribir más y hay un contador `n/500`).

| Respuesta | Qué se ve |
|---|---|
| 201 | Se vuelve a consultar y se muestra la calificación guardada; «Calificar» desaparece. |
| 409 `RESERVA_YA_CALIFICADA` | «Ya calificaste esta reserva.» y la sección pasa a calificada. |
| 422 `RESERVA_NO_COMPLETADA` | «Solo puedes calificar una reserva que ya está COMPLETADA.» Sin reintento. |
| 404 | «Esta reserva ya no está disponible.» |
| Red, 5xx | Mensaje de conexión o de error; el formulario sigue abierto para reintentar. |
| 401 | Lleva al login. |

El botón de envío se deshabilita mientras se procesa y una referencia corta un
segundo envío que llegue antes de que React actualice el estado.

### Notas

- La ficha habla de «Mis reservas»: no existe ese listado, así que la acción
  vive en el detalle de la reserva (la pantalla de FE-03.1).
- Saber si ya calificó usa `GET /reservas/{id}/calificacion`, un endpoint que se
  agregó en BE-17.1 para esto (404 `CALIFICACION_NO_REGISTRADA` si no hay).
- Apilado sobre FE-06.1 (#24) y FE-03.1 (#23), que crean y modifican esa página.

### Pruebas

`components/calificaciones/__tests__/calificacion-bien.test.tsx` (acción solo
sin calificar, dos escalas, validación sin llamar al backend, límite del
comentario, envío y desaparición de la acción, 409, 422, red, consulta con
404/error/401), `lib/calificaciones/__tests__/reglas-bien.test.ts` y
`app/api/reservas/__tests__/calificacion.route.test.ts` (campos reenviados,
cuerpos inválidos, 409/422, GET, sin sesión).
