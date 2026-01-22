# GitHub Workflows & CI/CD Setup

Esta carpeta contiene toda la configuración de CI/CD, workflows y templates para el proyecto.

## 📁 Estructura

```
.github/
├── workflows/
│   ├── ci.yml                    # ✅ CI: Tests, Lint, Build
│   ├── preview-deploy.yml        # 🔍 Preview deployments en PRs
│   ├── deploy-develop.yml        # 🚀 Deploy a Development
│   └── deploy-production.yml     # 🎯 Deploy a Production
├── pull_request_template.md      # 📝 Template para PRs
├── DEPLOYMENT.md                  # 📚 Guía completa de deployment
├── BRANCH_PROTECTION.md           # 🛡️ Guía de protección de branches
└── README.md                      # 📖 Este archivo
```

## 🚀 Workflows Configurados

### 1. CI (Continuous Integration)

**Archivo:** `workflows/ci.yml`

**Se ejecuta en:**
- Pull requests a `main` o `develop`
- Push a `main` o `develop`

**Qué hace:**
- ✅ Lint (API + Web)
- ✅ Type check (API + Web)
- ✅ Build todo el proyecto
- ✅ Tests (API con PostgreSQL + Web)

**Duración aproximada:** 3-5 minutos

### 2. Preview Deployment

**Archivo:** `workflows/preview-deploy.yml`

**Se ejecuta en:**
- PRs abiertos, actualizados o reabiertos
- Solo si el PR no es draft

**Qué hace:**
- 🏗️ Build del proyecto
- 🚀 Deploy a ambiente temporal
- 💬 Comenta en el PR con URLs de preview
- 🧹 Cleanup al cerrar el PR

**URLs generadas:**
- Frontend: `https://pr-{number}-bets-online.vercel.app`
- Backend: `https://pr-{number}-api-bets-online.railway.app`

### 3. Deploy to Development

**Archivo:** `workflows/deploy-develop.yml`

**Se ejecuta en:**
- Push a `develop`
- Manualmente desde Actions tab

**Qué hace:**
- ✅ Tests
- 🏗️ Build
- 🚀 Deploy a ambiente de development
- 📢 Notifica resultado

**URLs:**
- Frontend: `https://dev-bets-online.vercel.app`
- Backend: `https://dev-api-bets-online.railway.app`

### 4. Deploy to Production

**Archivo:** `workflows/deploy-production.yml`

**Se ejecuta en:**
- Push a `main`
- Manualmente desde Actions tab

**Qué hace:**
- ✅ Tests completos
- 🏗️ Build
- 🚀 Deploy a producción
- 🏷️ Crea git tag de la versión
- 📢 Notifica resultado

**URLs:**
- Frontend: `https://bets-online.vercel.app`
- Backend: `https://api-bets-online.railway.app`

## 📝 Pull Request Template

**Archivo:** `pull_request_template.md`

Se aplica automáticamente al crear cualquier PR.

**Incluye:**
- Descripción del cambio
- Tipo de cambio
- Testing checklist completo
  - Backend testing
  - Frontend testing
  - Integration testing
  - Database checks
- Screenshots/videos
- Deployment notes
- Post-merge tasks

## 📚 Documentación

### DEPLOYMENT.md

Guía completa que cubre:
- Estructura de branches
- Workflow de desarrollo completo
- Detalles del CI/CD pipeline
- Configuración de ambientes
- Comandos útiles
- Troubleshooting
- Mejores prácticas

### BRANCH_PROTECTION.md

Guía paso a paso para configurar:
- Protección de `main` (strict)
- Protección de `develop` (moderate)
- Status checks requeridos
- Verificación de configuración
- Troubleshooting común

## ⚙️ Configuración Requerida

### 1. GitHub Secrets

Ve a: `Settings → Secrets and variables → Actions → New repository secret`

#### Secrets Requeridos:

**Development:**
```
DEV_DATABASE_URL
DEV_API_URL
DEV_ALLOWED_ORIGINS
DEV_JWT_SECRET
DEV_JWT_REFRESH_SECRET
DEV_SESSION_SECRET
```

**Production:**
```
PROD_DATABASE_URL
PROD_API_URL
PROD_ALLOWED_ORIGINS
PROD_JWT_SECRET
PROD_JWT_REFRESH_SECRET
PROD_SESSION_SECRET
```

**Preview:**
```
PREVIEW_DATABASE_URL
PREVIEW_API_URL
PREVIEW_ALLOWED_ORIGINS
```

**Deployment Services:**
```
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Railway (o tu servicio preferido)
RAILWAY_TOKEN
RAILWAY_PROJECT_ID
```

### 2. Branch Protection

Sigue la guía en `BRANCH_PROTECTION.md` para configurar:

**Para `main`:**
- ✅ Requiere 1 aprobación
- ✅ CI debe pasar
- ✅ Branch actualizada
- ✅ No force push
- ✅ No deletion

**Para `develop`:**
- ✅ CI debe pasar
- ✅ Branch actualizada
- ✅ No force push
- ✅ No deletion

### 3. Deployment Services

#### Vercel (Frontend)

1. Conecta tu repo en https://vercel.com
2. Configura:
   - Root Directory: `web`
   - Build Command: `pnpm build`
   - Output Directory: `.next`
   - Install Command: `pnpm install`

#### Railway/Render (Backend)

1. Conecta tu repo
2. Configura:
   - Root Directory: `api`
   - Build Command: `pnpm --filter api build`
   - Start Command: `pnpm --filter api start`

## 🎯 Uso Diario

### Crear Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# Hacer cambios...
git add .
git commit -m "feat: descripción"
git push origin feature/nombre-descriptivo
```

### Crear Pull Request

1. Ve a GitHub
2. Click "Compare & pull request"
3. El template se cargará automáticamente
4. Completa toda la información
5. Marca los checkboxes de testing
6. Create pull request

### Preview se crea automáticamente

- URLs se comentan en el PR
- Actualiza con cada commit
- Se destruye al cerrar el PR

### Merge

1. Espera a que CI pase ✅
2. Solicita review (para main)
3. Aprueba el PR
4. Merge!
5. Deploy automático 🚀

## 🔄 Flujo Completo

```
Feature Branch
     ↓
   Commit
     ↓
   Push
     ↓
Create PR → CI runs → Preview deploys
     ↓
   Review
     ↓
   Approve
     ↓
Merge to develop → Deploy to Development
     ↓
   Test in Dev
     ↓
Create PR to main
     ↓
   Review
     ↓
   Approve
     ↓
Merge to main → Deploy to Production 🎉
```

## 🆘 Troubleshooting

### CI falla

```bash
# Corre CI localmente
pnpm lint
pnpm type-check
pnpm test
pnpm build

# Fix errores
pnpm lint --fix
```

### Preview deployment falla

1. Verifica GitHub Secrets
2. Revisa Actions logs
3. Verifica que Vercel/Railway estén conectados

### Production deployment falla

1. **NO PANIC** 🧘
2. Revisa Actions logs
3. Si es crítico, haz rollback:
   ```bash
   git revert HEAD
   git push origin main
   ```

## 📊 Monitoreo

Después de deploy a producción:

- ✅ Application logs
- ✅ Error rates
- ✅ Performance metrics
- ✅ Database health

## 🎓 Recursos

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía completa
- [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) - Setup de protección
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app/)

## 🤝 Contribuir

Si encuentras formas de mejorar estos workflows:

1. Abre un issue describiendo la mejora
2. O crea un PR con los cambios propuestos
3. Documenta cualquier cambio en este README

---

**Configurado con ❤️ para desarrollo ágil y deployment seguro**
