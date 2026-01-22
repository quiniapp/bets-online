# Deployment Workflow

Este documento describe el flujo completo de desarrollo, testing y deployment del proyecto.

## 📋 Tabla de Contenidos

- [Estructura de Branches](#estructura-de-branches)
- [Workflow de Desarrollo](#workflow-de-desarrollo)
- [CI/CD Pipeline](#cicd-pipeline)
- [Ambientes](#ambientes)
- [Configuración Inicial](#configuración-inicial)

## 🌳 Estructura de Branches

### Branches Principales

- **`main`** - Producción
  - Código estable en producción
  - Requiere 1 aprobación para merge
  - CI debe pasar antes de merge
  - Deploys automáticos a producción

- **`develop`** - Development
  - Código en desarrollo activo
  - CI debe pasar antes de merge
  - Deploys automáticos a ambiente de desarrollo

### Branches de Trabajo

- **`feature/*`** - Nuevas funcionalidades
- **`fix/*`** - Bug fixes
- **`hotfix/*`** - Fixes urgentes para producción
- **`refactor/*`** - Refactoring de código

## 🔄 Workflow de Desarrollo

### 1. Crear Feature Branch

```bash
# Desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo
```

### 2. Desarrollo

```bash
# Hacer commits
git add .
git commit -m "feat: descripción del cambio"

# Push a remote
git push origin feature/nombre-descriptivo
```

### 3. Crear Pull Request

1. Ir a GitHub y crear PR desde tu branch a `develop`
2. El PR template se llenará automáticamente
3. Completar la información requerida
4. Marcar todos los checkboxes de testing

### 4. CI Automático

Al crear el PR, automáticamente se ejecuta:

- ✅ **Lint**: Verifica estilo de código
- ✅ **Type Check**: Verifica tipos de TypeScript
- ✅ **Tests**: Ejecuta todos los tests
- ✅ **Build**: Verifica que el build funcione

### 5. Preview Deployment

- Se crea un ambiente de preview automáticamente
- Se comenta en el PR con las URLs de preview
- El preview se actualiza con cada commit

### 6. Review & Merge

- Solicitar review de un compañero (para `main`)
- Hacer los cambios solicitados si hay feedback
- Una vez aprobado, hacer merge

### 7. Deployment Automático

- **Merge a `develop`** → Deploy automático a Development
- **Merge a `main`** → Deploy automático a Production

## 🚀 CI/CD Pipeline

### Continuous Integration (CI)

Se ejecuta en **todos los PRs** y **pushes** a `main`/`develop`:

```yaml
1. Lint & Type Check
   ├── API Lint
   ├── API Type Check
   ├── Web Lint
   └── Web Type Check

2. Build
   ├── Build Helper
   ├── Build API
   └── Build Web

3. Tests
   ├── API Tests (con PostgreSQL)
   └── Web Tests

4. CI Success
   └── Verifica que todos pasaron
```

### Preview Deployment

Se ejecuta en **PRs a `main`/`develop`**:

```yaml
1. Build Preview
2. Deploy Frontend (Vercel)
3. Deploy Backend (Railway/Render)
4. Comment URLs en PR
```

### Continuous Deployment (CD)

#### Development (`develop` branch)

```yaml
Push a develop →
  1. Run Tests
  2. Build
  3. Deploy to Development
  4. Notify Success/Failure
```

#### Production (`main` branch)

```yaml
Push a main →
  1. Run All Tests
  2. Build
  3. Deploy to Production
  4. Create Git Tag
  5. Notify Success/Failure
```

## 🌍 Ambientes

### Development

- **Frontend**: `https://dev-bets-online.vercel.app`
- **API**: `https://dev-api-bets-online.railway.app`
- **Docs**: `https://dev-api-bets-online.railway.app/doc`
- **Database**: Supabase Development Project
- **Auto-deploy**: Al merge a `develop`

### Production

- **Frontend**: `https://bets-online.vercel.app`
- **API**: `https://api-bets-online.railway.app`
- **Docs**: `https://api-bets-online.railway.app/doc`
- **Database**: Supabase Production Project
- **Auto-deploy**: Al merge a `main`

### Preview (PR)

- **Frontend**: `https://pr-{NUMBER}-bets-online.vercel.app`
- **API**: `https://pr-{NUMBER}-api-bets-online.railway.app`
- **Lifecycle**: Creado al abrir PR, destruido al cerrar PR

## ⚙️ Configuración Inicial

### 1. GitHub Secrets

Configurar en: `Settings → Secrets and variables → Actions`

#### Para todos los ambientes:

```
JWT_SECRET
JWT_REFRESH_SECRET
SESSION_SECRET
```

#### Development:

```
DEV_DATABASE_URL
DEV_API_URL
DEV_ALLOWED_ORIGINS
```

#### Production:

```
PROD_DATABASE_URL
PROD_API_URL
PROD_ALLOWED_ORIGINS
```

#### Preview:

```
PREVIEW_DATABASE_URL
PREVIEW_API_URL
PREVIEW_ALLOWED_ORIGINS
```

#### Deployment Services:

```
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Railway (o tu servicio de backend)
RAILWAY_TOKEN
RAILWAY_PROJECT_ID
```

### 2. Branch Protection Rules

#### Para `main`:

```
Settings → Branches → Add rule

✅ Require a pull request before merging
   ✅ Require approvals: 1
✅ Require status checks to pass before merging
   ✅ Require branches to be up to date
   ✅ Status checks: ci-success
✅ Do not allow bypassing the above settings
✅ Restrict who can push to matching branches (Admins only)
```

#### Para `develop`:

```
Settings → Branches → Add rule

✅ Require status checks to pass before merging
   ✅ Status checks: ci-success
✅ Restrict who can push to matching branches
```

### 3. Configurar Servicios de Deployment

#### Vercel (Frontend):

1. Conectar repositorio en Vercel
2. Configurar:
   - **Production Branch**: `main`
   - **Development Branch**: `develop`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

#### Railway/Render (Backend):

1. Crear proyecto y conectar repositorio
2. Configurar:
   - **Production Branch**: `main`
   - **Development Branch**: `develop`
   - **Build Command**: `pnpm --filter api build`
   - **Start Command**: `pnpm --filter api start`
   - **Root Directory**: `api`

## 📝 Comandos Útiles

```bash
# Correr CI localmente (antes de push)
pnpm lint              # Lint todo
pnpm type-check        # Type check todo
pnpm test              # Tests
pnpm build             # Build todo

# Correr solo un workspace
pnpm --filter api lint
pnpm --filter web test

# Deployment manual (solo si es necesario)
# Nunca hacer esto normalmente - usa el CI/CD
pnpm --filter api build
pnpm --filter web build
```

## 🔒 Seguridad

- ❌ **Nunca** commitear secrets o API keys
- ✅ Usar GitHub Secrets para todas las credenciales
- ✅ Rotar secrets regularmente
- ✅ Revisar logs de deployment para leaks
- ✅ Usar `.env.local` para desarrollo local (en .gitignore)

## 🆘 Troubleshooting

### CI falla en "Lint"

```bash
# Fix localmente
pnpm lint --fix
git add .
git commit -m "fix: lint errors"
git push
```

### CI falla en "Type Check"

```bash
# Revisar errores
pnpm type-check

# Fix y push
```

### CI falla en "Tests"

```bash
# Correr tests localmente
pnpm test

# Debug un test específico
pnpm --filter api test -- path/to/test.ts
```

### Preview Deployment falla

1. Verificar que GitHub Secrets estén configurados
2. Revisar logs en GitHub Actions
3. Verificar que servicios (Vercel/Railway) estén conectados

### Production Deployment falla

1. ⚠️ **NO PANIC**
2. Revisar logs en GitHub Actions
3. Verificar que tests pasaron
4. Si es necesario, hacer rollback:
   ```bash
   git revert HEAD
   git push origin main
   ```

## 📊 Monitoring

Después de deployment a producción, monitorear:

- ✅ Application logs
- ✅ Error rates (Sentry, LogRocket, etc.)
- ✅ Performance metrics
- ✅ Database health
- ✅ API response times

## 🎯 Mejores Prácticas

1. **Commits pequeños y frecuentes**
2. **Mensajes de commit descriptivos**
3. **Tests para cada feature**
4. **Revisar preview antes de aprobar PR**
5. **Mergear a `develop` primero, testear, luego a `main`**
6. **Deployments a producción en horas de menor tráfico**
7. **Tener un plan de rollback**

---

¿Preguntas? Abre un issue o contacta al equipo de DevOps.
