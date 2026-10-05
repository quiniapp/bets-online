# .github

## Workflows

| Archivo | Dispara | Qué hace |
|---|---|---|
| `workflows/ci.yml` | PR y push a `main`/`develop` | `changes` detecta workspaces tocados (`helper/**` dispara todos) → `lint-and-type-check` → `build` (artefactos 1 día) → `test-api` (migraciones + Jest contra `postgres:17`) y `test-web` (sin tests, pasa vacío) → **`CI Success`**, el status check a exigir en branch protection |
| `workflows/preview-deploy.yml` | PR no-draft a `main`/`develop` | Build de helper + api + web y comentario "Build Validation" en el PR. No deploya nada: los previews los crea la integración de Vercel |
| `workflows/deploy-develop.yml` | push a `develop` | Solo valida build. Los deploys reales los hacen Vercel y Railway por su integración con GitHub |
| `workflows/deploy-production.yml` | push a `main` | `pnpm test` + `pnpm build` con secrets `PROD_*` y crea el tag `vYYYYMMDD-<sha>`. **Hoy falla en cada push** (los tests necesitan Postgres y los secrets no están cargados). Ver `docs/deployment.md` |
| `workflows/security.yml` | PR, push, lunes | `pnpm audit --prod --audit-level critical` (bloqueante) y gitleaks sobre todo el historial (`.gitleaks.toml`) |
| `workflows/codeql.yml` | PR, push, lunes | CodeQL JS/TS `security-extended`. Es el advanced setup: el default setup de GitHub debe estar apagado |
| `dependabot.yml` | lunes | PRs agrupadas (prod / dev) por workspace, más github-actions |

CI no usa secrets. Solo `deploy-production.yml` lee `PROD_DATABASE_URL`, `PROD_JWT_SECRET`, `PROD_JWT_REFRESH_SECRET`, `PROD_SESSION_SECRET`, `PROD_ALLOWED_ORIGINS` y `PROD_API_URL`.

Correr lo mismo que CI antes de un PR:

```bash
pnpm --filter helper build
pnpm --filter api lint && pnpm type-check
pnpm --filter api test
pnpm build
```

## gitleaks

Escanea **todo el historial**. Un secreto en un commit viejo bloquea todos los PR. Se desbloquea agregando el **valor** (regex) al allowlist de `.gitleaks.toml`, nunca el path. Las entradas por path que ya existen cubren docs de ejemplo con credenciales placeholder; varias ya se borraron pero siguen en el historial, así que las entradas se quedan.

## Template de PR

`pull_request_template.md` se carga al abrir un PR: tipo de cambio, checklist de testing (`pnpm --filter api test`, `type-check`), notas de deploy y migraciones.

## Branch protection

Guía: [`BRANCH_PROTECTION.md`](./BRANCH_PROTECTION.md). Al 2026-10-04 no hay reglas ni rulesets activos en `main` ni `develop`.

Más en [`docs/deployment.md`](../docs/deployment.md).
