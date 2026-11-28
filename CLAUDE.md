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
pnpm --filter api dev:development # API against the shared develop DB (api/.env.development, Supabase)
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
APP_ENV=development pnpm --filter api migration:status   # same commands against another env's DB

# Demo data for cashier settlements (never runs against production; all users are demo_*)
cd api && APP_ENV=development npx ts-node -T src/scripts/seed-liquidaciones-demo.ts [--clean]
```

- After changing anything in `helper/src`, rebuild it (`pnpm --filter helper build`). Jest maps `helper` to `helper/dist/index.js`, so stale dist means stale tests. The husky pre-commit hook runs `pnpm type-check`, which also reads `helper/dist`: a stale build fails the commit with "has no exported member" errors in `api`/`web-admin`.
- A running API (nodemon) does not reload `helper/dist`: after a helper rebuild or a branch switch, restart it. A route answering 400 "Query validation failed" right after a validator change usually means the old process is still up.
- `pnpm dev` uses the local DB (`localhost`), `dev:development` the develop DB on Supabase. Data seeded with one `APP_ENV` is invisible from the other.
- Railway does not run migrations on deploy: apply them by hand in each environment before merging code that needs them.
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

### Cashier accounts and settlements (`features/cashier-accounts`, Owner and Admin)
Settlement hierarchy: each **admin settles their own cashiers**, the **owner settles the cashiers directly under them** (same system, as if they were their admin), and the owner **sells chips to admins** instead of settling them (`features/admin-chip-purchases`, see below). Scope is direct children only (`cashier.parent_user_id === requester`), not the whole subtree.
Backoffice `/admin/cashier-accounts` (menu "Finanzas" for owner and admin, which replaced the old Reportes/Ganancias menus), tabs **Liquidar**, **Historial de liquidaciones**, **Cuenta del owner** ("Mi cuenta" for admins), **Vender fichas** (owner) / **Mis compras de fichas** (admin), **Apuestas** (`components/admin/bets-report.tsx`, also at `/admin/reports/bets` for admins); `?tab=` opens a tab. Commission % can be set when creating a CASHIER (`commissionPercentage` on `POST /users`, stored in `cashier_compensation_modes`). Admins get no commission (rejected with 400): they buy chips from the owner at the tiered price and sell them to their cashiers. The cashier sees their own read-only history at `/cashier/settlements` (API `/cashier-accounts/me/*`, mounted before the owner router). Full guide: `docs/cuentas-corrientes-cajeros.md`.
- Business flow: the owner loads chips to a cashier (`SELL_TO_PLAYER` with the cashier as `user_id`), the cashier sells them to players (`SELL_TO_PLAYER` with the cashier as `related_user_id`) and takes back prize chips from winners (`PRIZE`; the owner pays the prize in cash). The cashier keeps a commission on sales; there is no "pay commission to cashier" step anymore.
- Settlement math: `commission = sales × %`, `subtotal = sales − commission` (`− prizes` when the cashier's `prizes_affect_subtotal` is on; versioned in `cashier_compensation_modes`, copied to `cashier_settlements.prizes_deducted`), `total = previous debt + subtotal`, `amount due = total − on-account collections`, `debt carried = total − confirmed collected`. The Liquidar table shows Balance, Venta, Premios, Comisión, Subtotal, Saldo ant., **Cobro** (= on-account collections) and **Total** (= amount due); the settlement collection and `chipsLeft` are set only in the settle dialog. Prize chips are always taken back from the cashier; unsold chips = cashier balance − prize chips, the settler chooses how many to leave, the rest is taken back. Taken-back chips are credited to the settling **admin's** balance (not the owner's, who has no balance limit); cancel debits them back and fails if the admin no longer has them.
- Collections (`cashier_collections.kind`/`status`): **on-account** collections (`ON_ACCOUNT`, `settlement_id` null until a settlement absorbs them) are recorded during the week, confirmed at once, and subtracted at the next settlement. The amount set when settling is a `SETTLEMENT` collection that stays `PENDING` (`cashier_settlements.pending_collection`) until the owner confirms it (`confirm-collection`, may confirm less; the rest stays as debt). Settling again with a pending collection marks it `EXPIRED` (it becomes debt); canceling that settlement reopens it.
- **Cutoff, not range:** the owner only picks `periodEnd`. Each settlement starts right after the cashier's last non-canceled settlement (or at their first chip movement) and `periodEnd` is clamped to now, so there are no gaps or overlaps. `periodStart` in requests is accepted and ignored. 409 if the cashier is already settled up to the cutoff.
- `createSettlement` runs in one transaction with a row lock on the cashier balance. Chip take-backs are `RECOVERY` movements linked by `idempotency_key` `settlement:<id>:prizes|unsold`; cancel writes `settlement:<id>:reversal` (`ADJUSTMENT`) and returns the chips. Confirm-collection and cancel only work on the cashier's **latest** settlement.
- Tables: `cashier_settlements` (flow columns are nullable; `subtotal IS NULL` = legacy settlement from the old commission model), `cashier_collections` (one row per collection), `cashier_compensation_modes`. `cashier_current_accounts` (old daily account) is unused; its daily files/types are deprecated leftovers.
- Owner account ("Mi cuenta" for admins, over the requester's direct cashiers): profit = subtotal − prizes paid by the settler, cash flow = collected − prizes paid by the settler (prizes deducted from the subtotal were paid by the cashier and count as 0), over settlements whose period ends in the range.

### Admin chip purchases (`features/admin-chip-purchases`, Owner; admin read-only at `/me`)
The owner sells chips to admins at a tiered price: each load is priced by its own size (`quoteAdminChipPurchase` in `helper`), paying the % of the highest tier it reaches. Default tiers `DEFAULT_ADMIN_CHIP_PRICE_TIERS` (100k 20%, 500k 19%, 1M 18%, 10M 17%, 20M 16%, 30M 15%), overridable per admin in `admin_chip_pricing` (no row = defaults). Loads below the first tier require a manual `percentage`. A purchase credits the chips at once (`SELL_TO_PLAYER`, key `admin-purchase:<id>:load`, or `admin-purchase-request:<idempotencyKey>`), gets a serial `receipt_number` and PDF receipt, and stays `PENDING` until the owner confirms payment (`PAID`). Only `PENDING` purchases can be canceled, which takes the chips back (`ADJUSTMENT`, `admin-purchase:<id>:reversal`) and fails if the admin no longer has them. It is the only way to give chips to an admin: `chipsDomain.sellChips` from owner to admin and `initialBalance` when creating an ADMIN are rejected with 400.

### 21Viral integration (`features/integrations/21viral`)
- 21Viral is an **integrator** that aggregates real providers (Pragmatic, RubyPlay, …). It calls back server-to-server at root-level `/players/*` routes (`callbacks.routes.ts`, mounted outside `/api`), authenticated by HMAC (`middleware/hmac.middleware.ts`, see `docs/rfc8785-hmac-sha256.md`).
- `games.provider_name` holds the real provider, while `provider_transactions.provider_name` is always `'21viral'`. **Join provider transactions to games on `provider_game_id` only**, never on `provider_name`.
- `games.visible_provider_name` (nullable, edited by SQL) lets a game show up under a different provider in the frontends. Everything front-facing uses the effective provider `COALESCE(visible_provider_name, provider_name)`: filters, the selects returned as `providerName`, and the joins to `providers` and `provider_game_type_orders`. Only the 21viral side keeps the real `provider_name`: the launch (`gamesRepository.findProviderRefById`) and the sync upsert.
- A round is a distinct `provider_game_round_id`. `transaction_type`: Debit = wager, Credit = win, Reversal = refund.
- Native games are stored in `bets` (1 bet = 1 round) and integrator games in `provider_transactions`. Reports and "most played" combine both.
- Vendor spec: `docs/21viral/` holds Operator API **v1.23** (PDF + extracted text + summary). `gameId` is deprecated — identify games by `providerName` + `providerGameId`. `/v1/games` returns `rtp` (synced) and `hasFreeSpins` (v1.23, not stored yet); games missing from the response should be deactivated, but `syncGames()` only upserts today. The PDF also covers Jackpot API, Free Spin Bonus API and Pragmatic Live/DGA, none integrated.

### Reports / time
Day-bucketed reports use `APP_TIMEZONE` (default `America/Argentina/Buenos_Aires`), not the DB's UTC.

## Repo rules
- Never commit to `develop` or `main`; branch off `develop` (`feature/…`, `fix/…`).
- Password policy is 8 chars minimum for **all** roles; do not reintroduce a stricter rule for elevated roles.
- CI (`.github/workflows/ci.yml`) only lints/type-checks/builds/tests the workspaces whose paths changed, and `helper/**` changes trigger all of them.
- `security.yml` runs gitleaks over the **full git history**. A leaked secret in any old commit blocks every PR; unblock it by allowlisting the secret value regex in `.gitleaks.toml`, not by path. `codeql.yml` is the advanced setup, so GitHub's "default setup" code scanning must stay disabled.
- Docs index: `docs/README.md`. Operational guides (env vars, deployment, frontends) live in `docs/`; migrations in `api/src/persistence/migrations/README.md`. `docs/backlog/` holds deferred ideas and `docs/superpowers/specs/` the design specs of shipped features. Any `plans/` folder is gitignored, so implementation plans stay local.
