# Reporte de ingresos (Módulo 21)

## FE-21.1. Panel de ingresos (MP4-117)

Historia H21. El arrendador ve cuánto le generó cada uno de sus bienes en un
período. Usa el endpoint de BE-21.1 (MP4-116), `GET /reportes/ingresos`.

### Pantalla

| Ruta | Quién | Qué hace |
|---|---|---|
| `/ingresos` | `ARRENDADOR` | Total y tabla de ingreso por bien, con selector de fechas. Otro rol ve "Acceso restringido". |

> **Pendiente:** todavía no hay un enlace en la navegación; se entra
> escribiendo `/ingresos` (igual que la pantalla de pago de FE-05.1). Cuando
> haya más pantallas del arrendador, agregar un acceso en
> `components/encabezado.tsx` visible solo para `ARRENDADOR` (el encabezado
> hoy no conoce el rol: habría que leerlo con `getCurrentUser()`).

### Componentes

- `PanelIngresos` (`components/ingresos/panel-ingresos.tsx`): estados y
  llamada.
- `SelectorRangoFechas`: campos «Desde» y «Hasta» (`<input type="date">` con
  `<label>`) y el botón «Consultar». Consulta al enviar, no en cada cambio.
- `TablaIngresosPorBien`: dos columnas (Bien, Ingreso) y el total en el pie.

### Flujo

```
navegador ──GET /api/reportes/ingresos?desde&hasta──▶ route handler (Next)
                                                        │ reenviarAlBackend (Bearer de la cookie httpOnly)
                                                        ▼
                             GET {API_URL}/reportes/ingresos?desde&hasta
```

- El navegador nunca habla con el backend ni ve el token.
- `app/api/reportes/ingresos/route.ts` reenvía **solo** `desde` y `hasta` y
  descarta cualquier otro parámetro (por ejemplo `arrendadorId`). El
  arrendador sale del token en el backend.

### Contrato

Respuesta 200 (ver `docs/modulos/ingresos.md` del backend):

```json
{
  "desde": "2026-11-01",
  "hasta": "2026-11-30",
  "moneda": "USD",
  "total": "30.50",
  "porBien": [
    { "publicacionId": "<uuid>", "nombre": "Carpa", "ingreso": "0.00" },
    { "publicacionId": "<uuid>", "nombre": "Proyector", "ingreso": "30.50" }
  ]
}
```

Los importes llegan como **texto con dos decimales** y `publicacionId` es un
UUID.

### Reglas

- **Importes.** `lib/ingresos/montos.ts` (`formatearImporte`) solo les da
  formato: `"30.5"` → `$30.50`, `"0.00"` → `$0.00`. Nunca pasan por
  `number` ni se suman en el navegador: el total es el que manda el backend.
  Un texto que no sea un importe se muestra como «—». Hay una función
  parecida en `lib/pagos/montos.ts` (PR de FE-05.1); conviene unificarlas.
- **Rango por defecto.** El mes en curso en hora de El Salvador
  (`lib/ingresos/fechas.ts`, `mesEnCurso`): el día de hoy se saca con
  `Intl.DateTimeFormat` en `America/El_Salvador` y el último día del mes con
  `Date.UTC(año, mes, 0)`. El 1 de diciembre a las 05:59Z todavía es
  noviembre. La página lo calcula en el servidor y se lo pasa al panel, para
  que los campos coincidan al hidratar.
- **Validación antes de llamar** (`validarRango`): las dos fechas son
  obligatorias y tienen que existir, «Desde» no puede ser posterior a
  «Hasta» y el rango tiene como máximo 366 días contando los dos extremos
  (como el backend). Si algo falla, el mensaje sale bajo el selector, los
  campos quedan con `aria-invalid` y no se hace ninguna petición.

### Estados

| Estado | Qué ve la persona |
|---|---|
| cargando | «Cargando ingresos...» y el botón «Consultando...» deshabilitado. Si ya había datos, quedan atenuados (`aria-busy`). |
| datos | Total destacado y la tabla por bien, con `$` y dos decimales; un bien sin ingresos muestra `$0.00`. |
| sin bienes | `porBien` vacío: «Aún no tienes bienes publicados.» y un enlace a publicar. |
| rango inválido | Mensaje bajo el selector (validación del navegador o `message` del 400 del backend). |
| error | «No se pudo cargar el reporte...» con «Reintentar» (red o 502: «Revisa tu conexión»). |
| restringido (403) | «Acceso restringido». |
| sesión vencida (401) | Navegación completa a `/login` (como en notificaciones, FE-10.1). |

Los cambios de estado se anuncian en una región `role="status"` (por ejemplo
«Reporte del 01/11/2026 al 30/11/2026: total $30.50.») y los errores con
`role="alert"`.

### Responsive

La tabla tiene dos columnas con `table-fixed`: el nombre hace salto de línea y
el importe no (`tabular-nums`), así cabe a 375 px sin scroll horizontal. En
móvil los dos campos van lado a lado y el botón ocupa todo el ancho; en
escritorio todo va en una fila.

### Pruebas

- `lib/ingresos/__tests__/montos.test.ts` y `fechas.test.ts`: formato, «—»,
  mes en curso con el cambio de mes y de año en hora de El Salvador, febrero
  bisiesto, desde > hasta, 366 y 367 días, fechas inexistentes.
- `components/ingresos/__tests__/panel-ingresos.test.tsx`: total y por bien,
  `0.00`, sin bienes, mes por defecto con reloj fijo (`vi.setSystemTime`,
  incluido el 1 de diciembre a las 05:59Z y 06:00Z), cambio de rango con los
  parámetros correctos, desde > hasta y más de 366 días sin llamar, 400 del
  backend, cargando, error y reintento, 500, 403 y 401.
- `app/api/reportes/__tests__/route.test.ts`: solo reenvía `desde` y
  `hasta`, Bearer, 400/403 tal cual, 401 sin sesión y con token vencido.
- `app/ingresos/__tests__/page.test.tsx`: un arrendatario ve «Acceso
  restringido» y no se consulta el reporte; un arrendador ve el panel.

### Cómo probarla contra el backend real

1. En el backend, la rama de BE-21.1 (o `main` cuando se fusione), con las
   migraciones aplicadas (`npx prisma migrate deploy`) y `npm start` (puerto
   3000).
2. En el frontend, `.env.local` con `API_URL=http://localhost:3000/api/v1` y
   `npx next dev -p 3001`.
3. Crear un arrendador y un arrendatario (`POST /api/v1/users` o
   `/registro/...`). Para tener ingresos hace falta un pago `APROBADO`: con el
   flujo de FE-05.1 o insertando en la base una publicación, una reserva
   `CONFIRMADA` y un `simulated_payments` `APROBADO`.
4. Entrar como arrendador a `/ingresos`.

Lo que revisé así (16/11/2026), con un arrendador nuevo con dos bienes (uno
sin ingresos) y pagos aprobados de `30.50` en noviembre y `20.00` en octubre,
más otro arrendador con un pago de `45.00` en noviembre:

- Por defecto, del 01/11/2026 al 30/11/2026: total `$30.50`, el bien sin
  ingresos con `$0.00`. El depósito del pago no se suma.
- Octubre: total `$20.00`, con una sola petición.
- Desde > hasta y un rango de 23 meses: mensaje bajo el selector y ninguna
  petición.
- `?arrendadorId=<otro>` agregado a mano: el route handler lo descarta y no se
  ven los bienes del otro arrendador.
- Arrendatario: «Acceso restringido» en `/ingresos`, y el route handler
  devuelve el 403 del backend.
- A 375 px (iframe): sin scroll horizontal; en escritorio, una sola fila.
- Consola sin errores ni warnings.
