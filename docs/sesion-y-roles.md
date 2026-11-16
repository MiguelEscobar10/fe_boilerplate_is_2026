# Sesión, registro y roles en el frontend

## FE-00.1. Registro por rol y ruta protegida (MP4-127)

### Pantallas

| Ruta | Pública | Qué hace |
|---|---|---|
| `/login` | Sí | Inicio de sesión (ya venía en el boilerplate). Ahora enlaza a los dos registros. |
| `/registro/arrendador` | Sí | Crea una cuenta de arrendador. |
| `/registro/arrendatario` | Sí | Crea una cuenta de arrendatario. |
| `/` | No | Saluda con el nombre y el rol que devuelve el backend. |

Las dos pantallas de registro usan el mismo formulario
(`app/registro/register-form.tsx`) con el rol fijo, y la misma Server Action
`register` (`app/actions/auth.ts`), que llama a `POST {API_URL}/users` con
`email`, `password`, `rol`, `nombre` y `telefono`. Si la cuenta se crea, inicia
sesión de una vez y manda al inicio.

Validaciones antes de llamar al backend: todos los campos, formato de correo,
nombre de máximo 100 caracteres y teléfono de 8 a 15 dígitos (se aceptan
espacios o guiones al escribir; al backend van solo los dígitos). Los errores
del backend se muestran tal cual: 409 = correo ya registrado, 400 = el primer
mensaje de validación (por ejemplo `ROL_NO_PERMITIDO`).

### Sesión

- El token del backend vive en una **cookie httpOnly** (`lib/session.ts`, del
  boilerplate). El JavaScript del navegador no lo puede leer.
- `lib/dal.ts` tiene `getCurrentUser()`, que llama a `GET {API_URL}/auth/me`
  con ese token y devuelve `{ id, email, rol, nombre, telefono }`. Usa `cache`
  de React para no repetir la llamada en un mismo render. `requireUser()` hace
  lo mismo pero manda al login si no hay sesión válida.
- El rol **siempre viene del backend**. No se guarda en `localStorage` ni en
  otra cookie que el usuario pueda editar.
- `proxy.ts` hace el chequeo rápido (¿hay cookie?) y deja pasar sin sesión solo
  `/login` y los dos registros.

### Ruta protegida por rol

`components/ruta-protegida.tsx` envuelve una página que solo ciertos roles
pueden ver:

```tsx
import { RutaProtegida } from "@/components/ruta-protegida";

export default function MisPublicacionesPage() {
  return (
    <RutaProtegida roles={["ARRENDADOR"]}>
      {/* contenido */}
    </RutaProtegida>
  );
}
```

- Sin sesión: manda a `/login`.
- Con otro rol: muestra "Acceso restringido".
- Esconder la pantalla es solo comodidad: el backend vuelve a revisar el rol
  con `@Roles(...)` y responde 403.

### Por qué así (y no con una librería de estado)

El boilerplate ya resuelve la sesión en el servidor: cookie httpOnly, Server
Actions y un proxy. Agregarle una librería de estado en el cliente (Zustand,
Redux) para la sesión obligaría a copiar el token o el rol al navegador, que
es justo lo que la cookie httpOnly evita, y a mantener dos fuentes de verdad.
Con Server Components, cada página pide el usuario al backend cuando lo
necesita y siempre ve el rol real.

La decisión general de estado del frontend (MP4-129) la toma el equipo; esto
documenta cómo quedó la sesión.

### Cómo probarlo

1. Levantá el backend (`main` de `be_boilerplate_is_2026`) en el puerto 3000.
2. En este repo: `cp .env.example .env.local`, `npm install` y `npm run dev -- -p 3001`.
3. Entrá a `http://localhost:3001/registro/arrendador`, creá una cuenta y
   revisá que el inicio muestre tu nombre y "arrendador".
