# Solicitudes de reserva (Módulo 3)

## FE-04.1. Panel de solicitudes del arrendador (MP4-54)

El arrendador ve las solicitudes de reserva de sus publicaciones y las aprueba
o rechaza (H04). Consume los endpoints de BE-04.1
(`docs/modulos/reservas.md` en el backend).

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/arrendador/solicitudes` | `ARRENDADOR` | Tabla de solicitudes con filtro por estado, paginación y el detalle para decidir. Otro rol ve "Acceso restringido". |

- Acepta `?estado=PENDIENTE&page=2` en la URL, como en el wireframe. Al cambiar
  el filtro o la página se actualiza la URL, así se puede recargar o compartir.
- En el inicio, una cuenta de arrendador tiene el botón "Mis solicitudes", que
  abre directo las `PENDIENTE`.

### Componentes (`components/solicitudes/`)

- `PanelSolicitudes`: filtro, carga, errores, paginación y cuál solicitud está
  abierta.
- `TablaSolicitudes`: arrendatario, bien, fechas, costo estimado y estado
  (H04, criterio 1). Las `PENDIENTE` tienen "Aprobar" y "Rechazar"; las demás,
  "Ver".
- `DetalleSolicitud`: los datos de la solicitud, la fecha de decisión y el
  motivo si los hay, y los botones para decidir.
- `ConfirmacionDecision`: el paso de confirmar. Al aprobar: "¿Aprobar esta
  solicitud? Las fechas quedarán ocupadas." Al rechazar: el campo "Motivo de
  rechazo (opcional)" con contador de 500 caracteres.
- `EstadoReservaBadge`: el estado como etiqueta de color.

Los datos van por `lib/solicitudes/` (`tipos.ts`, `cliente.ts`, `formato.ts`)
y por dos route handlers que reenvían al backend con el token de la cookie:

| Route handler | Backend |
|---|---|
| `GET /api/arrendador/solicitudes` | `GET /arrendador/solicitudes`. Solo pasan `estado`, `page` y `limit`. |
| `PATCH /api/reservas/{id}/decision` | `PATCH /reservas/{id}/decision`. Solo pasan `decision` y `motivo`; un cuerpo que no es JSON es 400 sin llamar al backend. |

### Estados

| Situación | Qué ve el arrendador |
|---|---|
| Cargando | "Cargando solicitudes..." |
| Sin solicitudes | "Aún no tienes solicitudes" (H04, criterio 1), o "No tienes solicitudes en estado X." con un filtro. |
| Error al cargar | El aviso y "Reintentar". Sin conexión o con el backend caído (502) dice "Revisa tu conexión." |
| Enviando la decisión | El botón dice "Enviando..." y los dos botones quedan bloqueados. Un segundo clic no manda otra petición. |
| 200 | "Solicitud aprobada/rechazada. Avisamos al arrendatario." La fila se actualiza con lo que devolvió el backend, sin recargar la lista. |
| 409 | "La solicitud ya fue atendida o el período dejó de estar disponible." y debajo el texto del backend (p. ej. "Conflicto de disponibilidad: ya confirmaste otra reserva en esas fechas.", H04, criterio 9). La lista se recarga para mostrar el estado real. |
| 403 | "Esta solicitud no se puede modificar." (H04, criterio 5) |
| 404 | "Esta solicitud ya no existe." y la lista se recarga. |
| 400 | El mensaje del backend. |
| Sesión vencida | Va al login. |

### Decisiones

- **El detalle está en la misma página, no en `/arrendador/solicitudes/{id}`**
  como en el wireframe. El backend no tiene todavía un `GET` de una reserva
  (es de BE-03.1), y la fila ya trae todo lo que muestra el detalle.
- **Las fechas se muestran en hora de El Salvador**, aunque el backend
  responde en UTC: una reserva de 09:00 a 12:00 se ve así y no como 15:00 a
  18:00.
- **Después de aprobar, la fila se queda a la vista** aunque ya no cumpla el
  filtro `PENDIENTE`, para que se vea el resultado. Al cambiar de filtro o de
  página, o con "Actualizar", sale.
- **Las otras solicitudes que se cruzan siguen con "Aprobar"** (H04, criterio
  7): siguen `PENDIENTE` y, si se intenta, el backend responde 409 y se
  muestra el aviso. No se esconden porque la pantalla no sabe si se cruzan;
  eso lo decide el backend.
- **El motivo se manda recortado y solo si tiene texto.** El `textarea` no deja
  escribir más de 500 caracteres.
- **`arrendatarioCalificado`** está en el tipo como opcional: lo agrega BE-18.1
  (#44 del backend) para FE-18.1. Esta pantalla no lo usa.

### Cómo lo probé

- `npm test`: 93 pruebas, 39 nuevas: el formato de fechas, los dos route
  handlers y el panel (carga, filtro y URL, paginación de 12, errores,
  sesión vencida, aprobar, cancelar, rechazar con y sin motivo, límite de 500,
  doble clic, 409 de los dos tipos, 403, 400 y sin conexión).
- `npm run lint` y `npm run build` sin errores.
- Recorrido en Chrome headless contra el backend de `main` con una cuenta de
  arrendador y cuatro solicitudes:
  - Desde el inicio, "Mis solicitudes" abre las `PENDIENTE`.
  - Aprobar la de 09:00 a 12:00 la deja `CONFIRMADA`.
  - Aprobar después otra que se cruza (10:00 a 11:00) muestra el aviso del 409
    con "Conflicto de disponibilidad: ya confirmaste otra reserva en esas
    fechas." y la deja `PENDIENTE`.
  - Rechazarla con motivo la deja `RECHAZADA` con el motivo en el detalle.
  - "Todas" muestra las cuatro y un estado sin solicitudes muestra el texto
    vacío.
  - A 375 px la página no se desplaza a lo ancho; la tabla se desplaza dentro
    de su caja.
