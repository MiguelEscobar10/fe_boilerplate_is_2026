# Pagos y garantía (Módulo 5)

## FE-05.1. Pantalla de pago simulado (MP4-66)

Historia H05. El arrendatario paga una reserva confirmada con una tarjeta de
prueba. No hay ninguna pasarela real: el backend (BE-05.1, MP4-65) decide el
resultado por los últimos 4 dígitos.

Los importes que muestra el resumen de cobro son los de la reserva guardada:
`lib/pagos/reserva.ts` los lee con `GET /reservas/{id}` (BE-03.1, ver
[reservas](reservas.md)). El cobro **no** usa lo que se ve en pantalla: el
backend cobra con los importes de la reserva, y el resultado muestra el
`montoTotal` que devuelve.

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/reservas/{id}/pago` | `ARRENDATARIO` | Resumen del cobro, formulario de tarjeta y resultado. Otro rol ve "Acceso restringido". |

Se llega desde el detalle de la reserva (`/reservas/{id}`), que ofrece
«Pagar reserva» cuando está CONFIRMADA.

### Componentes

- `PantallaPago` (`components/pagos/pantalla-pago.tsx`): estados y llamada.
- `ResumenCobro`: alquiler, depósito y total por separado, con dos decimales.
  Las sumas se hacen en centavos enteros (`lib/pagos/montos.ts`), sin floats.
- `FormularioTarjeta`: número, vencimiento (MM/AA) y código de seguridad.
  Indica las tarjetas de prueba: **4242 aprueba, 0002 rechaza**.
- `ResultadoPago`: aprobado, rechazado o error.

Arriba de todo, en todos los estados, va el aviso fijo «Pago simulado: no se
realizará ningún cargo real».

### Flujo

```
navegador ──POST /api/reservas/{id}/pagos/simulados──▶ route handler (Next)
                 { numeroTarjeta, vencimiento, cvv }        │ reenviarAlBackend (Bearer de la cookie httpOnly)
                                                            ▼
                                     POST {API_URL}/reservas/{id}/pagos/simulados
```

- El navegador nunca habla con el backend ni ve el token.
- **No se envían montos.** El route handler arma un body nuevo solo con los
  tres campos de la tarjeta y descarta cualquier otro (el backend además
  responde 400 a un campo extra).

### Estados

`listo → procesando → aprobado | rechazado | error`

- **procesando** dura lo que tarda la petición. La espera simulada de 2
  segundos la hace el backend; el navegador no agrega otra.
- El botón **Pagar** queda deshabilitado en procesando, y un `useRef`
  descarta un segundo envío que llegue antes del re-render: un doble clic
  manda una sola petición.
- **rechazado** muestra el `motivo` del backend, que el cobro sigue pendiente
  y los intentos restantes (`3 − intento`). Si quedan intentos, el formulario
  vuelve a aparecer vacío. **Con el tercer rechazo ya no aparece** y se avisa
  que no quedan intentos.
- **aprobado** muestra el `montoTotal` del backend y oculta el formulario.

### Validación en el navegador

Mismas reglas que el DTO del backend, más la de tarjetas de prueba
(`lib/pagos/tarjeta.ts`):

- Los espacios se aceptan al escribir y se quitan antes de validar y enviar.
- Número de 13 a 19 dígitos, terminado en `4242` o `0002`. Con otra tarjeta:
  «Solo se aceptan tarjetas de prueba: usa una terminada en 4242 (aprueba) o
  0002 (rechaza).» y no se hace la petición.
- Vencimiento `MM/AA` con mes 01 a 12 (la barra se pone sola). Como en el
  backend, no se revisa si ya venció.
- Código de seguridad de 3 o 4 dígitos.

### Errores

Se traducen en `lib/pagos/errores.ts`, primero por el campo `codigo` y si no
viene, por status.

| Status | `codigo` | Mensaje | ¿Formulario otra vez? |
|---|---|---|---|
| 400 | `TARJETA_NO_VALIDA` | La tarjeta no es válida para la pasarela de prueba… | sí |
| 409 | `PAGO_EN_PROCESO` | Ya hay un pago en proceso… | sí |
| 409 | `PAGO_YA_APROBADO` | Esta reserva ya tiene un pago aprobado… | no |
| 409 | `INTENTOS_AGOTADOS` | Ya usaste los 3 intentos… El cobro sigue pendiente. | no |
| 409 | `RESERVA_NO_CONFIRMADA` | Solo se puede pagar una reserva confirmada… | no |
| 400 | — | Primer `message` del backend (son fijos y nunca repiten la tarjeta) | sí |
| 401 | — | Navega a `/login` (como FE-10.1; el route handler ya borró la cookie) | — |
| 403 | — | Solo el arrendatario de la reserva puede pagarla. | no |
| 404 | — | La reserva no existe o no es tuya. | no |
| 502 / sin red | — | No se pudo conectar con el servidor… | sí |

### Datos de la tarjeta

- Viven solo en el `useState` de `FormularioTarjeta`. Al enviar se pasan a la
  petición y el estado se vacía en el mismo momento.
- Nada en estado global, `localStorage`, `sessionStorage`, cookies, IndexedDB
  ni la URL. Los campos no tienen `name`, así que un envío sin JavaScript no
  manda nada.
- Nada en `console` ni en logs del route handler.
- `autoComplete="off"` e `inputMode="numeric"`: el navegador no ofrece
  guardar ni completar tarjetas reales, que aquí no sirven.

### Decisiones

- **`irALogin` se importa de `lib/notificaciones/navegacion.ts`** sin
  modificarlo. Conviene moverlo a un lugar común más adelante.
- **Moneda en USD (`$`)**, como en publicaciones (FE-01.1).

### Pruebas

`npm test`:

- `components/pagos/__tests__/pantalla-pago.test.tsx`:
  - desglose y total con dos decimales;
  - el body sin montos;
  - el botón deshabilitado y el doble clic con una sola petición;
  - el formulario vacío después de enviar;
  - solo tarjetas de prueba;
  - aprobado, y rechazado con motivo e intentos restantes;
  - el tercer rechazo sin formulario;
  - reintento;
  - el mensaje de cada `codigo` y status;
  - 401 al login;
  - el aviso en todos los estados;
  - nada en storage, IndexedDB, cookies, URL ni consola.
- `app/api/reservas/__tests__/route.test.ts`: reenvío con el token, que se
  descartan montos y campos extra, errores con `codigo` tal cual, 401, body
  inválido y nada de la tarjeta en consola.
- `lib/pagos/__tests__/`: sumas en centavos y reglas de la tarjeta.

### Probar contra el backend real

1. Backend en la rama `feat/MP4-65-BE-05.1-implementar-la-simulacion-y`
   (PR #37), con `npx prisma migrate deploy` y `npm run start:dev`.
2. Un usuario `ARRENDATARIO` (registro en `/registro/arrendatario`).
3. Una reserva `CONFIRMADA` de ese arrendatario, con `rental_cost` y
   `deposit_amount`, insertada a mano en la base (BE-04.1 todavía no está en
   `main`, así que no se puede crear desde la API).
4. En el FE, `API_URL=http://localhost:3000/api/v1` en `.env.local` y
   `npm run dev -- -p 3001`. Iniciar sesión y abrir
   `http://localhost:3001/reservas/<id de la reserva>/pago`.
5. Probar 4242 (aprobado), 0002 tres veces (intentos 2, 1 y el formulario
   desaparece), una tarjeta terminada en otra cosa, y un cuarto intento para
   `INTENTOS_AGOTADOS`.
