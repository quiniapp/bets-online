# bets-online

Plataforma de gestión de casino basada en fichas. Jerarquía de 4 niveles (Owner → Admin → Cajero → Jugador), contabilidad de fichas con auditoría, juegos nativos simulados y juegos de terceros a través del integrador **21Viral** (Pragmatic, RubyPlay, …).

Monorepo pnpm con cuatro workspaces:

| Workspace | Qué es | Corre en |
|---|---|---|
| `api/` | Express + Sequelize (Postgres en Supabase). Organizado por feature en `src/features/<nombre>/` | Railway, una instancia, puerto 3001 |
| `web/` | Next.js, sitio de **jugadores** (lobby, juegos, saldo) | Vercel, puerto dev 3002 |
| `web-admin/` | Next.js, **backoffice** (owner, admins, cajeros) | Vercel, puerto dev 3000 |
| `helper/` | Tipos, enums, validadores Zod y constantes compartidas. Los otros tres importan `helper/dist` | se compila antes que todo |

Stack: TypeScript, Node ≥ 20, pnpm, Express 4, Sequelize 6, Postgres 15+, Next.js 16, React 19, Tailwind, shadcn/ui, Zod, Jest.

## Arranque local

```bash
pnpm install
pnpm --filter helper build                 # obligatorio antes de api / web / web-admin

cp api/.env.example api/.env.local         # completar DATABASE_URL, secrets (≥32 chars), VIRAL_*
# o: pnpm --filter api setup   (genera secrets; detecta un Supabase local si está corriendo)

pnpm --filter api db:migrate               # crea el schema en DATABASE_URL
pnpm --filter api db:seed                  # crea el owner: usuario `owner`, contraseña `password`

pnpm dev:all                               # api :3001 + web :3002 + web-admin :3000
```

- Swagger: http://localhost:3001/doc (apagado en producción).
- Health: `GET /api/health`.
- Para entrar a `web-admin` usá el owner del seed; para `web` creá un jugador desde el backoffice.

## Comandos

```bash
pnpm dev                     # api + web
pnpm dev:all                 # api + web + web-admin
pnpm type-check              # todos los workspaces (lo corre el pre-commit)
pnpm --filter api lint
pnpm --filter api test                                      # Jest contra la DB de api/.env.local
pnpm --filter api test -- tests/domain/chips.domain.test.ts
pnpm --filter api test -- -t "sells chips"
pnpm --filter api db:migrate                                # también db:migrate:undo, migration:status
pnpm --filter api migration:new <nombre>
pnpm build                   # todos
```

Pre-commit (husky): `pnpm type-check` + `lint-staged` (`eslint --fix` sobre api, web y web-admin).

## Cómo está armado

- **API**: `routes → controller → domain → repository` por feature; modelos Sequelize junto a cada feature, asociaciones en `persistence/models/index.ts`; errores `AppError`; respuestas `ApiResponseBuilder` de `helper`. Auth por JWT en cookie `session` con sesión deslizante de 30 min, CSRF double-submit, rate limit global y throttle por cuenta en login, audit log de acciones sensibles.
- **Fichas**: transacciones Sequelize con `SELECT … FOR UPDATE`, solo hacia descendientes de rol menor, idempotentes.
- **21Viral**: callbacks server-to-server en `/players/*` firmados con HMAC-SHA256 (RFC 8785). Catálogo sincronizado por cron diario.
- **Frontends**: llaman a `/api/*` same-origin y Next.js reescribe a la API, así las cookies son first-party.

Detalle y reglas del repo en [`CLAUDE.md`](./CLAUDE.md).

## Documentación

Índice en [`docs/README.md`](./docs/README.md). Lo más usado:

- [Variables de entorno](./docs/environment-variables.md)
- [Deployment y CI/CD](./docs/deployment.md)
- [Frontends](./docs/frontend.md)
- [Migraciones](./api/src/persistence/migrations/README.md)
- [21Viral: configuración del operador](./docs/21viral-configuracion-operador.md)

## Reglas mínimas

- Nunca commitear a `develop` ni `main`: rama `feature/…` o `fix/…` desde `develop` y PR con el template.
- Cambiaste `helper/src` → `pnpm --filter helper build` (Jest y Next leen `helper/dist`).
- Contraseñas: mínimo 8 caracteres para todos los roles.
- CI: `ci.yml` corre lint, type-check, build y tests solo de los workspaces tocados; `security.yml` (audit + gitleaks sobre todo el historial) y `codeql.yml` corren siempre.

Proyecto privado.
