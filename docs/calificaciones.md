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
