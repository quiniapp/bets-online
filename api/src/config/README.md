# api/src/config

| Archivo | Rol |
|---|---|
| `envs.ts` | Elige el `.env` según `APP_ENV` > `NODE_ENV` > `local`, lo carga con dotenv y valida con Zod. Si falta algo, el proceso muere al importar. Exporta `envs` |
| `index.ts` | `config` (la misma info agrupada: `config.server`, `config.jwt`, `config.cors`, …). Usar `config` o `envs`, nunca `process.env` |
| `sequelize.ts` | Instancia Sequelize de runtime: SSL solo en `production`, pool max 10, `underscored`, log por query con tiempo (nivel `debug`) |
| `database.ts` | Re-export de `sequelize` + `testConnection()` |
| `sequelize-cli.js` | Config CommonJS para `sequelize-cli` (migraciones y seeds). Carga el mismo `.env` por `APP_ENV`. SSL en `development` y `production`, no en `local` |
| `swagger.ts` | OpenAPI generado desde los comentarios `@swagger` de `*.routes.ts`; servido en `/doc` fuera de producción |

`api/.sequelizerc` apunta a `sequelize-cli.js`, `persistence/migrations` y `persistence/seeders`.

Lista completa de variables, defaults y valores por entorno: [`docs/environment-variables.md`](../../../docs/environment-variables.md).

## Agregar una variable

1. Campo en `envSchema` de `envs.ts` (con default o `.optional()` si no es obligatoria) y exponerla en `envs` / `config`.
2. `api/.env.example` y la tabla de `docs/environment-variables.md`.
3. Si CI la necesita para build o tests, agregarla a los `env:` de `.github/workflows/ci.yml`.
4. Railway (y Vercel si es `NEXT_PUBLIC_*`).

## Supabase y RLS

La API se conecta a Postgres como `postgres` vía Sequelize; supabase-js se usa solo para Storage. Row Level Security no aplica y el warning "RLS disabled" del dashboard es esperado: la autorización vive en los middlewares y domains de la API.
