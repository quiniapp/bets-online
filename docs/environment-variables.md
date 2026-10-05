# Variables de entorno

Única fuente de verdad para `api`, `web` y `web-admin` en local, CI, Railway y Vercel.

## Dónde se leen

| Workspace | Archivo local | Quién lo carga | Validación |
|---|---|---|---|
| `api` | `api/.env.local` (o `.env.development` / `.env.production` / `.env.test`) | `api/src/config/envs.ts` (dotenv) | Zod: el proceso no arranca si falta algo |
| `api` (migraciones) | el mismo archivo | `api/src/config/sequelize-cli.js` | ninguna |
| `web` | `web/.env.local` | Next.js | ninguna |
| `web-admin` | `web-admin/.env.local` | Next.js | ninguna |

Qué archivo carga la API: `APP_ENV` > `NODE_ENV` > `local`.

| Valor | Archivo | Uso |
|---|---|---|
| `local` | `.env.local` | desarrollo (default de `pnpm --filter api dev`) |
| `development` | `.env.development` | correr contra la DB de dev/staging desde tu máquina |
| `production` | `.env.production` | correr migraciones contra producción desde tu máquina |
| `test` | `.env.test` | reservado; los tests cargan `.env.local` vía `api/tests/setup.ts` |

En Railway y Vercel las variables se setean en el dashboard: no hay archivo `.env` y dotenv no pisa lo inyectado. Ningún `.env.*` se commitea, solo los `*.example`.

## API

Fuente: `api/src/config/envs.ts`. "Req." = sin esa variable el proceso no arranca.

| Variable | Req. | Default | Para qué |
|---|---|---|---|
| `NODE_ENV` | | `local` | `local` / `development` / `production` / `test`. En `production`: SSL a la DB, Swagger apagado, cookies `secure`, logs `info` |
| `PORT` | | `3001` | Puerto HTTP (Railway lo inyecta) |
| `API_URL` | | `http://localhost:3001` | URL pública de la API (Swagger, endpoint raíz) |
| `DATABASE_URL` | ✅ | | Postgres. Ver [Supabase](#supabase-conexión-a-la-db) |
| `DATABASE_URL_LOCAL` / `_DEV` / `_PROD` | | | Opcionales. Si existe la del `NODE_ENV` actual, pisa a `DATABASE_URL` |
| `JWT_SECRET` | ✅ ≥32 chars | | Firma del access token (cookie `session`) |
| `JWT_EXPIRES_IN` | | `15m` | Vida del access token. `authMiddleware` lo renueva mientras haya actividad |
| `JWT_REFRESH_SECRET` | ✅ ≥32 chars | | Firma del refresh token |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Vida del refresh token |
| `SESSION_SECRET` | ✅ ≥32 chars | | Secret de sesión |
| `ALLOWED_ORIGINS` | | `http://localhost:3000` | CORS, lista separada por coma. Los frontends llaman same-origin vía rewrites, así que solo importa para llamadas directas al dominio de Railway |
| `SUPABASE_URL` | | | Supabase Storage: subida de banners, imágenes de juegos y logos de proveedores. Sin esto los uploads fallan con `Supabase not configured` |
| `SUPABASE_SERVICE_KEY` | | | Service role key de Supabase (secreta, solo backend) |
| `VIRAL_USERNAME` | ✅ | | Usuario que 21Viral manda en sus callbacks HMAC |
| `VIRAL_SECRET_KEY` | ✅ ≥32 chars | | Shared secret HMAC-SHA256 con 21Viral |
| `INTEGRATOR_URL` | | | Base URL de la API de 21Viral (`https://api.stg.games-viral.com/` en staging). Necesaria para lanzar juegos y sincronizar el catálogo |
| `LOG_LEVEL` | | `info` en prod, `debug` fuera | Nivel pino. `debug` loguea cada query SQL con su tiempo |
| `APP_TIMEZONE` | | `America/Argentina/Buenos_Aires` | Zona para reportes por día (la DB está en UTC) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` | | | Declaradas en el schema pero **ningún código las usa**. El owner inicial lo crea el seed (ver [migraciones](../api/src/persistence/migrations/README.md)) |

Generar secrets:

```bash
node -e "for (let i = 0; i < 4; i++) console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Un valor distinto por secret y por entorno. Rotar `JWT_SECRET` invalida todas las sesiones.

## Frontends (`web`, `web-admin`)

| Variable | Default | Para qué |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Destino del rewrite `/api/*` en `next.config.mjs`. Se lee en **build**: cambiarla en Vercel requiere redeploy |

No hay otra variable. `NODE_ENV` la maneja Next.js. Las cookies de auth son first-party porque el browser siempre llama a `/api/*` de su propio dominio y Next.js proxyea a `NEXT_PUBLIC_API_URL`.

## Local

```bash
cp api/.env.example api/.env.local               # completar DATABASE_URL, secrets, VIRAL_*
cp web/.env.example web/.env.local               # opcional, el default ya apunta a :3001
cp web-admin/.env.example web-admin/.env.local   # opcional
```

`pnpm --filter api setup` hace lo mismo para la API, genera los secrets y, si hay un Supabase local corriendo (`npx supabase start` dentro de `api/`), completa `DATABASE_URL` y `SUPABASE_*`.

Postgres local: cualquier Postgres ≥ 15 sirve. `api/supabase/config.toml` define un stack Supabase local en puertos 5532x (API 55321, DB 55322, Studio 55323). Luego:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

Los tests (`pnpm --filter api test`) usan la DB de `api/.env.local` y escriben en ella.

## CI (GitHub Actions)

`ci.yml` no usa secrets: pasa valores dummy (≥32 chars) y levanta `postgres:17` como service. Solo `deploy-production.yml` lee secrets (`PROD_*`), ver [deployment.md](./deployment.md).

## Railway (API)

Variables → servicio `api`:

```
NODE_ENV=production
DATABASE_URL=<pooler de Supabase, modo Session>
JWT_SECRET=…
JWT_REFRESH_SECRET=…
SESSION_SECRET=…
ALLOWED_ORIGINS=https://<web>.vercel.app,https://<web-admin>.vercel.app
API_URL=https://<servicio>.up.railway.app
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_KEY=…
VIRAL_USERNAME=…
VIRAL_SECRET_KEY=…
INTEGRATOR_URL=https://api.stg.games-viral.com/   # o la URL de producción que entregue 21Viral
APP_TIMEZONE=America/Argentina/Buenos_Aires
```

`PORT` lo inyecta Railway. `LOG_LEVEL=debug` se puede setear temporalmente para ver tiempos por query sin tocar código.

## Vercel (`web` y `web-admin`, un proyecto cada uno)

Settings → Environment Variables, en Production y Preview:

```
NEXT_PUBLIC_API_URL=https://<servicio>.up.railway.app
```

Después de cambiarla, redeploy (es build-time).

## Supabase: conexión a la DB

- Desde **Railway** usar el connection string del **pooler** (`*.pooler.supabase.com`) en modo **Session**. La conexión directa (`db.<ref>.supabase.co`) es solo IPv6 y Railway no la alcanza. Session mode se comporta como una conexión directa; Transaction mode (puerto 6543) tiene limitaciones (sin prepared statements ni LISTEN/NOTIFY).
- Desde **local** contra Supabase cloud: cualquiera de los dos.
- SSL: `api/src/config/sequelize.ts` activa SSL solo con `NODE_ENV=production`; `sequelize-cli.js` lo activa en `development` y `production`. Para correr migraciones contra Supabase cloud desde tu máquina usá `APP_ENV=development` o `production` con el `.env` correspondiente.
- RLS: el backend se conecta como `postgres` vía Sequelize, no por supabase-js. RLS no aplica; la autorización vive en la API. El warning "RLS disabled" del dashboard es esperado.

## Errores típicos

| Mensaje | Causa |
|---|---|
| `❌ Invalid environment variables` + lista | Falta una variable o un secret tiene menos de 32 chars. El log dice cuál |
| `⚠️ Could not load .env.development, falling back to default .env` | No existe el archivo del `APP_ENV` pedido |
| `Supabase not configured` al subir imágenes | Faltan `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` |
| `403 CSRF_INVALID` | No es de env: falta el header `x-csrf-token`. Usar `apiService`, y `postForm` para multipart |
| CORS en consola del browser | El frontend llama directo a Railway en vez de a `/api/*` same-origin, o falta el origin en `ALLOWED_ORIGINS` |
