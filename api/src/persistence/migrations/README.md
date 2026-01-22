# 📦 Migraciones de Base de Datos - Sequelize CLI + Supabase

## 📋 Índice

- [Descripción General](#descripción-general)
- [Configuración de Entornos](#configuración-de-entornos)
- [Comandos Disponibles](#comandos-disponibles)
- [Guía de Uso](#guía-de-uso)
- [Estructura de Migraciones](#estructura-de-migraciones)
- [Tablas Creadas](#tablas-creadas)
- [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

Este directorio contiene las **migraciones de Sequelize** para la base de datos PostgreSQL del Casino Management Platform, hosteada en **Supabase**.

**Stack:**
- **ORM**: Sequelize v6
- **CLI**: sequelize-cli
- **Base de datos**: PostgreSQL (Supabase)
- **Gestión de entornos**: dotenv + múltiples archivos .env

---

## 🔧 Configuración de Entornos

### Archivos de Entorno

El proyecto soporta múltiples entornos mediante archivos `.env`:

```
.env.local       → Supabase local (localhost:55322)
.env.development → Supabase dev/staging
.env.production  → Supabase producción
```

### Variables de Entorno Requeridas

Cada archivo `.env` debe contener:

```bash
# Node Environment
NODE_ENV=development  # o 'local' / 'production'

# Database URL - Formato Supabase
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Para Supabase local
# DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres
```

### Obtener la DATABASE_URL de Supabase

#### **Opción 1: Supabase Local**
```bash
# Iniciar Supabase local
npx supabase start

# Ver el status y obtener la DATABASE_URL
npx supabase status
# Busca la línea: DB URL: postgresql://postgres:postgres@localhost:55322/postgres
```

#### **Opción 2: Supabase Cloud (Dev/Prod)**
1. Ve a tu proyecto en https://supabase.com/dashboard
2. Navega a **Settings** → **Database**
3. Copia la **Connection String** en modo **Transaction** (puerto 6543)
4. Reemplaza `[YOUR-PASSWORD]` con tu contraseña real

**Formato correcto para Supabase Cloud:**
```
postgresql://postgres.abcdefghijk:[TU_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### ⚡ Direct Connection vs Transaction Pooler

**IMPORTANTE:** El puerto y host que uses depende de dónde vas a deployar:

#### 🚂 Para Railway/Heroku/Render (Servidores Persistentes)

**Usa Direct Connection - Puerto 5432:**

```bash
# .env.production
DATABASE_URL=postgresql://postgres:PASSWORD@db.abcdefgh.supabase.co:5432/postgres
#                                           ^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^
#                                           Host sin .pooler          Puerto 5432
```

**¿Por qué?**
- Railway corre tu app 24/7 (no es serverless)
- Sequelize ya maneja un pool de conexiones
- Mejor performance y acceso a todas las features de PostgreSQL
- Evita limitaciones del pooler (prepared statements, LISTEN/NOTIFY, etc.)

#### ☁️ Para Vercel/Netlify/Lambda (Serverless)

**Usa Transaction Pooler - Puerto 6543:**

```bash
# .env.production
DATABASE_URL=postgresql://postgres.abc:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
#                                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^
#                                                Host con .pooler                       Puerto 6543
```

**¿Por qué?**
- Las funciones serverless se levantan y apagan constantemente
- PgBouncer previene "too many connections"
- Ideal para workloads con picos de tráfico

#### 🧪 Para Desarrollo

```bash
# .env.local (Supabase local)
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres

# .env.development (Supabase Cloud dev)
# Puedes usar Transaction Pooler (6543) o Direct (5432)
# Para testing de serverless: usa 6543
# Para simular producción (Railway): usa 5432
```

#### 📊 Comparación Rápida

| Aspecto | Direct (5432) | Pooler (6543) |
|---------|---------------|---------------|
| **Host** | `db.PROJECT.supabase.co` | `aws-X-region.pooler.supabase.com` |
| **Para** | Railway, Heroku, Render | Vercel, Netlify, Lambda |
| **Prepared statements** | ✅ Sí | ❌ No |
| **LISTEN/NOTIFY** | ✅ Sí | ❌ No |
| **Pool** | Tu app (Sequelize) | Supabase (PgBouncer) |
| **Performance** | Mejor para long-lived | Mejor para short-lived |

**Regla simple:** ¿Tu app corre 24/7? Usa puerto 5432. ¿Es serverless? Usa puerto 6543.

---

## 🎯 Comandos Disponibles

### Migraciones

```bash
# Crear una nueva migración
npm run migration:new -- nombre-de-la-migracion
# Ejemplo: npm run migration:new -- add-user-status

# Ver estado de migraciones
npm run migration:status

# Ejecutar migraciones pendientes
npm run migration:run
# o
npm run db:migrate

# Revertir última migración
npm run migration:undo
# o
npm run db:migrate:undo

# Revertir TODAS las migraciones (⚠️ PELIGROSO)
npm run migration:undo:all
```

### Seeds

```bash
# Crear un nuevo seed
npm run seed:new -- nombre-del-seed
# Ejemplo: npm run seed:new -- add-test-users

# Ejecutar todos los seeds
npm run seed:run
# o
npm run db:seed

# Revertir todos los seeds
npm run seed:undo
```

### Comandos Combinados

```bash
# Reset completo: deshacer todo y volver a migrar
npm run db:reset

# Fresh start: reset + seeds
npm run db:fresh
```

---

## 📚 Guía de Uso

### Paso 1: Configurar tu Entorno

#### Para trabajar con Supabase **LOCAL**:

```bash
# 1. Copiar el archivo de ejemplo
cp .env.example .env.local

# 2. Iniciar Supabase local
npx supabase start

# 3. Obtener la DATABASE_URL
npx supabase status
# Copia el "DB URL" y pégalo en .env.local

# 4. Ejecutar con entorno local
npm run dev:local
```

#### Para trabajar con Supabase **DEV/STAGING**:

```bash
# 1. Crear archivo .env.development
cp .env.example .env.development

# 2. Editar .env.development
nano .env.development  # o usa tu editor favorito

# 3. Agregar tu DATABASE_URL de Supabase Cloud
NODE_ENV=development
DATABASE_URL=postgresql://postgres.TU_PROJECT_REF:TU_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# 4. Ejecutar con entorno development
npm run dev:development
```

### Paso 2: Ejecutar Migraciones

```bash
# 1. Verificar qué migraciones están pendientes
APP_ENV=development npm run migration:status

# Salida esperada:
# up 20250101000001-create-users.js
# up 20250101000002-create-balances.js
# down 20250101000003-create-sessions.js  ← Esta está pendiente

# 2. Ejecutar migraciones pendientes
APP_ENV=development npm run migration:run

# 3. Verificar que se aplicaron correctamente
APP_ENV=development npm run migration:status
```

### Paso 3: Ejecutar Seeds (Datos de Prueba)

```bash
# Ejecutar todos los seeds
APP_ENV=development npm run seed:run

# Esto creará el usuario OWNER por defecto:
# Username: owner
# Password: password
# Email: owner@casino.com
```

### Paso 4: Verificar en Supabase

#### Supabase Local:
```bash
# Abrir el Dashboard local
npx supabase status
# Abre: http://127.0.0.1:54323

# O conectarte con psql
psql postgresql://postgres:postgres@localhost:55322/postgres
\dt  # Ver todas las tablas
```

#### Supabase Cloud:
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. **Table Editor** → Verifica que tus tablas existen
4. **SQL Editor** → Ejecuta:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

---

## 🗂️ Estructura de Migraciones

### Archivos de Migración Actuales

```
migrations/
├── 20250101000001-create-users.js                      # Usuarios jerárquicos
├── 20250101000002-create-balances.js                   # Balances de chips
├── 20250101000003-create-sessions.js                   # Sesiones activas
├── 20250101000004-create-chip-movements.js             # Movimientos de chips
├── 20250101000005-create-cashier-compensation-modes.js # Compensación cajeros
├── 20250101000006-create-cashier-settlements.js        # Liquidaciones cajeros
├── 20250101000007-create-chip-panels.js                # Paneles de compensación
├── 20250101000008-create-recoveries.js                 # Recuperaciones
├── 20250101000009-create-user-game-provider-blocklist.js # Blocklist proveedores
├── 20250101000010-create-audit-logs.js                 # Logs de auditoría
├── 20250101000011-create-triggers-and-functions.js     # Triggers y funciones PG
├── 20250101000012-create-games.js                      # Juegos
└── 20250101000013-create-bets.js                       # Apuestas
```

### Anatomía de una Migración

```javascript
module.exports = {
  // Ejecutado al correr "npm run migration:run"
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true
      },
      // ... más columnas
    });
  },

  // Ejecutado al correr "npm run migration:undo"
  async down(queryInterface) {
    await queryInterface.dropTable('users');
  }
};
```

### Crear una Nueva Migración

```bash
# Generar archivo de migración
npm run migration:new -- add-column-to-users

# Esto crea: migrations/20250110123456-add-column-to-users.js
```

Edita el archivo generado:

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'phone_number', {
      type: Sequelize.STRING(20),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'phone_number');
  }
};
```

Ejecuta la migración:
```bash
APP_ENV=development npm run migration:run
```

---

## 🗄️ Tablas Creadas

| Tabla | Descripción | Registros Iniciales |
|-------|-------------|---------------------|
| `users` | Usuarios con jerarquía (OWNER → MASTER → ADMIN → CASHIER → PLAYER) | 0 (seed crea owner) |
| `balances` | Balance de chips por usuario | 0 |
| `chip_movements` | Historial de transacciones de chips | 0 |
| `sessions` | Sesiones activas JWT | 0 |
| `cashier_compensation_modes` | Modos de compensación para cajeros | 0 |
| `cashier_settlements` | Liquidaciones periódicas de cajeros | 0 |
| `chip_panels` | Paneles de compensación | 0 |
| `recoveries` | Operaciones de recuperación | 0 |
| `user_game_provider_blocklist` | Proveedores bloqueados por usuario | 0 |
| `audit_logs` | Log de auditoría del sistema | 0 |
| `games` | Catálogo de juegos | 0 |
| `bets` | Apuestas realizadas | 0 |

### Extensiones de PostgreSQL

Las migraciones instalan estas extensiones:
- `uuid-ossp` - Generación de UUIDs
- `pgcrypto` - Funciones de encriptación

---

## 🔍 Troubleshooting

### ❌ Error: "Unable to connect to database"

**Problema**: sequelize-cli no puede conectarse a Supabase.

**Soluciones**:

1. **Verifica que estás usando el entorno correcto:**
   ```bash
   # Verifica qué .env está cargando
   APP_ENV=development npm run migration:status
   ```

2. **Verifica tu DATABASE_URL:**
   ```bash
   # En .env.development o .env.local
   echo $DATABASE_URL  # Linux/Mac
   # O abre el archivo y verifica manualmente
   ```

3. **Formato correcto de Supabase Cloud:**
   ```
   ✅ CORRECTO para Railway/Heroku/Render:
   postgresql://postgres:PASSWORD@db.abcdefgh.supabase.co:5432/postgres

   ✅ CORRECTO para Vercel/Netlify/Lambda:
   postgresql://postgres.abcdefgh:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

   ❌ INCORRECTO (puerto incorrecto para tu entorno):
   # Usando pooler (6543) en Railway → puede causar problemas
   # Usando direct (5432) en Vercel → puede agotar conexiones
   ```

   **Ver sección [Direct Connection vs Transaction Pooler](#-direct-connection-vs-transaction-pooler) arriba.**

4. **Verifica SSL:**
   - **Supabase Cloud** requiere SSL
   - **Supabase Local** NO requiere SSL

   El archivo `src/config/sequelize-cli.js` ya maneja esto:
   ```javascript
   production: {
     dialectOptions: {
       ssl: { require: true, rejectUnauthorized: false }
     }
   }
   ```

5. **Prueba la conexión manualmente:**
   ```bash
   # Con psql
   psql "postgresql://postgres.abcd:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

   # Con node
   node -e "const { Sequelize } = require('sequelize'); const seq = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }); seq.authenticate().then(() => console.log('✅ Conectado')).catch(err => console.error('❌ Error:', err));"
   ```

### ❌ Error: "SequelizeMeta table doesn't exist"

**Solución**: Es normal en la primera ejecución. Sequelize creará esta tabla automáticamente.

```bash
npm run migration:run
```

### ❌ Error: "Migration XXX has already been executed"

**Problema**: Intentas ejecutar una migración que ya corrió.

**Solución**:
```bash
# Ver estado
npm run migration:status

# Si necesitas re-ejecutar, primero deshaz
npm run migration:undo

# Luego ejecuta de nuevo
npm run migration:run
```

### ❌ Error: "uuid_generate_v4() function does not exist"

**Problema**: La extensión `uuid-ossp` no está instalada.

**Solución**: Ejecuta en SQL Editor de Supabase:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### ⚠️ Diferencias entre Supabase Local y Cloud

| Aspecto | Local | Cloud Dev | Cloud Prod (Railway) | Cloud Prod (Vercel) |
|---------|-------|-----------|----------------------|---------------------|
| **Puerto** | 55322 | 6543 o 5432 | **5432 (Direct)** ✅ | **6543 (Pooler)** ✅ |
| **SSL** | No | Sí | Sí | Sí |
| **Host** | localhost | `.pooler.supabase.com` o `db.X.supabase.co` | `db.X.supabase.co` | `.pooler.supabase.com` |
| **Password** | postgres | Tu password | Tu password | Tu password |
| **NODE_ENV** | local | development | production | production |
| **Tipo** | Direct | Flexible | **Direct Connection** | **Transaction Pooler** |

**Resumen:**
- **Local**: Siempre puerto 55322, sin SSL
- **Dev**: Puedes usar cualquier puerto (6543 o 5432) según lo que quieras testear
- **Producción Railway/Heroku**: Puerto 5432 (Direct Connection)
- **Producción Vercel/Netlify**: Puerto 6543 (Transaction Pooler)

---

## 🎓 Mejores Prácticas

### ✅ DO's

- ✅ Usa `APP_ENV` para especificar el entorno al correr comandos
- ✅ Prueba migraciones en `local` antes de aplicar en `development`
- ✅ Incluye `down()` en todas tus migraciones para revertir cambios
- ✅ Usa transacciones en migraciones complejas
- ✅ Versionas las migraciones en git
- ✅ Documenta cambios significativos en comentarios

### ❌ DON'Ts

- ❌ NO edites migraciones ya ejecutadas en producción
- ❌ NO uses `migration:undo:all` en producción
- ❌ NO compartas archivos `.env` (solo `.env.example`)
- ❌ NO hagas commits de credenciales reales
- ❌ NO corras migraciones directamente en prod sin probar

---

## 📞 Recursos Adicionales

- [Sequelize CLI Docs](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 🔐 Cuenta Owner por Defecto

El seed `20250101000001-create-owner.js` crea una cuenta de propietario:

```
Username: owner
Password: password
Email: owner@casino.com
Role: OWNER
```

**⚠️ IMPORTANTE:** Cambia esta contraseña inmediatamente en producción usando:

```bash
# En Supabase SQL Editor o desde tu API
UPDATE users
SET password_hash = crypt('nueva_password_segura', gen_salt('bf'))
WHERE username = 'owner';
```
