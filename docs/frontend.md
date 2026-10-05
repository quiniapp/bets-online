# Frontends: `web` y `web-admin`

Dos apps Next.js (App Router, React 19, Tailwind, shadcn/ui) que comparten tipos y validadores desde `helper`. Mucho código está duplicado entre ambas (`components/ui`, `hooks`, `contexts`, `services/api.service.ts`): un fix en una suele tener que aplicarse en la otra.

| | `web` | `web-admin` |
|---|---|---|
| Para quién | jugadores (`PLAYER`) | `OWNER`, `ADMIN`, `CASHIER` |
| Puerto dev | 3002 | 3000 |
| Rutas | `/` lobby, `/login`, `/user/*` | `/login`, `/admin/*`, `/cashier/*` |
| Guard de ruta (`middleware.ts`) | `/user/*` exige cookie `session`; `/admin` y `/cashier` redirigen a `/` | `/admin/*` y `/cashier/*` exigen cookie `session`; si no, `/login` |
| Rol permitido | `lib/site-config.ts` → `getSiteType()` = `player` | = `panel` |
| CSP (`next.config.mjs`) | Report-Only (iframes de juegos de terceros) | Enforced |

El rol se valida de verdad en la API; el middleware solo mira si existe la cookie. `site-config.ts` rechaza en el login a un rol que no corresponde al sitio.

## Correr

```bash
pnpm --filter helper build      # una vez, y cada vez que cambie helper/src
pnpm --filter web dev           # http://localhost:3002
pnpm --filter web-admin dev     # http://localhost:3000
pnpm dev:all                    # api + web + web-admin
```

Env: solo `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Ver [environment-variables.md](./environment-variables.md).

Owner por defecto del seed: `owner` / `password`. Para probar `web` creá un jugador desde el backoffice.

## Estructura (igual en ambas)

```
app/                 rutas (App Router): (auth)/login, user/*  |  admin/*, cashier/*
feature/             pantallas con lógica propia (login, hero, pages/create-admin, admin-dashboard)
components/          ui/ = shadcn; admin/ = diálogos de fichas y usuarios; resto layout y navegación
contexts/            auth-context (sesión, timer de inactividad, sync multi-tab), language-context (es/en),
                     lobby-context y favorites-context (solo web)
hooks/               useUsers, useChips, useGames, useCasinoSettings, … (un hook por recurso de la API)
services/api.service.ts   único cliente HTTP
routes/index.ts      constantes ROUTER con todos los paths
common/sidebarmenu.common.ts   ítems del menú lateral
lib/                 utils, site-config, two-row-grid (web), crop-image (web-admin)
middleware.ts        guard por cookie
next.config.mjs      rewrites /api/* + security headers (CSP, HSTS, Referrer-Policy, …)
```

## `services/api.service.ts`

Todo request a la API pasa por acá:

- Pide `GET /api/csrf-token` una vez y manda `x-csrf-token` en cada mutación. Un `fetch` crudo con POST a `/api/*` devuelve `403 CSRF_INVALID`.
- Multipart: `apiService.postForm(...)` (no setear `Content-Type` a mano).
- Cookies: `credentials: 'include'`. No hay tokens en `localStorage`, solo un flag de "sesión activa" para no parpadear antes de hidratar.
- 401/403 o `error.code` de auth (`UNAUTHORIZED`, `TOKEN_EXPIRED`, …): intenta `POST /api/auth/refresh` y reintenta; si falla, `handleAuthError()` limpia y redirige al login.
- Respuestas tipadas `ApiResponse<T>` de `helper` (`{ success, data, error, meta }`).

`contexts/auth-context.tsx` complementa: `loadUser()` al montar, timer de inactividad = `SESSION_IDLE_MS` (30 min, de `helper`) y listener de `storage` para cerrar sesión en todas las pestañas.

## Agregar una página

1. `app/<area>/<nombre>/page.tsx`. `"use client"` si usa hooks; en el panel, envolver con `DashboardLayout`.
2. Path en `routes/index.ts`.
3. Ítem de menú en `common/sidebarmenu.common.ts` (lo consume `hooks/useSidebarNavigation.ts`).
4. Datos: hook en `hooks/` que use `apiService`; tipos desde `helper`.
5. Si la ruta es nueva y protegida, revisar el `matcher` de `middleware.ts`.

Componentes shadcn: `pnpm dlx shadcn@latest add <componente>` dentro de la app (cada una tiene su `components.json`).

Botones que disparan un request: estado `loading` local, botón deshabilitado y spinner mientras está en vuelo (regla del `CLAUDE.md` general).

## Calidad

```bash
pnpm --filter web type-check      # CI lo corre; el pre-commit corre type-check de todo
pnpm --filter web lint
pnpm --filter web build           # el prebuild compila helper
```

No hay tests de frontend: el job `test-web` de CI pasa vacío.

## Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| `Cannot find module 'helper'` o tipos viejos | `pnpm --filter helper build` y reiniciar `next dev` |
| `403 CSRF_INVALID` | usar `apiService` / `postForm`, no `fetch` directo |
| Hydration mismatch | leer `localStorage` / `window` solo en `useEffect`; `"use client"` donde haya hooks |
| Sesión "zombie" después de días | esperado: el primer request falla y `handleAuthError` manda al login |
| Puerto ocupado | `next dev -p <otro>` o liberar 3000 / 3002 |
