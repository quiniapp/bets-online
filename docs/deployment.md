# Deployment y CI/CD

## Topología

```
browser ──► Vercel `web` (jugadores)        ──┐  /api/* rewrite
browser ──► Vercel `web-admin` (backoffice) ──┼──► Railway `api` (Express, 1 instancia) ──► Supabase Postgres
21Viral ─────────────────────────────────────┘  /players/* (HMAC)                          └─► Supabase Storage
```

- Los frontends llaman a `/api/*` en su propio dominio y `next.config.mjs` reescribe a `NEXT_PUBLIC_API_URL`. Así las cookies (`sameSite: strict`) son first-party.
- La API corre como **una sola instancia**: `utils/games-cache.ts`, `persistence/cache/user.cache.ts` y `utils/login-throttle.ts` son `Map` en memoria. Escalar a más réplicas requiere un cache compartido.
- Swagger (`/doc`) solo fuera de `production`. Health: `GET /api/health`.

## Ramas

| Rama | Rol |
|---|---|
| `develop` | default del repo; integración |
| `main` | producción |
| `feature/*`, `fix/*` | trabajo; salen de `develop` y vuelven por PR |

Nunca commitear directo a `develop` ni `main` (ver `CLAUDE.md`). Los deploys los disparan las integraciones GitHub de Vercel y Railway al hacer push a la rama que cada proyecto tenga configurada. GitHub Actions no deploya nada.

## Railway (API)

Servicio `api`, configuración en el dashboard:

| Setting | Valor | Por qué |
|---|---|---|
| Root Directory | `.` (raíz del monorepo) | `api` importa `helper` por symlink de workspace; con root `api/` no resuelve en runtime |
| Build / Install / Start | vacíos | los define `api/railpack-plan.json` |
| Variables | ver [environment-variables.md](./environment-variables.md#railway-api) | |

`api/railpack-plan.json`:

```json
{
  "install": { "command": "pnpm install --frozen-lockfile" },
  "build":   { "command": "pnpm --filter helper build && pnpm --filter api build" },
  "start":   { "command": "cd api && node dist/server.js" }
}
```

El build de `api` es `tsc --skipLibCheck || true`: nunca falla. Los errores de tipos los frena CI (`type-check`).

Migraciones: Railway no las corre. Desde tu máquina, con un `api/.env.production` local (no commiteado):

```bash
APP_ENV=production pnpm --filter api migration:status
APP_ENV=production pnpm --filter api db:migrate
```

Rollback: Railway → Deployments → redeploy del anterior. Si hubo migración, `db:migrate:undo` con el mismo `APP_ENV`.

## Vercel (`web` y `web-admin`)

Dos proyectos, uno por app:

| Setting | `web` | `web-admin` |
|---|---|---|
| Root Directory | `web` | `web-admin` |
| Framework | Next.js | Next.js |
| Install Command | `pnpm install` (Vercel detecta el workspace y lo corre en la raíz) | igual |
| Build Command | `pnpm build` (el `prebuild` compila `helper`) | igual |
| Env | `NEXT_PUBLIC_API_URL` | `NEXT_PUBLIC_API_URL` |

Preview: cada push a una rama con PR genera un preview en Vercel (el bot comenta en el PR). El preview usa el `NEXT_PUBLIC_API_URL` configurado para Preview; no hay API por PR (Railway PR environments no está habilitado, ver `docs/backlog/PREVIEW_DEPLOYMENTS.md`).

Rollback: Vercel → Deployments → Promote to Production del deploy anterior.

## GitHub Actions

| Workflow | Dispara | Hace | Estado 2026-10-04 |
|---|---|---|---|
| `ci.yml` | PR y push a `main`/`develop` | Detecta qué workspaces cambiaron (`dorny/paths-filter`; `helper/**` dispara todos). Lint + type-check, build, tests de API contra `postgres:17` con migraciones. El job final **`CI Success`** es el status check para branch protection | OK |
| `preview-deploy.yml` | PR no-draft a `main`/`develop` | Build de helper + api + web y comenta "Build Validation" en el PR. No deploya. El job `cleanup-preview` nunca corre (`closed` no está en `types`) | OK |
| `deploy-develop.yml` | push a `develop` | Solo valida build. No deploya (lo hacen Vercel y Railway) | OK |
| `deploy-production.yml` | push a `main` | `pnpm test` + `pnpm build` con secrets `PROD_*`, crea tag `vYYYYMMDD-<sha>` | **Falla en todos los push a `main` desde 2026-07** en el step "Run all tests": los tests necesitan Postgres y los secrets `PROD_*` no están cargados. Arreglar o reducirlo a build-validation como `deploy-develop.yml` |
| `security.yml` | PR, push, lunes 06:00 UTC | `pnpm audit --prod --audit-level critical` (bloqueante) + gitleaks sobre **todo el historial** | Audit **fallando en `develop`** (2026-09-28): hay una vulnerabilidad critical en dependencias de producción |
| `codeql.yml` | PR, push, lunes | CodeQL JS/TS `security-extended`. Es el "advanced setup": el "default setup" de GitHub debe quedar apagado | OK |
| `dependabot.yml` | lunes | PRs agrupadas (prod / dev) por workspace + github-actions | activo |

Secrets de GitHub referenciados: solo `PROD_DATABASE_URL`, `PROD_JWT_SECRET`, `PROD_JWT_REFRESH_SECRET`, `PROD_SESSION_SECRET`, `PROD_ALLOWED_ORIGINS` y `PROD_API_URL`, en `deploy-production.yml`. CI no necesita ninguno.

gitleaks: un secreto en cualquier commit viejo bloquea todos los PR. Se desbloquea allowlisteando el valor (regex) en `.gitleaks.toml`, no el path.

## Branch protection

Guía en [`.github/BRANCH_PROTECTION.md`](../.github/BRANCH_PROTECTION.md). Al 2026-10-04 la API de GitHub no devuelve protección ni rulesets para `main`/`develop`: la regla "nunca commitear directo" hoy depende solo de disciplina. Pendiente de la auditoría ISO (OM-05).

## Checklist para un entorno nuevo

1. Supabase: proyecto + buckets públicos `banner-images`, `game-images`, `provider-logos`.
2. Railway: servicio con root `.`, variables de la sección API, dominio público.
3. Migraciones + seed (`db:migrate`, `db:seed`) contra esa DB; cambiar la contraseña del owner (`owner` / `password`).
4. Vercel: dos proyectos con `NEXT_PUBLIC_API_URL` = dominio de Railway.
5. `ALLOWED_ORIGINS` en Railway con ambos dominios de Vercel.
6. 21Viral: pedir credenciales del ambiente y registrar como operator base URL el dominio de Railway (callbacks en `/players/*`). Ver [21viral-configuracion-operador.md](./21viral-configuracion-operador.md).
