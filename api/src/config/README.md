# ⚙️ Configuración del Proyecto - Multi-Environment Setup

## 📋 Índice

- [Descripción General](#descripción-general)
- [Archivos de Configuración](#archivos-de-configuración)
- [Sistema de Entornos](#sistema-de-entornos)
- [Variables de Entorno](#variables-de-entorno)
- [Uso en la Aplicación](#uso-en-la-aplicación)
- [Configuración de Sequelize](#configuración-de-sequelize)
- [Troubleshooting](#troubleshooting)

---

## 📖 Descripción General

Este directorio contiene todos los archivos de configuración de la API. El proyecto utiliza un **sistema multi-entorno** que permite trabajar con diferentes bases de datos y configuraciones dependiendo del entorno (local, development, production).

**Arquitectura:**
- ✅ Validación de variables de entorno con **Zod**
- ✅ Soporte para múltiples entornos mediante archivos `.env`
- ✅ Tipado fuerte con TypeScript
- ✅ Configuración centralizada
- ✅ Separación de config para Sequelize (runtime) y Sequelize CLI (migrations)

---

## 📂 Archivos de Configuración

```
src/config/
├── envs.ts              # Sistema de entornos + validación con Zod (⭐ PRINCIPAL)
├── index.ts             # Exporta toda la configuración centralizada
├── database.ts          # Exporta instancia de Sequelize
├── sequelize.ts         # Crea instancia de Sequelize con config
├── sequelize-cli.js     # Config para sequelize-cli (migraciones/seeds)
└── swagger.ts           # Configuración de Swagger/OpenAPI
```

### 🎯 `envs.ts` - Configuración Principal

Este es el archivo **más importante**. Contiene:

1. **Sistema de entornos**: Determina qué archivo `.env` cargar
2. **Validación con Zod**: Valida todas las variables de entorno
3. **Tipado fuerte**: Exporta objeto `envs` con tipos de TypeScript
4. **Helper functions**: Como `getDatabaseUrl()` que selecciona la URL correcta

**Características:**
- Usa `APP_ENV` o `NODE_ENV` para determinar el entorno
- Carga automáticamente `.env.local`, `.env.development`, o `.env.production`
- Falla rápido si faltan variables requeridas
- Provee valores por defecto seguros

### 🔧 `sequelize-cli.js` - Config para Migraciones

Este archivo es **específico para Sequelize CLI** (usado en migraciones y seeds).

**¿Por qué un archivo separado?**
- Sequelize CLI requiere **CommonJS** (`.js` con `module.exports`)
- No puede usar TypeScript directamente
- Necesita config sincrónica al arrancar

**Configuración por entorno:**
```javascript
{
  local: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: false }  // Sin SSL para local
  },
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: false }  // Ajustar según tu Supabase dev
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }  // SSL requerido
    }
  }
}
```

### 🗄️ `sequelize.ts` - Instancia de Sequelize

Crea la instancia de Sequelize usada en **runtime** (cuando tu app está corriendo).

**Configuración:**
- Pool de conexiones (max: 10)
- SSL automático en producción
- Logging solo en development
- Snake_case para nombres de columnas auto-generadas

### 📚 `index.ts` - Exportaciones Centralizadas

Re-exporta toda la configuración para importar fácilmente:

```typescript
import { config } from '@/config';

// Acceso a todas las configs
config.server.port
config.database.url
config.jwt.secret
```

---

## 🌍 Sistema de Entornos

### Entornos Soportados

El proyecto soporta 4 entornos:

| Entorno | Archivo | Uso |
|---------|---------|-----|
| `local` | `.env.local` | Desarrollo local con Supabase local |
| `development` | `.env.development` | Servidor de dev/staging (Supabase Cloud) |
| `production` | `.env.production` | Producción (Supabase Cloud) |
| `test` | `.env.test` | Testing (opcional) |

### Cómo se Determina el Entorno

El sistema lee las variables en este orden de prioridad:

```
1. APP_ENV      (máxima prioridad)
2. NODE_ENV     (si APP_ENV no está definido)
3. 'local'      (valor por defecto)
```

**Ejemplos:**

```bash
# Usar entorno local (default)
npm run dev
npm run dev:local

# Forzar entorno development
APP_ENV=development npm run dev
npm run dev:development

# Forzar entorno production
APP_ENV=production npm run dev
npm run dev:prod

# Para migraciones
APP_ENV=development npm run migration:run
```

### Estructura de Archivos `.env`

#### `.env.local` - Desarrollo Local
```bash
NODE_ENV=local
PORT=3001
API_URL=http://localhost:3001

# Supabase Local (obtén con: npx supabase status)
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres

# JWT Secrets (genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=tu-secret-de-al-menos-32-caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu-refresh-secret-de-al-menos-32-caracteres
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=tu-session-secret-de-al-menos-32-caracteres

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Admin por defecto
ADMIN_EMAIL=admin@casino.local
ADMIN_PASSWORD=ChangeThis123!
ADMIN_USERNAME=admin

# Supabase Local Keys
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

#### `.env.development` - Supabase Cloud Dev
```bash
NODE_ENV=development
PORT=3001
API_URL=https://api-dev.tudominio.com

# Supabase Cloud - Dev Project
# Obtén de: https://supabase.com/dashboard → Settings → Database
DATABASE_URL=postgresql://postgres.abcdefghijk:TU_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# JWT Secrets - DIFERENTES A LOCAL
JWT_SECRET=tu-secret-dev-diferente-y-seguro
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=tu-refresh-secret-dev-diferente
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret - DIFERENTE A LOCAL
SESSION_SECRET=tu-session-secret-dev-diferente

# CORS - Dominios de dev
ALLOWED_ORIGINS=https://dev.tudominio.com,https://api-dev.tudominio.com

# Admin de dev
ADMIN_EMAIL=admin@dev.tudominio.com
ADMIN_PASSWORD=SecureDevPassword123!
ADMIN_USERNAME=admin

# Supabase Cloud Keys - Dev Project
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...  # Copia de Supabase Dashboard
SUPABASE_SERVICE_KEY=eyJhbGci...  # Copia de Supabase Dashboard
```

#### `.env.production` - Producción
```bash
NODE_ENV=production
PORT=3001
API_URL=https://api.tudominio.com

# Supabase Cloud - Production Project
DATABASE_URL=postgresql://postgres.xyzprod:SUPER_SECRET_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# JWT Secrets - MÁXIMA SEGURIDAD
JWT_SECRET=secret-de-produccion-super-seguro-64-caracteres-minimo
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=refresh-secret-produccion-super-seguro-64-caracteres
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=session-secret-produccion-super-seguro-64-caracteres

# CORS - Solo dominio de producción
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com

# NO INCLUIR ADMIN_PASSWORD en producción
# Crea el admin manualmente después del deploy

# Supabase Production Keys
SUPABASE_URL=https://xyzprod.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...  # ¡NUNCA COMPARTAS ESTA KEY!
```

---

## 🔐 Variables de Entorno

### Variables Requeridas

Estas variables **deben existir** o la app no arrancará:

| Variable | Tipo | Descripción | Ejemplo |
|----------|------|-------------|---------|
| `DATABASE_URL` | string | URL de conexión PostgreSQL | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | string (min 32) | Secret para tokens JWT | Generar con crypto |
| `JWT_REFRESH_SECRET` | string (min 32) | Secret para refresh tokens | Generar con crypto |
| `SESSION_SECRET` | string (min 32) | Secret para sesiones | Generar con crypto |

### Variables Opcionales con Defaults

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `'local'` | Entorno de ejecución |
| `PORT` | `3001` | Puerto del servidor |
| `API_URL` | `'http://localhost:3001'` | URL base de la API |
| `JWT_EXPIRES_IN` | `'15m'` | Duración del token JWT |
| `JWT_REFRESH_EXPIRES_IN` | `'7d'` | Duración del refresh token |
| `ALLOWED_ORIGINS` | `'http://localhost:3000'` | Orígenes CORS (separados por coma) |

### Variables de Supabase (Opcionales)

Solo necesarias si usas `@supabase/supabase-js` directamente:

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Key pública de Supabase |
| `SUPABASE_SERVICE_KEY` | Key privada de Supabase (⚠️ SECRETA) |

### Cómo Generar Secrets Seguros

```bash
# Generar un secret de 32 bytes (64 caracteres hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar un secret de 64 bytes (128 caracteres hex) para producción
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar múltiples secrets a la vez
node -e "for(let i=0; i<3; i++) console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Obtener Credenciales de Supabase

#### Supabase Local:
```bash
# Iniciar Supabase local
npx supabase start

# Ver todas las credenciales
npx supabase status
```

Busca estas líneas:
```
API URL: http://127.0.0.1:55321
DB URL: postgresql://postgres:postgres@localhost:55322/postgres
anon key: eyJhbGci...
service_role key: eyJhbGci...
```

#### Supabase Cloud:
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. **Settings** → **Database**:
   - Connection string (Transaction mode, puerto 6543)
4. **Settings** → **API**:
   - Project URL
   - anon/public key
   - service_role key (⚠️ secreta)

### ⚡ Direct Connection vs Transaction Pooler

**¿Qué puerto usar en DATABASE_URL?**

Supabase ofrece dos tipos de conexión:

| Tipo | Puerto | Host | Cuándo usar |
|------|--------|------|-------------|
| **Direct Connection** | 5432 | `db.PROJECT_REF.supabase.co` | Servidores persistentes (Railway, Heroku, Render, DigitalOcean) |
| **Transaction Pooler** | 6543 | `aws-X-region.pooler.supabase.com` | Serverless (Vercel, Netlify, Lambda, Edge Functions) |

#### 🚂 Para Servidores Persistentes (Railway, Heroku, etc.)

**Usa Direct Connection (puerto 5432):**

```bash
# .env.production (Railway, Heroku, Render, etc.)
DATABASE_URL=postgresql://postgres:PASSWORD@db.abcdefgh.supabase.co:5432/postgres
#                                                                    ^^^^ puerto 5432
```

**Razones:**
- ✅ Tu app corre 24/7 con conexiones persistentes
- ✅ Sequelize ya maneja un pool de conexiones (max: 10)
- ✅ Mejor performance para conexiones largas
- ✅ Acceso a todas las features de PostgreSQL (prepared statements, LISTEN/NOTIFY, etc.)
- ✅ Menor latencia

#### ☁️ Para Serverless (Vercel, Netlify, Lambda)

**Usa Transaction Pooler (puerto 6543):**

```bash
# .env.production (Vercel, Netlify Functions, Lambda)
DATABASE_URL=postgresql://postgres.abcdefgh:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
#                                                                                          ^^^^ puerto 6543
```

**Razones:**
- ✅ Las funciones serverless se levantan y apagan constantemente
- ✅ PgBouncer maneja el pool de conexiones por ti
- ✅ Evita el problema de "too many connections"
- ✅ Ideal para workloads con picos de tráfico

#### 🧪 Para Desarrollo Local/Dev

Puedes usar cualquiera, pero:

```bash
# .env.local (Supabase local)
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres
# Puerto: 55322 (Supabase local no tiene pooler)

# .env.development (Supabase Cloud dev)
# Puedes usar Transaction Pooler para simular serverless:
DATABASE_URL=postgresql://postgres.abc:PASS@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# O Direct Connection si prefieres:
DATABASE_URL=postgresql://postgres:PASS@db.abc.supabase.co:5432/postgres
```

#### ⚠️ Limitaciones del Transaction Pooler

Si usas el Transaction Pooler (puerto 6543), NO podrás usar:

- ❌ Prepared statements persistentes
- ❌ LISTEN/NOTIFY (real-time a nivel de BD)
- ❌ Advisory locks
- ❌ Transacciones largas
- ❌ Cursores con hold

**Para Railway/Heroku/Render, SIEMPRE usa Direct Connection (5432).**

#### 📋 Resumen Rápido

```bash
# LOCAL
postgresql://postgres:postgres@localhost:55322/postgres

# DEV (Supabase Cloud - testing)
postgresql://postgres.dev:PASS@aws-0-us-west-1.pooler.supabase.com:6543/postgres
# Puedes usar pooler o direct (6543 o 5432)

# PRODUCTION - Railway/Heroku/Render ✅
postgresql://postgres:PASS@db.prod123.supabase.co:5432/postgres
# ⚠️ Usa puerto 5432 (Direct Connection)

# PRODUCTION - Vercel/Netlify/Lambda ✅
postgresql://postgres.prod123:PASS@aws-0-us-east-1.pooler.supabase.com:6543/postgres
# ⚠️ Usa puerto 6543 (Transaction Pooler)
```

---

## 💻 Uso en la Aplicación

### Importar Configuración

```typescript
// Opción 1: Importar todo el objeto envs
import { envs } from '@/config/envs';

console.log(envs.PORT);                    // 3001
console.log(envs.DATABASE_URL);            // postgresql://...
console.log(envs.isProduction);            // false
console.log(envs.jwt.secret);              // tu-jwt-secret
console.log(envs.cors.allowedOrigins);     // ['http://localhost:3000']

// Opción 2: Importar desde index (objeto config)
import { config } from '@/config';

console.log(config.server.port);           // 3001
console.log(config.database.url);          // postgresql://...
console.log(config.jwt.secret);            // tu-jwt-secret
```

### Ejemplo: Usar en un Controller

```typescript
import { envs } from '@/config/envs';
import jwt from 'jsonwebtoken';

export class AuthController {
  async login(req: Request, res: Response) {
    // Usar la configuración validada
    const token = jwt.sign(
      { userId: user.id },
      envs.jwt.secret,              // ✅ Tipado + validado
      { expiresIn: envs.jwt.expiresIn }
    );

    res.json({ token });
  }
}
```

### Ejemplo: Condicionales por Entorno

```typescript
import { envs } from '@/config/envs';

// Logs solo en desarrollo
if (envs.isDevelopment || envs.isLocal) {
  console.log('Query ejecutada:', query);
}

// Configuración específica por entorno
const cacheConfig = {
  ttl: envs.isProduction ? 3600 : 60,  // 1h en prod, 1min en dev
  maxSize: envs.isProduction ? 1000 : 10
};
```

### Ejemplo: Usar Instancia de Sequelize

```typescript
import { sequelize } from '@/config/database';
import { User } from '@/persistence/models';

// La instancia ya está configurada con pool, SSL, etc.
async function findUser(id: string) {
  return await User.findByPk(id);
}

// Test de conexión
import { testConnection } from '@/config/database';

testConnection()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('DB error:', err));
```

---

## 🗄️ Configuración de Sequelize

### Para Runtime (App Corriendo)

Usa `src/config/sequelize.ts`:

```typescript
import { Sequelize } from 'sequelize';
import { config } from './index';

export const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',

  // SSL automático en producción
  dialectOptions: {
    ssl: config.server.env === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },

  // Pool de conexiones
  pool: {
    max: 10,        // Máximo 10 conexiones simultáneas
    min: 0,         // Mínimo 0 (crear bajo demanda)
    acquire: 30000, // Timeout 30s para adquirir conexión
    idle: 10000     // Cerrar conexión después de 10s idle
  },

  // Logging
  logging: config.server.env === 'development' ? console.log : false,

  // Convenciones de nombres
  define: {
    timestamps: true,
    underscored: true,        // created_at, updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});
```

### Para Sequelize CLI (Migraciones/Seeds)

Usa `src/config/sequelize-cli.js`:

```javascript
require('dotenv').config({ path: '.env.local' });  // Carga .env.local por defecto

module.exports = {
  // Para desarrollo local
  local: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55322/postgres',
    dialect: 'postgres',
    dialectOptions: { ssl: false }
  },

  // Para Supabase dev
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: false }  // Cambiar a true si tu Supabase dev requiere SSL
  },

  // Para producción
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
  }
};
```

### Diferencia entre `sequelize.ts` y `sequelize-cli.js`

| Aspecto | `sequelize.ts` | `sequelize-cli.js` |
|---------|----------------|-------------------|
| **Propósito** | Runtime (app corriendo) | CLI (migraciones/seeds) |
| **Formato** | TypeScript + ESM | JavaScript + CommonJS |
| **Importación** | `import { sequelize }` | `module.exports` |
| **Cuándo se usa** | Al iniciar la app | Al correr `npm run migration:run` |
| **Carga .env** | Automática (via envs.ts) | Manual (requiere `dotenv.config()`) |
| **Config avanzada** | Pool, logging, define | Solo lo mínimo |

---

## 🔍 Troubleshooting

### ❌ Error: "Invalid environment variables"

**Problema**: Falta una variable requerida o no cumple validación.

**Solución**:
```bash
# El error muestra qué variables faltan
❌ Invalid environment variables:
{
  DATABASE_URL: ['Required'],
  JWT_SECRET: ['String must contain at least 32 character(s)']
}

# Verifica tu archivo .env
cat .env.local

# Asegúrate de que todas las variables requeridas existen
```

### ❌ Error: "Could not load .env.development"

**Problema**: No existe el archivo `.env.development` y intentas usar ese entorno.

**Solución**:
```bash
# Crear el archivo desde el ejemplo
cp .env.example .env.development

# Editar con tus credenciales
nano .env.development
```

### ❌ Error: Migraciones usan DATABASE_URL incorrecta

**Problema**: `sequelize-cli` está leyendo `.env.local` en lugar de `.env.development`.

**Causa**: El archivo `sequelize-cli.js` carga `.env.local` por defecto.

**Solución Temporal**: Edita `src/config/sequelize-cli.js`:
```javascript
// Cambiar esta línea:
require('dotenv').config({ path: '.env.local' });

// A:
require('dotenv').config({
  path: process.env.APP_ENV === 'development'
    ? '.env.development'
    : '.env.local'
});
```

**Solución Permanente**: Usar variables de entorno al ejecutar:
```bash
# Cargar manualmente el .env correcto
set -a; source .env.development; set +a  # Linux/Mac
# O en Windows
$env:DATABASE_URL="postgresql://..."     # PowerShell

# Luego ejecutar migración
npm run migration:run
```

### ❌ Error: "Sequelize instance already initialized"

**Problema**: Importaste la instancia de Sequelize múltiples veces.

**Solución**: Siempre importar desde el mismo lugar:
```typescript
// ✅ CORRECTO
import { sequelize } from '@/config/database';

// ❌ INCORRECTO
import { Sequelize } from 'sequelize';
const sequelize = new Sequelize(...);  // No crear instancias nuevas
```

### ⚠️ Warning: "Environment file not found"

```
⚠️  Could not load .env.development, falling back to default .env
```

**Causa**: El archivo `.env.development` no existe.

**Solución**:
```bash
# Crear archivo
cp .env.example .env.development

# Configurar con credenciales de dev
nano .env.development
```

### 🔧 Debug: Ver qué configuración está cargada

```typescript
// En src/server.ts o cualquier archivo
import { envs } from '@/config/envs';

console.log('🔧 Environment:', envs.NODE_ENV);
console.log('🔧 Port:', envs.PORT);
console.log('🔧 Database URL:', envs.DATABASE_URL.substring(0, 50) + '...');
console.log('🔧 Is Production:', envs.isProduction);
```

El sistema ya hace esto automáticamente en desarrollo (ver `envs.ts:198`).

---

## 🎓 Mejores Prácticas

### ✅ DO's

- ✅ **Generar secrets únicos** para cada entorno (local, dev, prod)
- ✅ **Usar APP_ENV** para forzar entornos: `APP_ENV=development npm run dev`
- ✅ **Verificar configuración** al iniciar la app (ver logs de envs.ts)
- ✅ **Usar el objeto `envs`** en toda la app en lugar de `process.env`
- ✅ **Validar en desarrollo** que todas las variables existen antes de deploy
- ✅ **Commitear `.env.example`** actualizado con todas las variables necesarias

### ❌ DON'Ts

- ❌ **NO commitear** archivos `.env.local`, `.env.development`, `.env.production`
- ❌ **NO usar** `process.env.VARIABLE` directamente (usa `envs.variable`)
- ❌ **NO compartir** `SUPABASE_SERVICE_KEY` ni JWT secrets
- ❌ **NO reutilizar** secrets entre entornos (cada uno debe ser único)
- ❌ **NO hardcodear** configuración (siempre usar variables de entorno)
- ❌ **NO ignorar** errores de validación de Zod

---

## 📞 Referencias

- **Zod**: https://zod.dev/
- **dotenv**: https://github.com/motdotla/dotenv
- **Sequelize Config**: https://sequelize.org/docs/v6/other-topics/migrations/#configuration
- **Supabase Connection Strings**: https://supabase.com/docs/guides/database/connecting-to-postgres

---

## 🔄 Workflows Comunes

### Workflow 1: Setup inicial en local

```bash
# 1. Copiar ejemplo
cp .env.example .env.local

# 2. Iniciar Supabase local
npx supabase start

# 3. Copiar DATABASE_URL del output
# Pegar en .env.local

# 4. Generar secrets
node -e "for(let i=0; i<3; i++) console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. Pegar secrets en .env.local (JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET)

# 6. Ejecutar migraciones
npm run migration:run

# 7. Ejecutar seeds
npm run seed:run

# 8. Iniciar app
npm run dev
```

### Workflow 2: Conectar a Supabase dev por primera vez

```bash
# 1. Crear archivo de dev
cp .env.example .env.development

# 2. Obtener DATABASE_URL de Supabase Dashboard
# Settings → Database → Connection string (Transaction mode, puerto 6543)

# 3. Editar .env.development
nano .env.development
# Pegar DATABASE_URL
# NODE_ENV=development

# 4. Generar nuevos secrets (¡diferentes a local!)
node -e "for(let i=0; i<3; i++) console.log(require('crypto').randomBytes(32).toString('hex'))"

# 5. Ejecutar migraciones en dev
APP_ENV=development npm run migration:run

# 6. Ejecutar seeds en dev
APP_ENV=development npm run seed:run

# 7. Iniciar app en modo dev
npm run dev:development
```

### Workflow 3: Deploy a Railway (Servidor Persistente)

```bash
# 1. Crear .env.production localmente (NO COMMITEAR)
cp .env.example .env.production

# 2. Obtener DATABASE_URL de Supabase
# Settings → Database → Connection string
# ⚠️ IMPORTANTE: Usa "Direct connection" puerto 5432, NO transaction pooler
# Formato: postgresql://postgres:PASS@db.PROJECT.supabase.co:5432/postgres

# 3. Configurar .env.production
nano .env.production

NODE_ENV=production
DATABASE_URL=postgresql://postgres:PASS@db.abc123.supabase.co:5432/postgres
# ⚠️ Nota el puerto 5432 y host db.abc123.supabase.co (sin .pooler)

JWT_SECRET=secret-produccion-64-caracteres-generado-con-crypto
JWT_REFRESH_SECRET=refresh-secret-produccion-64-caracteres
SESSION_SECRET=session-secret-produccion-64-caracteres
ALLOWED_ORIGINS=https://tudominio.com

# 4. Generar secrets de producción
node -e "for(let i=0; i<3; i++) console.log(require('crypto').randomBytes(64).toString('hex'))"

# 5. En Railway Dashboard:
# Variables → Add Variable
# Agregar todas las variables de .env.production

# 6. Ejecutar migraciones en producción (desde tu máquina local)
APP_ENV=production npm run migration:run

# 7. Verificar que todo está correcto
APP_ENV=production npm run migration:status

# 8. Deploy a Railway
git push origin main
# Railway detectará el push y hará el deploy automáticamente
```

### Workflow 4: Deploy a Vercel (Serverless)

```bash
# 1. Crear .env.production localmente (NO COMMITEAR)
cp .env.example .env.production

# 2. Obtener DATABASE_URL de Supabase
# Settings → Database → Connection string
# ⚠️ IMPORTANTE: Usa "Transaction pooler" puerto 6543, NO direct connection
# Formato: postgresql://postgres.abc:PASS@aws-0-region.pooler.supabase.com:6543/postgres

# 3. Configurar .env.production
nano .env.production

NODE_ENV=production
DATABASE_URL=postgresql://postgres.abc:PASS@aws-0-us-east-1.pooler.supabase.com:6543/postgres
# ⚠️ Nota el puerto 6543 y host con .pooler.supabase.com

JWT_SECRET=secret-produccion-64-caracteres
JWT_REFRESH_SECRET=refresh-secret-produccion-64-caracteres
SESSION_SECRET=session-secret-produccion-64-caracteres
ALLOWED_ORIGINS=https://tudominio.com

# 4. En Vercel Dashboard:
# Settings → Environment Variables
# Agregar todas las variables de .env.production

# 5. Ejecutar migraciones ANTES del deploy (desde tu máquina)
APP_ENV=production npm run migration:run

# 6. Deploy a Vercel
vercel --prod
```

---

## 🔐 Seguridad

### RLS (Row Level Security) en Supabase

**⚠️ IMPORTANTE:** Si ves un warning en Supabase Dashboard que dice "RLS is disabled", **es normal y esperado** en este proyecto.

#### ¿Por qué NO usamos RLS?

Este proyecto usa **Sequelize con conexión directa** a PostgreSQL, NO la API de Supabase (`@supabase/supabase-js`).

**Arquitectura de este proyecto:**

```
Cliente → Express API (JWT auth) → Sequelize → PostgreSQL (Supabase)
            ↑ Aquí está la seguridad
```

**Con RLS (NO es nuestro caso):**

```
Cliente → Supabase API (supabase-js) → PostgreSQL con RLS
                                          ↑ Aquí estaría la seguridad
```

#### Diferencias:

| Aspecto | Este Proyecto (Sin RLS) | Con RLS (Supabase Auth) |
|---------|-------------------------|-------------------------|
| **Conexión** | Sequelize + `DATABASE_URL` | `@supabase/supabase-js` |
| **Usuario DB** | `postgres` (superuser) | Usuario anónimo/autenticado |
| **Autenticación** | JWT propio + Express middleware | Supabase Auth |
| **Autorización** | Lógica en backend (middlewares) | Policies de RLS en BD |
| **RLS necesario** | ❌ NO | ✅ SÍ |
| **Frontend → BD** | ❌ No directo | ✅ Directo |

#### ¿Debo habilitar RLS?

**NO.** En tu caso:

- ✅ Tu backend se conecta como `postgres` (superuser) → RLS no aplica
- ✅ La seguridad se maneja en Express (middleware de autenticación/autorización)
- ✅ El frontend **nunca** accede a la BD directamente
- ✅ RLS agregaría complejidad sin beneficio

#### ¿Cómo asegurar la app sin RLS?

La seguridad se maneja en **tu código de backend**:

```typescript
// 1. Middleware de autenticación (verifica JWT)
router.use(authenticate);

// 2. Middleware de autorización (verifica roles)
router.get('/admin', authorize('ADMIN', 'OWNER'), adminController);

// 3. Validación de permisos en servicios
if (req.user.userId !== targetUserId && req.user.role !== 'ADMIN') {
  throw new ForbiddenError('Cannot access other user data');
}
```

**Esto es suficiente y es el estándar** para APIs REST con backend.

#### Si quieres silenciar el warning de Supabase

Puedes habilitar RLS sin crear policies (no afecta tu app):

```sql
-- En Supabase SQL Editor
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
-- ... para todas las tablas

-- Política permisiva (opcional, solo para silenciar warnings)
CREATE POLICY "Allow all for service role" ON users
  FOR ALL USING (true) WITH CHECK (true);
```

Pero **no es necesario** - tu backend bypasea RLS de todos modos.

### Checklist de Seguridad

- [ ] Todos los secrets tienen al menos 32 caracteres
- [ ] Secrets de producción son diferentes a dev/local
- [ ] `.env.*` está en `.gitignore`
- [ ] `SUPABASE_SERVICE_KEY` nunca se expone al frontend
- [ ] `ALLOWED_ORIGINS` solo contiene dominios confiables
- [ ] Variables de entorno se configuran en el panel del proveedor (Vercel/Railway)
- [ ] No hay secrets hardcodeados en el código
- [ ] Middleware de autenticación en todas las rutas protegidas
- [ ] Middleware de autorización según roles
- [ ] Validación de permisos a nivel de servicio/controller
- [ ] Frontend NUNCA accede directamente a DATABASE_URL

### Rotar Secrets

Si necesitas rotar secrets (por ejemplo, si se filtraron):

```bash
# 1. Generar nuevos secrets
node -e "for(let i=0; i<3; i++) console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Actualizar .env.production
# JWT_SECRET=nuevo-secret
# JWT_REFRESH_SECRET=nuevo-refresh-secret
# SESSION_SECRET=nuevo-session-secret

# 3. Actualizar en tu plataforma de deploy

# 4. Reiniciar la app
# Esto invalidará todos los tokens JWT existentes (los usuarios tendrán que re-loguearse)
```

---

**¿Tienes preguntas?** Consulta el [README de migraciones](../persistence/migrations/README.md) para más info sobre base de datos.
