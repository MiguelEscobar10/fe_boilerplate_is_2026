# Plataforma de renta de equipos y espacios: frontend

Proyecto 4 de Ingeniería de Software (UCA), equipo **MMitas Puebla**. Pantallas
para que un arrendador publique equipos o espacios y un arrendatario los
busque, reserve, pague (simulado), coordine la entrega y califique.

- **Backend:** [be_boilerplate_is_2026](https://github.com/MiguelEscobar10/be_boilerplate_is_2026). Ahí están la arquitectura, el modelo de datos, el resumen de endpoints y la evidencia de QA (`docs/`).
- **Documentación del frontend:** [`docs/`](docs/), con un documento por pantalla y la [decisión de manejo de estado](docs/decisiones/manejo-de-estado.md).

## Demo publicada

| Qué | URL |
|---|---|
| Frontend | https://mp4-frontend.onrender.com |
| API | https://mp4-backend-4ua0.onrender.com/api/v1 |
| Swagger | https://mp4-backend-4ua0.onrender.com/api/docs |

Corre en Render con el plan gratis: si nadie la usó hace rato, la primera visita puede tardar cerca de un minuto en responder. Cómo está desplegada: [`docs/06-despliegue.md` del backend](https://github.com/MiguelEscobar10/be_boilerplate_is_2026/blob/main/docs/06-despliegue.md).

## Integrantes

Cada historia tiene un dueño que hace sus cuatro tareas: base de datos,
backend, frontend y QA. La revisión de cada PR la hace otro integrante.

| Integrante | GitHub | Historias |
|---|---|---|
| Lee Michael Fuentes Narváez | [LeeMichael24](https://github.com/LeeMichael24) | H00, H01, H15, H16; documentación general y decisión de estado |
| Miguel Alberto Escobar Estrada | [MiguelEscobar10](https://github.com/MiguelEscobar10) | H05, H10, H20, H21 |
| Ricardo Pineda | [qwerty16p](https://github.com/qwerty16p) | H07, H08, H19, H22 |
| Henry | [AlexisFlop](https://github.com/AlexisFlop) | H04, H13, H14, H18 |
| Elias Alejandro Milian Rivera | [EliasMilian](https://github.com/EliasMilian) | H02, H09, H11, H12 |
| Mario Alexander Molina Fuentes | [JustLex98](https://github.com/JustLex98) | H03, H06, H17 |

Los nombres de cada historia y el rol de cada uno están en el
[README del backend](https://github.com/MiguelEscobar10/be_boilerplate_is_2026#integrantes).

## Stack

- **Next.js 16** con App Router, Server Components, Server Actions y route handlers.
- **React 19**, TypeScript y Tailwind CSS.
- **Vitest** con Testing Library y jsdom para las pruebas.

Esta versión de Next tiene cambios respecto de versiones anteriores (por
ejemplo, `proxy.ts` en lugar de `middleware.ts` y `params` como promesa). Antes
de escribir código, leer la guía en `node_modules/next/dist/docs/`, como pide
[`AGENTS.md`](AGENTS.md).

## Cómo levantarlo

Necesita el backend corriendo (ver su README).

```bash
cp .env.example .env.local   # API_URL=http://localhost:3000/api/v1
npm install
npm run dev -- -p 3001       # el backend ocupa el 3000: la app queda en http://localhost:3001
```

| Variable | Para qué |
|---|---|
| `API_URL` | URL base del backend con el prefijo de la versión, por ejemplo `http://localhost:3000/api/v1`. Solo la usa el servidor de Next: el navegador nunca llama al backend directo. |

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (también genera los tipos de las rutas) |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm test` | Pruebas con Vitest |
| `npm run test:watch` | Pruebas con Vitest en modo watch |

## Cómo está organizado

| Carpeta | Qué tiene |
|---|---|
| `app/` | Páginas por ruta (`login`, `registro`, `publicaciones`, `reservas`, `arrendador`, `ingresos`, `reportes`, `verificacion`), Server Actions (`app/actions`) y route handlers (`app/api`) que reenvían al backend |
| `components/` | Componentes por módulo (`publicaciones`, `mensajeria`, `pagos`, `entregas`, `notificaciones`...) y `RutaProtegida` |
| `lib/` | Sesión (`session.ts`, `dal.ts`), llamadas al backend (`backend.ts`, `api.ts`) y la lógica de cada módulo |
| `proxy.ts` | Manda al login a quien no tiene sesión |
| `docs/` | Un documento por pantalla y las decisiones |

## Sesión y permisos

El token vive en una cookie httpOnly y el usuario se pide al backend en cada
render del servidor (`getCurrentUser`, con `GET /auth/me`). Los componentes de
cliente llaman a los route handlers de `app/api`, que agregan el token. No se
usa librería de estado global; el porqué está en
[`docs/decisiones/manejo-de-estado.md`](docs/decisiones/manejo-de-estado.md).
