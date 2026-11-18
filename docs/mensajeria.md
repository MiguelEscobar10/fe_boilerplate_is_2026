# Mensajería

Pantallas de conversación entre arrendatario y arrendador. Backend:
`docs/modulos/mensajeria.md` en el repo del backend (BE-15.1, BE-16.1).

## FE-15.1. Chat antes de reservar (MP4-83)

`BotonPreguntarArrendador` (`components/mensajeria/boton-preguntar-arrendador.tsx`)
en el detalle de la publicación (`app/publicaciones/[id]/page.tsx`). Solo lo
ve un ARRENDATARIO que no es el dueño.

- "Contactar al arrendador" abre o recupera la conversación
  (`POST /api/publicaciones/[id]/conversaciones` → BE-15.1) y muestra el
  historial con la caja, con los mismos `ConversacionChat` y `CajaMensaje` de
  FE-16.1.
- "Enviar" queda deshabilitado con el mensaje vacío o de más de 1000
  caracteres y durante el envío.
- Un 404 (publicación inactiva o que ya no existe) se ve como "Conversación no
  disponible". Un error de red deja "Reintentar", tanto al abrir como al
  cargar el historial.

### Botón temporal

La ficha pone el botón en `DetallePublicacionCompleto` de FE-12.1 (Elias), que
todavía no existe. Para no atrasar H15 va por ahora en el detalle actual
(acordado en MP4-38). Cuando entre FE-12.1 se mueve el componente tal cual y
se quitan estas líneas de `app/publicaciones/[id]/page.tsx`.

### Pruebas

- `components/mensajeria/__tests__/boton-preguntar-arrendador.test.tsx`: no
  llama al backend hasta pulsar, abre y envía, recupera un historial
  existente, Enviar deshabilitado con vacío y 1001, 404 como "Conversación no
  disponible", reintentar tras un error de red y el botón deshabilitado
  mientras abre.
- El route handler está en `app/api/conversaciones/__tests__/route.test.ts`.

Sin el caso del 404 falla 1 prueba.

Recorrido en Chrome contra el backend: el arrendatario pulsa "Contactar al
arrendador", Enviar arranca deshabilitado, el mensaje queda y sigue al
recargar; el dueño de la publicación no ve el botón.

## FE-16.1. Conversación de la reserva (MP4-87)

Ruta: **`/reservas/{id}/conversacion`**, para ARRENDADOR y ARRENDATARIO
(`RutaProtegida`). Es una página propia porque todavía no existe el detalle de
la reserva: cuando exista, ese detalle renderiza `<ConversacionReserva />` y
esta ruta sirve como enlace directo.

### Qué se ve en cada estado de la reserva

| Estado                                                  | Qué muestra                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `CONFIRMADA`, `EN_CURSO`                                | Historial y caja para escribir                                                                               |
| `RECHAZADA`, `CANCELADA`, `COMPLETADA` con mensajes     | Historial y "Conversación cerrada. Puedes leer el historial, pero ya no se pueden enviar mensajes." Sin caja |
| `RECHAZADA`, `CANCELADA`, `COMPLETADA` sin conversación | "Conversación cerrada. Esta reserva no tuvo mensajes."                                                       |
| `PENDIENTE`                                             | "La conversación se habilita cuando la reserva esté CONFIRMADA."                                             |
| Reserva ajena o que no existe                           | "Reserva no encontrada."                                                                                     |

El navegador no decide el estado: lo dice el backend al abrir la conversación
(`POST /reservas/{id}/conversacion` responde `puedeEscribir`, o 409 con
`CONVERSACION_NO_HABILITADA` o `CONVERSACION_CERRADA`). Si la reserva se
cierra mientras la pantalla está abierta, el siguiente envío recibe 409
`CONVERSACION_CERRADA`: la caja desaparece y sale el aviso.

### Componentes

- `components/mensajeria/conversacion-reserva.tsx`: `ConversacionReserva`,
  abre la conversación y elige qué mostrar.
- `components/mensajeria/conversacion-chat.tsx`: `ConversacionChat`, historial
  y caja. Abre en los mensajes más recientes y carga los anteriores con "Ver
  mensajes anteriores"; "Actualizar" trae los nuevos.
- `components/mensajeria/caja-mensaje.tsx`: `CajaMensaje`, de 1 a 1000
  caracteres (sin contar los espacios de los extremos) con contador. "Enviar"
  queda deshabilitado con el texto vacío o de más y durante el envío; no manda
  dos veces el mismo envío y mantiene el texto si falla.
- Si el historial no carga por red, sale "Reintentar".

`ConversacionChat` y `CajaMensaje` no saben nada de reservas: FE-15.1 los
reutiliza para la conversación previa.

### Route handlers

- `POST /api/reservas/[id]/conversacion`: sin cuerpo.
- `GET /api/conversaciones/[id]/mensajes`: solo pasan `page` y `limit`.
- `POST /api/conversaciones/[id]/mensajes`: solo pasa `contenido`; el autor lo
  pone el backend con el token.

### Decisiones

- **Sin actualización automática.** Los mensajes nuevos de la otra persona
  aparecen con "Actualizar" o al volver a entrar, y el aviso del Módulo 8 avisa
  que hay uno. Un sondeo cada pocos segundos se puede agregar después si hace
  falta.
- **"Tú" y "Arrendador" / "Arrendatario".** El historial no trae nombres, así
  que se nombra a la otra persona por su rol.
- Fechas en hora de El Salvador.

### Pruebas

- `components/mensajeria/__tests__/conversacion-reserva.test.tsx`: cada estado
  (CONFIRMADA, EN_CURSO, RECHAZADA, CANCELADA, COMPLETADA, PENDIENTE, cerrada
  sin conversación, ajena), sin conexión, enviar y limpiar, Enviar deshabilitado
  con vacío y 1001 caracteres (y habilitado con 1000), reintentar tras un fallo de red, doble clic, cierre mientras está abierta, fallo que conserva el
  texto, paginación de 60 mensajes, historial vacío, nombres según el rol y
  "Actualizar".
- `app/api/conversaciones/__tests__/route.test.ts`: lo que reenvía cada route
  handler, el 409 tal cual, cuerpo inválido y sin sesión.

Con la caja visible siempre (sin respetar `puedeEscribir`) fallan 4 casos.

Recorrido en Chrome contra el backend con el PR #48: arrendatario escribe en
una reserva CONFIRMADA y el mensaje sigue al recargar; una COMPLETADA muestra
el historial sin caja y con el aviso; PENDIENTE muestra el texto de la ficha;
una reserva ajena sale como no encontrada; el arrendador ve el mensaje como
"Arrendatario", responde, y el arrendatario lo ve con "Actualizar"; a 375 px no
hay scroll horizontal.
