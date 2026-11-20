# Devolución y garantía (Módulo 4)

## FE-09.1. Pantallas de devolución y garantía (MP4-79)

El arrendador registra la devolución del bien y después resuelve el depósito
de garantía, lo que cierra la reserva (H09). Consume los endpoints de BE-09.1
y BE-09.2 (`docs/modulos/devoluciones.md` en el backend).

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/reservas/{id}/devolucion` | `ARRENDADOR` y `ARRENDATARIO` | El arrendador registra la devolución y resuelve el depósito. El arrendatario ve lo mismo, sin acciones. |

- En "Mis solicitudes", las reservas `EN_CURSO` tienen el botón "Registrar
  devolución", que abre esta pantalla.
- Que la reserva sea del arrendador y esté `EN_CURSO` lo decide el backend; la
  pantalla muestra su mensaje.

### Los dos pasos, en orden

1. **Devolución.** Fecha y hora real (hora de El Salvador), estado final
   ("Sin observaciones" o "Con observaciones") y, con observaciones, los daños
   o faltantes (obligatorios, hasta 500 caracteres). Registrarla **no** cierra
   la reserva: sigue `EN_CURSO`.
2. **Resolución del depósito.** Solo aparece cuando ya hay devolución. El
   arrendador escribe cuánto retiene y ve el depósito original, el retenido,
   el liberado calculado y el estado que tendrá la garantía (`LIBERADA` con 0,
   `RETENIDA` con más de 0). Si retiene algo, el motivo es obligatorio. Antes
   de enviar hay un paso de confirmación con los importes.

Al confirmar, la reserva pasa a `COMPLETADA` y la pantalla muestra el resumen
que devolvió el backend.

### Componentes (`components/devoluciones/`)

- `PantallaDevolucion`: consulta la devolución y la garantía, y decide qué
  paso se muestra.
- `FormularioDevolucion`: el primer paso.
- `ResumenGarantia`: los tres importes y el estado de la garantía. Mientras
  está `PENDIENTE` y es el arrendador, incluye el monto a retener y el motivo.
- `ConfirmacionCierre`: "¿Resolver el depósito y cerrar la reserva?" con lo
  que se libera y lo que se retiene.

Los datos van por `lib/devoluciones/` (`tipos.ts`, `cliente.ts`) y dos route
handlers:

| Route handler | Backend |
|---|---|
| `GET` y `POST /api/reservas/{id}/devolucion` | `/reservas/{id}/devolucion`. En el `POST` solo pasan `fechaReal`, `estadoFinal` y `danos`. |
| `GET` y `POST /api/reservas/{id}/deposito/resolucion` | `/reservas/{id}/deposito/resolucion`. En el `POST` solo pasan `montoRetenido` y `motivo`. |

### Reglas en pantalla

- El monto a retener debe ser un número de 0 en adelante con hasta dos
  decimales y no puede superar el depósito.
- Con una devolución sin observaciones el monto queda en 0 y deshabilitado: el
  backend no permite retener en ese caso.
- El liberado se calcula en centavos (`calcularResolucion`) para que
  `0.30 - 0.10` dé `0.20`.
- **Importes simulados.** El resumen y la confirmación dicen que no son
  devoluciones bancarias reales.
- Los botones se deshabilitan mientras se procesa ("Registrando...",
  "Procesando...").

### Errores

| Respuesta | Qué se ve |
|---|---|
| 400, 403, 404 | El mensaje del backend en el paso que se estaba haciendo. |
| 409 al registrar la devolución | El mensaje (ya registrada, o la reserva no está en curso) y se vuelve a consultar. |
| 422 al resolver (`RETENCION_SUPERA_DEPOSITO`, `RETENCION_SIN_OBSERVACIONES`) | El mensaje; se vuelve al formulario y la reserva sigue `EN_CURSO`. |
| 409 al resolver, o 422 `DEVOLUCION_NO_REGISTRADA` | El mensaje queda arriba y se vuelve a consultar el estado real. |
| Sin conexión, 502 a 504 | "No se pudo ... Revisa tu conexión." |
| 401 | Va a `/login`. |

**Un 409 o un 422 nunca muestran la reserva como cerrada**: `COMPLETADA` solo
aparece cuando lo dice una respuesta del backend.

### Decisiones

- **Una sola pantalla con los dos pasos**, en vez de dos rutas: el segundo
  paso depende del primero y así se ve en qué punto está la reserva.
- **Los importes llegan como número** (`20`, no `"20.00"`) y se muestran con
  dos decimales (`dinero`).
- **La hora del formulario es de El Salvador** y se manda con `-06:00`.
- Se agregó el botón "Registrar devolución" a la tabla de solicitudes (H04),
  porque todavía no hay un panel de reservas desde donde llegar.

### Pruebas

`components/devoluciones/__tests__/devolucion.test.tsx` (27 pruebas): el
cálculo, el orden de los pasos, registrar con y sin observaciones, el resumen
mientras se escribe, motivo obligatorio, confirmar y cerrar, liberar todo, los
422 y el 409 sin cerrar la reserva, la vista del arrendatario y los errores de
consulta.
