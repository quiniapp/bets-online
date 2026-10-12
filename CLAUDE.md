# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Chip-based casino management platform: 4-level user hierarchy (Owner → Admin → Cashier → Player), chip accounting, native simulated games, and third-party games through the 21Viral integrator. The general stack/conventions in `C:\Programacion\CLAUDE.md` also apply; this file covers what is specific to this repo. Human-facing docs: `README.md` and the index in `docs/README.md`.

## Commands

pnpm monorepo, workspaces `api`, `web`, `web-admin`, `helper`. Node >= 20.

```bash
pnpm install
pnpm --filter helper build        # REQUIRED first: api/web/web-admin import the built helper/dist
pnpm dev                          # api + web
pnpm dev:all                      # api + web + web-admin
pnpm --filter api dev             # API only (APP_ENV=local → loads api/.env.local), port 3001, Swagger at /doc (non-prod only)
pnpm --filter web dev             # players site, port 3002
pnpm --filter web-admin dev       # backoffice, port 3000

pnpm --filter api lint
pnpm type-check                   # all workspaces
pnpm --filter api test            # Jest, config is root jest.config.js, tests in api/tests
pnpm --filter api test -- tests/domain/chips.domain.test.ts   # single file
pnpm --filter api test -- -t "sells chips"                    # single test by name

pnpm --filter api db:migrate      # Sequelize migrations (api/src/persistence/migrations, plain .js)
pnpm --filter api migration:new <name>
pnpm --filter api db:migrate:undo
```

- After changing anything in `helper/src`, rebuild it (`pnpm --filter helper build`). Jest maps `helper` to `helper/dist/index.js`, so stale dist means stale tests.
- `api` build is `tsc --skipLibCheck || true`, so it never fails; rely on `type-check` for errors.
- Tests hit a real Postgres (CI runs migrations then tests against postgres:17). `api/tests/setup.ts` loads `api/.env.local`.
- Env validation is strict (`api/src/config/envs.ts`, Zod): JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET and VIRAL_SECRET_KEY must be ≥32 chars; VIRAL_USERNAME and DATABASE_URL are required. The env file is chosen by `APP_ENV` (falling back to `NODE_ENV`): `.env.local` / `.env.development` / `.env.production` / `.env.test`.

## Architecture

### API (`api/src`), organized by feature
Each `features/<name>/` holds its own `*.routes.ts → *.controller.ts → *.domain.ts → *.repository.ts` plus the Sequelize `*.model.ts`. Admin-only endpoints live in `*.admin.routes.ts` files. `routes.ts` mounts everything under `/api`. All model associations are centralized in `persistence/models/index.ts`. Business errors are thrown as `AppError(status, ErrorCode, msg)` (`middleware/error.middleware.ts`), and responses use `ApiResponseBuilder` from `helper`.

`helper` is the shared package (types, enums like `UserRole`/`ErrorCode`/`ChipMovementType`, `ROLE_HIERARCHY`, Zod validators, constants such as `SESSION_IDLE_MS`). Both frontends and the API import it.

### Request path and deployment
- `web` (players) and `web-admin` (backoffice) run on Vercel. `api` runs on Railway as a **single instance**.
- Browsers call same-origin `/api/*`, and each frontend's `next.config.mjs` `rewrites` proxies to `NEXT_PUBLIC_API_URL`. That keeps the auth cookies first-party (`sameSite: 'strict'`).
- In-memory caches (`utils/games-cache.ts`, `persistence/cache/user.cache.ts`) are only correct because there is one instance. Scaling to more than one replica needs a shared cache.
- Cron jobs start in `server.ts` (`cron/gameSyncJob`, `cron/cacheSyncJob`), and the cache is warmed on boot.

### Auth, CSRF, sessions
- JWT in the `session` cookie (or `Authorization: Bearer`). `authMiddleware` slides the session: past half the token lifetime it re-issues the cookie and extends the DB session's idle window. Blocked users are rejected immediately via `userCache`. Use `requireRole(...)` for role gates.
- CSRF is a double-submit cookie: `GET /api/csrf-token`, then send the `x-csrf-token` header on every mutating `/api` request (requests with an Authorization header and the 21Viral callbacks are exempt). Frontends must go through `services/api.service.ts`. Multipart uploads must use `apiService.postForm`, because a raw `fetch` gets 403 `CSRF_INVALID`.

### Chips and hierarchy
Chip operations (`features/chips/chips.domain.ts`) run inside a `sequelize.transaction()` with row locks (`findByUserIdWithLock`). They only apply to descendants with a strictly lower role (`ROLE_HIERARCHY`), accept an `idempotencyKey`, and write to the audit log (`utils/audit.ts`). The Owner has no balance limit.

### 21Viral integration (`features/integrations/21viral`)
- 21Viral is an **integrator** that aggregates real providers (Pragmatic, RubyPlay, …). It calls back server-to-server at root-level `/players/*` routes (`callbacks.routes.ts`, mounted outside `/api`), authenticated by HMAC (`middleware/hmac.middleware.ts`, see `docs/rfc8785-hmac-sha256.md`).
- `games.provider_name` holds the real provider, while `provider_transactions.provider_name` is always `'21viral'`. **Join provider transactions to games on `provider_game_id` only**, never on `provider_name`.
- `games.visible_provider_name` (nullable, edited by SQL) lets a game show up under a different provider in the frontends. Everything front-facing uses the effective provider `COALESCE(visible_provider_name, provider_name)`: filters, the selects returned as `providerName`, and the joins to `providers` and `provider_game_type_orders`. Only the 21viral side keeps the real `provider_name`: the launch (`gamesRepository.findProviderRefById`) and the sync upsert.
- A round is a distinct `provider_game_round_id`. `transaction_type`: Debit = wager, Credit = win, Reversal = refund.
- Native games are stored in `bets` (1 bet = 1 round) and integrator games in `provider_transactions`. Reports and "most played" combine both.

### Reports / time
Day-bucketed reports use `APP_TIMEZONE` (default `America/Argentina/Buenos_Aires`), not the DB's UTC.

## Repo rules
- Never commit to `develop` or `main`; branch off `develop` (`feature/…`, `fix/…`).
- Password policy is 8 chars minimum for **all** roles; do not reintroduce a stricter rule for elevated roles.
- CI (`.github/workflows/ci.yml`) only lints/type-checks/builds/tests the workspaces whose paths changed, and `helper/**` changes trigger all of them.
- `security.yml` runs gitleaks over the **full git history**. A leaked secret in any old commit blocks every PR; unblock it by allowlisting the secret value regex in `.gitleaks.toml`, not by path. `codeql.yml` is the advanced setup, so GitHub's "default setup" code scanning must stay disabled.
- Docs index: `docs/README.md`. Operational guides (env vars, deployment, frontends) live in `docs/`; migrations in `api/src/persistence/migrations/README.md`. `docs/backlog/` holds deferred ideas and `docs/superpowers/specs/` the design specs of shipped features. Any `plans/` folder is gitignored, so implementation plans stay local.
