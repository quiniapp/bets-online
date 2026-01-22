# Guía de Variables de Entorno

Esta guía explica cómo gestionar las variables de entorno en los diferentes ambientes del proyecto.

## 🌍 Ambientes

Tu proyecto tiene 3 ambientes principales:

| Ambiente | Descripción | Branch | URL |
|----------|-------------|--------|-----|
| **Local** | Tu máquina de desarrollo | cualquiera | localhost |
| **Development** | Servidor de desarrollo | `develop` | dev-bets-online.vercel.app |
| **Production** | Producción pública | `main` | bets-online.vercel.app |

## 📁 Archivos de Variables de Entorno

### Estructura de Archivos

```
api/
├── .env.local          # ✅ Local (git ignored) - TÚ LO TIENES
├── .env.development    # ❌ NO crear - usar GitHub Secrets
├── .env.production     # ❌ NO crear - usar GitHub Secrets
├── .env.example        # ✅ Template (git committed)
└── .gitignore          # ✅ Debe incluir .env*

web/
├── .env.local          # ✅ Local (git ignored)
├── .env.production     # ❌ NO crear - usar Vercel Env Vars
└── .env.example        # ✅ Template (git committed)
```

### ⚠️ IMPORTANTE: Nunca subas archivos .env al repositorio

```bash
# En .gitignore (ya debería estar)
.env
.env.local
.env.development
.env.production
.env*.local
```

## 🏠 Variables en LOCAL (tu máquina)

Ya las tienes configuradas en `api/.env.local`:

```bash
# api/.env.local
NODE_ENV=local
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres
JWT_SECRET=a40ac6518c14fd1b6f4a02729660bcc38e10c4dfdcf604fd5feeb7a247df721c
# etc...
```

✅ Este archivo está en `.gitignore` y solo existe en tu máquina.

## 🔐 Variables en GITHUB (para CI/CD)

Para que los workflows funcionen, necesitas configurar **GitHub Secrets**.

### Cómo Configurar GitHub Secrets

1. Ve a tu repositorio en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Agrega cada variable

### Variables Requeridas para CI/CD

#### Para Development Environment

```bash
# Database
DEV_DATABASE_URL=postgresql://user:pass@dev-server.railway.app:5432/dbname

# API
DEV_API_URL=https://dev-api-bets-online.railway.app
DEV_PORT=3001

# CORS
DEV_ALLOWED_ORIGINS=https://dev-bets-online.vercel.app

# JWT (genera nuevos secrets para dev)
DEV_JWT_SECRET=<genera-random-string-aqui>
DEV_JWT_REFRESH_SECRET=<genera-random-string-aqui>
DEV_SESSION_SECRET=<genera-random-string-aqui>

# Supabase (si usas Supabase en dev)
DEV_SUPABASE_URL=https://xxx.supabase.co
DEV_SUPABASE_ANON_KEY=eyJ...
DEV_SUPABASE_SERVICE_KEY=eyJ...
```

#### Para Production Environment

```bash
# Database
PROD_DATABASE_URL=postgresql://user:pass@prod-server.railway.app:5432/dbname

# API
PROD_API_URL=https://api-bets-online.railway.app
PROD_PORT=3001

# CORS
PROD_ALLOWED_ORIGINS=https://bets-online.vercel.app

# JWT (genera DIFERENTES secrets para prod)
PROD_JWT_SECRET=<genera-random-string-diferente>
PROD_JWT_REFRESH_SECRET=<genera-random-string-diferente>
PROD_SESSION_SECRET=<genera-random-string-diferente>

# Supabase Production
PROD_SUPABASE_URL=https://xxx.supabase.co
PROD_SUPABASE_ANON_KEY=eyJ...
PROD_SUPABASE_SERVICE_KEY=eyJ...
```

#### Para Deployment Services

```bash
# Vercel (Frontend)
VERCEL_TOKEN=<tu-token-de-vercel>
VERCEL_ORG_ID=<tu-org-id>
VERCEL_PROJECT_ID=<tu-project-id>

# Railway (Backend) o el servicio que uses
RAILWAY_TOKEN=<tu-token-de-railway>
RAILWAY_PROJECT_ID=<tu-project-id>
```

## 🚀 Variables en VERCEL (Frontend)

Vercel maneja sus propias variables de entorno.

### Cómo Configurar en Vercel

1. Ve a tu proyecto en https://vercel.com
2. **Settings** → **Environment Variables**
3. Agrega variables para cada ambiente

### Variables Requeridas en Vercel

```bash
# Para Production
NEXT_PUBLIC_API_URL=https://api-bets-online.railway.app

# Para Preview (PRs)
NEXT_PUBLIC_API_URL=https://pr-${VERCEL_GIT_COMMIT_REF}-api.railway.app

# Para Development
NEXT_PUBLIC_API_URL=https://dev-api-bets-online.railway.app
```

**Importante:** En Next.js, las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el browser.

## 🛤️ Variables en RAILWAY (Backend)

Si usas Railway para el backend:

### Cómo Configurar en Railway

1. Ve a tu proyecto en https://railway.app
2. **Variables** tab
3. Agrega variables

### Variables Requeridas en Railway

```bash
# Production Service
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Railway auto-genera esto
JWT_SECRET=<secret-from-github>
JWT_REFRESH_SECRET=<secret-from-github>
SESSION_SECRET=<secret-from-github>
ALLOWED_ORIGINS=https://bets-online.vercel.app
```

Railway puede referenciar variables de otros servicios con `${{ServiceName.VARIABLE}}`.

## 🔑 Generar Secrets Seguros

### Para JWT y Session Secrets

```bash
# En tu terminal (local)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecuta este comando 3 veces para generar:
- JWT_SECRET
- JWT_REFRESH_SECRET
- SESSION_SECRET

⚠️ **Usa diferentes valores para Development y Production**

## 📋 Checklist de Configuración

### ✅ Local (Tu Máquina)

- [ ] Tienes `api/.env.local` configurado
- [ ] Tienes `web/.env.local` configurado (si aplica)
- [ ] `.env*` está en `.gitignore`
- [ ] Supabase local corriendo

### ✅ GitHub Secrets

- [ ] `DEV_DATABASE_URL`
- [ ] `DEV_API_URL`
- [ ] `DEV_JWT_SECRET`
- [ ] `DEV_JWT_REFRESH_SECRET`
- [ ] `DEV_SESSION_SECRET`
- [ ] `PROD_DATABASE_URL`
- [ ] `PROD_API_URL`
- [ ] `PROD_JWT_SECRET`
- [ ] `PROD_JWT_REFRESH_SECRET`
- [ ] `PROD_SESSION_SECRET`
- [ ] `VERCEL_TOKEN`
- [ ] `RAILWAY_TOKEN` (o tu servicio)

### ✅ Vercel

- [ ] `NEXT_PUBLIC_API_URL` (Production)
- [ ] `NEXT_PUBLIC_API_URL` (Preview)
- [ ] `NEXT_PUBLIC_API_URL` (Development)

### ✅ Railway (o tu Backend Service)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `SESSION_SECRET`
- [ ] `ALLOWED_ORIGINS`

## 🔄 Workflow Completo

### 1. Desarrollo Local

```bash
# Usa .env.local
cd api && pnpm dev
cd web && pnpm dev
```

### 2. Push a develop

```bash
git push origin develop
```

GitHub Actions:
- Lee secrets `DEV_*` de GitHub Secrets
- Hace build
- Despliega a Railway/Vercel con variables de Development
- Railway/Vercel usan sus propias variables configuradas

### 3. Merge a main

```bash
# Crear PR de develop → main
# Aprobar y merge
```

GitHub Actions:
- Lee secrets `PROD_*` de GitHub Secrets
- Hace build de producción
- Despliega a Railway/Vercel con variables de Production
- Railway/Vercel usan sus propias variables configuradas

## 🆘 Troubleshooting

### "Variable no definida en producción"

1. Verifica que el secret esté en GitHub Secrets
2. Verifica que el workflow lo esté pasando correctamente
3. Verifica que Railway/Vercel tengan la variable configurada

### "CORS error en producción"

Verifica que `ALLOWED_ORIGINS` en Railway incluya tu dominio de Vercel:
```bash
ALLOWED_ORIGINS=https://bets-online.vercel.app,https://www.bets-online.vercel.app
```

### "Database connection failed"

1. Verifica que `DATABASE_URL` esté correctamente configurada
2. En Railway, verifica que el servicio de Postgres esté corriendo
3. Verifica que la base de datos acepte conexiones desde el IP de Railway

## 🛡️ Seguridad

### ✅ DO

- ✅ Usa diferentes secrets para dev y prod
- ✅ Rota secrets regularmente (cada 3-6 meses)
- ✅ Usa `.gitignore` para archivos `.env*`
- ✅ Documenta qué variables necesitas en `.env.example`

### ❌ DON'T

- ❌ NUNCA subas archivos `.env` al repositorio
- ❌ NUNCA pongas secrets en el código
- ❌ NUNCA uses los mismos secrets en dev y prod
- ❌ NUNCA compartas secrets por email/chat

## 📝 Template: .env.example

Crea este archivo para documentar qué variables se necesitan:

```bash
# api/.env.example
NODE_ENV=local|development|production
PORT=3001
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
SESSION_SECRET=your-session-secret-here
ALLOWED_ORIGINS=http://localhost:3000
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

Este archivo SÍ se sube al repositorio (sin valores reales).

---

**¿Necesitas ayuda configurando algún ambiente específico?**
