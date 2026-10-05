# Migraciones y seeds (Sequelize CLI)

Postgres en Supabase. Migraciones en JS plano (`module.exports = { up, down }`), nombradas `YYYYMMDDHHMMSS-descripcion.js`, aplicadas en orden y registradas en la tabla `SequelizeMeta`. Lista actual: `ls api/src/persistence/migrations`.

## Comandos (desde la raíz)

```bash
pnpm --filter api migration:status        # up / down por archivo
pnpm --filter api db:migrate              # aplica las pendientes
pnpm --filter api db:migrate:undo         # revierte la última
pnpm --filter api migration:new <nombre>  # crea <timestamp>-<nombre>.js
pnpm --filter api db:seed                 # corre seeders/ (crea el owner)
pnpm --filter api db:seed:undo
pnpm --filter api db:reset                # undo:all + migrate (solo local)
```

Contra qué DB: la de `api/.env.<APP_ENV>` (`local` por default). Por ejemplo, contra producción desde tu máquina con un `api/.env.production` local no commiteado:

```bash
APP_ENV=production pnpm --filter api migration:status
APP_ENV=production pnpm --filter api db:migrate
```

SSL (`src/config/sequelize-cli.js`): activado en `development` y `production`, apagado en `local`. Supabase cloud exige SSL, así que `APP_ENV=local` contra cloud falla. Desde Railway usar el pooler de Supabase (ver `docs/environment-variables.md`).

Railway no corre migraciones en el deploy: correrlas a mano **antes** de mergear código que las necesite. CI sí las corre contra un `postgres:17` limpio antes de los tests, así que una migración rota frena el PR.

## Escribir una migración

```js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'phone', { type: Sequelize.STRING(20), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'phone');
  }
};
```

Reglas:

- Siempre un `down()` real. CI y `db:reset` dependen de eso.
- Nunca editar una migración ya aplicada en otro entorno; crear una nueva.
- ENUMs de Postgres: `ALTER TYPE … ADD VALUE` no se puede revertir; documentarlo en el `down()`.
- Varias sentencias → envolverlas en `queryInterface.sequelize.transaction()`.
- Después de migrar, actualizar el `*.model.ts` de la feature y los tipos en `helper/src/types`, y correr `pnpm --filter helper build`.
- Columnas en `snake_case`; los modelos usan `underscored: true`.

## Seeds

`seeders/20250101000001-create-owner.js` crea, si no existe ningún `OWNER`:

```
username: owner   password: password   email: owner@casino.com
```

Cambiar esa contraseña en cualquier entorno compartido (desde el backoffice o `POST /api/auth/change-password`). Las variables `ADMIN_*` del `.env` no intervienen.

## Tablas

Negocio activo: `users`, `balances`, `chip_movements`, `sessions`, `audit_logs`, `games`, `providers`, `game_types`, `provider_game_type_orders`, `game_images`, `game_banners`, `featured_games`, `casino_settings`, `user_favorite_games`, `bets` (juegos nativos), `user_provider_profiles`, `provider_transactions`, `game_launches` (21Viral).

Creadas por el PRD original pero hoy sin lógica ni endpoints: `cashier_compensation_modes`, `cashier_settlements`, `chip_panels`, `recoveries`, `user_game_provider_blocklist`.

Extensiones: `uuid-ossp`, `pgcrypto`, `pg_trgm` (índice GIN sobre `games.name` para la búsqueda).

## Problemas frecuentes

| Error | Causa / fix |
|---|---|
| `Unable to connect to database` | `DATABASE_URL` del `.env` equivocado, o `APP_ENV=local` contra Supabase cloud (sin SSL) |
| `SequelizeMeta table doesn't exist` | Normal la primera vez; `db:migrate` la crea |
| `uuid_generate_v4() does not exist` | Falta `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`; las migraciones lo crean, en una DB armada a mano correrlo antes |
| `Migration X has already been executed` | Está en `SequelizeMeta`: `db:migrate:undo` y volver a aplicar, o crear una nueva |
| Modelo y tabla desincronizados | Faltó migrar en ese entorno: `migration:status` |
