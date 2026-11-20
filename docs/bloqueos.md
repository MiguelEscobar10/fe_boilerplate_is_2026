# Disponibilidad y bloqueos (Módulo 3)

## FE-14.1. Pantalla para bloquear fechas (MP4-62)

El arrendador marca los días en que su bien no está disponible (H14). Consume
`GET /publicaciones/{id}/disponibilidad` (BE-13.1) y
`POST`/`GET /publicaciones/{id}/bloqueos` (BE-14.1).

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/arrendador/publicaciones/{id}/bloqueos` | `ARRENDADOR` dueño | Calendario, formulario y lista de bloqueos. Si la publicación no existe, está desactivada o es de otro, muestra "Publicación no encontrada" (H14, criterio 5). |

En el detalle de una publicación (`/publicaciones/{id}`), su dueño tiene el
botón "Bloquear fechas".

### Componentes

- `components/disponibilidad/CalendarioDisponibilidad`: un mes de lunes a
  domingo con los días libres, ocupados por una reserva `CONFIRMADA` o
  `EN_CURSO`, bloqueados y pasados, con leyenda. Pide la disponibilidad del
  mes que se ve. No deja ir a meses pasados ni elegir días pasados. Está
  pensado para que FE-13.1 lo reutilice en el detalle del bien (H13): sin
  `onElegirDia` es solo de lectura.
- `components/bloqueos/BloqueoFechas`: la pantalla. Los días se eligen
  pulsando el calendario (el primer clic marca Desde y el segundo Hasta) o en
  los campos de fecha.
- `components/bloqueos/FormularioBloqueo`: Desde, Hasta y motivo opcional de
  200 caracteres con contador.
- `components/bloqueos/TablaBloqueos`: los bloqueos con su motivo; "No tienes
  fechas bloqueadas." si no hay.

Las fechas se manejan en `lib/disponibilidad/fechas.ts` (hora de El Salvador,
UTC-6 fijo) y el estado de cada día en `lib/disponibilidad/calendario.ts`.

### Route handlers

| Route handler | Backend |
|---|---|
| `GET /api/publicaciones/{id}/disponibilidad` | Ruta pública: manda el token si hay sesión, pero no lo exige. Solo pasan `desde` y `hasta`. |
| `GET /api/publicaciones/{id}/bloqueos` | Con el token de la cookie. |
| `POST /api/publicaciones/{id}/bloqueos` | Con el token. Solo pasan `inicio`, `fin` y `motivo`. |

### Fechas: días completos

La pantalla trabaja con días: "Desde 22" y "Hasta 24" bloquea el 22, el 23 y
el 24 completos. Se manda `inicio = 2026-12-22T00:00:00-06:00` y
`fin = 2026-12-25T00:00:00-06:00`, porque en el backend el fin no está
incluido. Por eso Desde = Hasta es un bloqueo de un día, y la lista muestra
como Hasta el último día incluido.

### Estados

| Situación | Qué ve el arrendador |
|---|---|
| Sin fechas, Hasta antes de Desde o Desde en el pasado | El error debajo del campo, sin enviar nada (FE-14.1 pide validar antes). |
| Enviando | "Bloqueando..." y el botón deshabilitado; un segundo clic no manda otra petición. |
| 201 | "Bloqueaste del 22 dic 2026 al 24 dic 2026.", el formulario se limpia y el calendario y la lista se recargan. |
| 409 | "El rango incluye una reserva CONFIRMADA." (FE-14.1) y debajo el texto del backend. No se registra nada y el formulario queda como estaba para corregir. |
| 403 | "Acceso restringido: esta publicación no es tuya." |
| 404 | "Publicación no encontrada." |
| 400 | El mensaje del backend. |

### Decisiones

- **El calendario se construye aquí y no en FE-13.1.** FE-14.1 reutiliza el
  calendario de FE-13.1, pero FE-13.1 espera el selector de fechas de FE-03.1.
  Para no quedar bloqueados, `CalendarioDisponibilidad` sale en este PR y
  FE-13.1 lo conecta con el selector de la reserva.
- **Una reserva gana sobre un bloqueo** cuando caen el mismo día: el día se
  pinta como ocupado por reserva.
- **No se pueden bloquear fechas pasadas.** El backend lo permite, pero no
  sirve de nada y el calendario no deja elegirlas.
- **No hay borrar ni editar bloqueos**, porque el backend no los tiene
  (ninguna historia lo pide).

### Cómo lo probé

- `npm test`: 90 pruebas, 36 nuevas: fechas y estado de cada día (pasado,
  libre, reserva, bloqueo, fin no incluido, días en UTC), las semanas del mes,
  los route handlers y la pantalla (calendario, cambio de mes, elegir días,
  bloquear, un día, validaciones, límite de 200, doble clic, 409, 403, 400,
  sin conexión, cancelar y la lista).
- `npm run lint` y `npm run build` sin errores.
- Recorrido en Chrome contra el backend de la rama de BE-14.1: desde el
  detalle del taladro, "Bloquear fechas" abre la pantalla; en diciembre el 12
  sale ocupado por una reserva confirmada; elegir del 22 al 24 con motivo
  bloquea los tres días (el 25 sigue libre) y aparece en la lista; elegir del
  11 al 13 da el aviso del 409; la disponibilidad pública muestra el bloqueo
  sin el motivo; a 375 px no hay scroll horizontal; una publicación que no
  existe muestra "Publicación no encontrada".

## FE-13.1. Calendario de disponibilidad (MP4-58)

El calendario en el detalle de un bien (H13): cualquiera con sesión ve qué
días están libres antes de pedir una reserva.

### Dónde está

En `/publicaciones/{id}`, sección "Disponibilidad":

- **Arrendatario:** `SelectorDisponibilidad`. Elige un período pulsando el
  primer y el último día.
- **Arrendador u otro rol:** el mismo `CalendarioDisponibilidad` de FE-14.1,
  solo de lectura.

### Componentes (`components/disponibilidad/`)

- `CalendarioDisponibilidad` (de FE-14.1). Se le agrega `onDiaNoDisponible`:
  con esa prop, pulsar un día pasado u ocupado no lo elige y avisa. Los días
  pasados quedan `aria-disabled`: el lector de pantalla los anuncia como no
  disponibles, pero se pueden pulsar para ver por qué.
- `LeyendaDisponibilidad`: la leyenda, separada del calendario como pide la
  ficha.
- `SelectorDisponibilidad`: el calendario más la elección del período.

### Reglas al elegir

| Situación | Qué ve el arrendatario |
|---|---|
| Pulsa un día pasado | "No se pueden elegir fechas pasadas." (H13, criterio 3) |
| Pulsa un día ocupado | "Ese día ya tiene una reserva confirmada." o "Ese día no está disponible." (bloqueo) |
| El período incluye días ocupados | "El período elegido incluye días ocupados." y no se acepta. |
| Período de más de 92 días | "Elige un período de 92 días o menos." (el límite del backend) |
| Período válido | "Seleccionado: 15 dic 2026 – 18 dic 2026 (días libres)" |

Antes de aceptar un período se le pregunta al backend por el rango completo,
porque el calendario solo conoce el mes que se ve y el período puede pasar a
otro mes.

Los días con solicitudes `PENDIENTE` se ven libres (H13, criterio 2): el
backend no las manda como ocupadas. La pantalla lo explica en una línea.

### Conexión con la solicitud de reserva (FE-03.1)

`SelectorDisponibilidad` tiene `onPeriodoElegido({ desde, hasta })`, que se
llama con el período elegido (solo días libres) o con `null` al limpiar. Es
donde se conecta el `SelectorPeriodo` de FE-03.1 cuando exista: la página del
detalle todavía no lo usa porque la solicitud de reserva no está hecha.

### Cómo lo probé

- `npm test`: 101 pruebas, 11 nuevas: los estados del calendario (libre,
  ocupado, bloqueado, pasado, pendiente como libre, cargando, error y
  reintento, solo lectura) y la elección (día pasado, día ocupado, período
  libre, período con días ocupados, período que pasa a otro mes, empezar de
  nuevo, limpiar y error de red).
- `npm run lint` y `npm run build` sin errores.
- Recorrido en Chrome contra el backend de `main` como arrendatario: el
  arrendatario no ve "Bloquear fechas"; pulsar el 10 de noviembre avisa que
  es pasado; en diciembre el 12 sale ocupado por reserva y del 22 al 24
  bloqueados; elegir del 10 al 14 avisa que incluye días ocupados; del 15 al
  18 queda seleccionado; a 375 px no hay scroll horizontal.

