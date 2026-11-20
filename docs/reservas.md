# Reservas (Módulo 3)

## FE-03.1. Formulario de solicitud y resumen de reserva (MP4-50)

Historia H03. El arrendatario elige un período en el detalle de la
publicación, ve el costo estimado y el depósito por separado y envía la
solicitud. Backend: BE-03.1 (MP4-49, `docs/modulos/reservas.md` del backend).

### Pantallas

| Ruta | Quién | Qué hace |
|---|---|---|
| `/publicaciones/{id}` | `ARRENDATARIO` | Debajo de la disponibilidad está el formulario de solicitud. El arrendador y el resto de roles ven solo el calendario. |
| `/reservas/{id}` | `ARRENDATARIO`, `ARRENDADOR` | Detalle de una reserva: estado, período, costo, depósito y motivo del rechazo. «Pagar reserva» solo para el arrendatario con la reserva CONFIRMADA. Una reserva ajena es un 404 (lo decide el backend). |

### Componentes

- `FormularioSolicitud` (`components/reservas/formulario-solicitud.tsx`):
  estado, validación previa y envío.
- `SelectorPeriodo`: el calendario de disponibilidad de FE-13.1
  (`SelectorDisponibilidad`, que no deja elegir días pasados ni ocupados) y, si
  la tarifa es por hora, la hora de inicio y de fin.
- `ResumenReserva`: período, costo y depósito. El depósito va aparte, nunca
  sumado al costo.
- `EstadoReserva`: el estado con su explicación. Una solicitud PENDIENTE dice
  que **todavía no es una reserva confirmada**.

### Qué se envía

`POST /api/reservas` con `{ publicacionId, inicio, fin }`. Las fechas van en ISO
8601 con `-06:00`. **No se envía ningún monto**: el route handler
(`app/api/reservas/route.ts`) descarta cualquier campo que no sea de esos tres,
y el backend calcula el costo con la tarifa de la publicación.

### Cómo se arma el período

- **Tarifa por hora:** del primer día elegido a la hora de inicio, al último a la
  hora de fin (por defecto 09:00–12:00).
- **Día, noche o semana:** días completos, de las 00:00 del primer día a las
  00:00 del día siguiente al último (el fin no está incluido).

El calendario marca un día como ocupado si cualquier reserva confirmada o
bloqueo lo toca, aunque sea una hora. Por eso una reserva por horas no se puede
elegir en un día que ya tiene otra: es una limitación del calendario (FE-13.1);
el backend sí aceptaría una hora libre.

### Costo estimado

`lib/reservas/costo.ts` repite la fórmula del backend para mostrar la
estimación: tarifa × unidades de cobro (HORA en horas, DIA y NOCHE en días de 24
horas, SEMANA en semanas de 7 días; una fracción sube y el mínimo es 1), en
centavos enteros. Es solo una estimación: el costo que vale es el que devuelve
el 201.

### Validación antes de enviar

El botón se queda deshabilitado, con el motivo a la vista, si:

- no hay período elegido o una hora está vacía;
- la hora de fin es igual o anterior a la de inicio;
- el inicio ya pasó (con tarifa por día, empezar hoy ya es el pasado).

El backend vuelve a validar todo.

### Respuestas del backend

| Respuesta | Qué ve la persona |
|---|---|
| 201 | «Enviamos tu solicitud al arrendador», el número de la solicitud, el estado PENDIENTE y el resumen con los importes del backend. Enlace a «Ver mi solicitud». |
| 400 `FECHA_PASADA` | La fecha de inicio ya pasó. |
| 400 | El mensaje del backend (fechas inválidas). |
| 403 | Solo un arrendatario puede solicitar una reserva. |
| 404 | La publicación ya no está disponible. |
| 409 | El período ya no está disponible. **No muestra ninguna confirmación**; se vuelve a cargar el calendario y se limpia la selección. |
| 422 `VERIFICACION_REQUERIDA` | `AvisoVerificacionRequerida` (FE-19.1): el motivo y el enlace a `/verificacion`. |
| Sin conexión | Lo dice y deja reintentar con el mismo período. |

Dos clics seguidos envían una sola solicitud.

### Pruebas

`npm test`: costo y armado del período (`lib/reservas/__tests__`), el route
handler (`app/api/reservas/__tests__/solicitud.route.test.ts`) y el formulario
completo con un backend simulado (`components/reservas/__tests__`).

Además lo probé en el navegador contra el backend de BE-03.1: costo y depósito,
fracción de hora, tarifa por día, hoy con una hora pasada, fin anterior al
inicio, 409 con una reserva confirmada después de elegir, 422, el detalle y el
pago con los importes reales, el 404 de una reserva ajena y 375 px sin desborde.
