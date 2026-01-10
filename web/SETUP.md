# Frontend Setup Guide - BetPlatform Web

Esta guía te ayudará a configurar y ejecutar el frontend del proyecto BetPlatform.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Ejecución](#ejecución)
- [Desarrollo](#desarrollo)
- [Testing](#testing)
- [Build y Deployment](#build-y-deployment)
- [Troubleshooting](#troubleshooting)

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** v20.0.0 o superior
- **pnpm** v8.0.0 o superior
- **Git**

### Instalación de pnpm

```bash
# Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex

# macOS/Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -

# O usando npm
npm install -g pnpm
```

## 📦 Instalación

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd bets-online
```

### 2. Instalar Dependencias

Desde la raíz del proyecto:

```bash
# Instalar todas las dependencias del monorepo
pnpm install
```

O solo para el frontend:

```bash
cd web
pnpm install
```

## ⚙️ Configuración

### 1. Variables de Entorno

Crea el archivo de configuración local:

```bash
cd web
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 2. Verificar Configuración de TypeScript

El archivo `tsconfig.json` debe tener configurados los alias correctamente:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 3. Estructura de Carpetas

```
web/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rutas públicas (login)
│   ├── admin/             # Panel de administración
│   ├── user/              # Panel de usuario
│   └── layout.tsx         # Layout principal
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes UI base (shadcn/ui)
│   ├── sidebar/          # Navegación lateral
│   └── dashboard-layout/ # Layout de dashboards
├── contexts/             # Contexts de React
│   ├── auth-context.tsx  # Autenticación
│   └── language-context.tsx # Internacionalización
├── feature/              # Features del negocio
│   ├── login/
│   ├── admin-dashboard/
│   └── admin-user/
├── hooks/                # Custom hooks
├── lib/                  # Utilidades
├── routes/               # Definición de rutas
├── services/             # API services
│   └── api.service.ts    # Cliente HTTP
├── styles/               # Estilos globales
└── .env.local           # Variables de entorno (git ignored)
```

## 🚀 Ejecución

### Modo Desarrollo

```bash
# Desde la raíz del proyecto
pnpm run:web

# O desde la carpeta web
cd web
pnpm dev
```

La aplicación estará disponible en: http://localhost:3000

### Credenciales de Prueba

Para probar el sistema, usa estas credenciales:

```
Usuario: owner
Email: owner@casino.com
Password: owner123456
Rol: OWNER (acceso total)
```

### Ejecutar con el Backend

Para una experiencia completa, ejecuta también el backend:

**Terminal 1 - Backend:**
```bash
cd api
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd web
pnpm dev
```

## 💻 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor de desarrollo

# Build
pnpm build            # Crea build de producción
pnpm start            # Inicia servidor de producción

# Calidad de Código
pnpm lint             # Ejecuta ESLint (requiere configuración)
pnpm type-check       # Verifica tipos de TypeScript
pnpm format           # Formatea código con Prettier

# Limpieza
rm -rf .next          # Limpia caché de Next.js
```

### Estructura de Rutas

| Ruta | Descripción | Rol Requerido |
|------|-------------|---------------|
| `/` | Landing page | Público |
| `/login` | Inicio de sesión | Público |
| `/admin/dashboard` | Panel de administración | OWNER, ADMIN |
| `/admin/users` | Gestión de usuarios | OWNER, ADMIN |
| `/admin/games` | Gestión de juegos | OWNER, ADMIN |
| `/admin/balances` | Gestión de balances | OWNER, ADMIN |
| `/admin/transactions` | Transacciones | OWNER, ADMIN |
| `/admin/reports` | Reportes | OWNER, ADMIN |
| `/cashier/dashboard` | Panel de cajero | CASHIER |
| `/user/dashboard` | Panel de usuario | PLAYER |
| `/user/games` | Juegos disponibles | PLAYER |
| `/user/bets` | Mis apuestas | PLAYER |
| `/user/profile` | Mi perfil | PLAYER |

### Agregar Nuevas Páginas

#### 1. Crear la página en `app/`

```tsx
// app/admin/new-feature/page.tsx
"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function NewFeaturePage() {
  return (
    <DashboardLayout title="Nueva Característica">
      <div>Contenido aquí</div>
    </DashboardLayout>
  )
}
```

#### 2. Agregar la ruta en `routes/index.ts`

```typescript
const ROUTER = {
  // ... rutas existentes
  ADMIN_NEW_FEATURE: "/admin/new-feature",
}
```

#### 3. Agregar al menú de navegación en `hooks/useSidebarNavigation.ts`

```typescript
const adminMenuItems = [
  // ... items existentes
  {
    title: "Nueva Característica",
    href: ROUTER.ADMIN_NEW_FEATURE,
    icon: YourIcon,
  },
]
```

### Crear Componentes UI

Usa shadcn/ui para componentes base:

```bash
# Ejemplo: agregar un nuevo componente
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
```

### Usar el API Service

```typescript
"use client"

import { apiService } from "@/services/api.service"
import { useEffect, useState } from "react"

export default function MyComponent() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const response = await apiService.get('/endpoint')
      if (response.success) {
        setData(response.data)
      }
    }
    fetchData()
  }, [])

  return <div>{/* Renderizar data */}</div>
}
```

### Context de Autenticación

```typescript
"use client"

import { useAuth } from "@/contexts/auth-context"

export default function MyComponent() {
  const { user, role, login, logout, isLoading } = useAuth()

  if (isLoading) return <div>Cargando...</div>

  return (
    <div>
      <p>Usuario: {user?.username}</p>
      <p>Rol: {role}</p>
      <button onClick={logout}>Cerrar Sesión</button>
    </div>
  )
}
```

### Internacionalización

```typescript
"use client"

import { useLanguage } from "@/contexts/language-context"

export default function MyComponent() {
  const { t, language, setLanguage } = useLanguage()

  return (
    <div>
      <h1>{t("nav.dashboard")}</h1>
      <button onClick={() => setLanguage("en")}>English</button>
      <button onClick={() => setLanguage("es")}>Español</button>
    </div>
  )
}
```

## 🧪 Testing

### Verificación de Tipos

```bash
pnpm type-check
```

Esto ejecuta TypeScript sin emitir archivos, solo verificando tipos.

### ESLint (Opcional - Requiere Configuración)

```bash
# Instalar ESLint
pnpm add -D eslint eslint-config-next

# Inicializar configuración
npx next lint --init

# Ejecutar linter
pnpm lint

# Auto-fix
pnpm lint --fix
```

### Prettier

```bash
# Formatear todos los archivos
pnpm format

# Verificar formato sin modificar
pnpm prettier --check "app/**/*.{ts,tsx}"
```

## 🏗️ Build y Deployment

### Build de Producción

```bash
# Crear build optimizado
pnpm build

# Ejecutar build localmente
pnpm start
```

### Variables de Entorno para Producción

Configura estas variables en tu plataforma de deployment (Vercel, Netlify, etc.):

```env
NEXT_PUBLIC_API_URL=https://api-bets-online.railway.app
NEXT_PUBLIC_APP_URL=https://bets-online.vercel.app
NODE_ENV=production
```

### Deployment en Vercel (Recomendado)

1. **Conectar Repositorio**
   - Ve a https://vercel.com
   - Importa tu repositorio
   - Selecciona el proyecto

2. **Configurar Build**
   ```
   Root Directory: web
   Build Command: pnpm build
   Output Directory: .next
   Install Command: pnpm install
   ```

3. **Variables de Entorno**
   - Agrega `NEXT_PUBLIC_API_URL` en Settings → Environment Variables
   - Configura por ambiente: Production, Preview, Development

4. **Deploy**
   - Push a `main` → deploy automático a producción
   - Push a cualquier branch → preview deployment

### Deployment Manual

```bash
# Build
pnpm build

# El contenido en .next/ está listo para deployment
# Sube .next/, public/, package.json, next.config.mjs
```

## 🔍 Troubleshooting

### Error: "Cannot find module '@/...'"

**Solución:**
1. Verifica que `tsconfig.json` tenga configurado el alias `@/*`
2. Reinicia el servidor de desarrollo
3. Limpia caché: `rm -rf .next`

### Error: "Hydration failed"

**Causas comunes:**
- Contenido diferente entre servidor y cliente
- Uso de `localStorage` antes de montaje
- Extensiones de navegador que modifican el HTML

**Solución:**
1. Asegúrate de usar `"use client"` en componentes que usan hooks
2. Usa `mounted` state antes de acceder a browser APIs
3. Agrega `suppressHydrationWarning` en tags problemáticos

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) return null
```

### Error: "Module not found: Can't resolve 'helper'"

**Solución:**
```bash
# Desde la raíz del proyecto
cd helper
pnpm build

# Reinstalar dependencias
cd ../web
pnpm install
```

### Puerto 3000 en uso

**Solución:**
```bash
# Cambiar puerto
PORT=3001 pnpm dev

# O matar el proceso
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Errores de TypeScript después de pull

**Solución:**
```bash
# Limpiar y reinstalar
rm -rf node_modules .next
pnpm install
pnpm type-check
```

### Falla la autenticación

**Verificar:**
1. Backend corriendo en puerto 3001
2. CORS configurado correctamente en backend
3. Variables de entorno correctas
4. Credenciales válidas

```bash
# Verificar backend
curl http://localhost:3001/api/health

# Verificar login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"owner123456"}'
```

### Build falla en producción

**Checklist:**
- [ ] `pnpm type-check` pasa sin errores
- [ ] Variables de entorno configuradas
- [ ] Helper package compilado (`cd helper && pnpm build`)
- [ ] No hay imports de desarrollo en producción
- [ ] `next.config.mjs` configurado correctamente

## 📚 Recursos Adicionales

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 🤝 Contribuir

### Workflow de Desarrollo

1. **Crear rama desde develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nombre-descriptivo
   ```

2. **Desarrollar y probar**
   ```bash
   pnpm type-check
   pnpm build
   ```

3. **Commit y push**
   ```bash
   git add .
   git commit -m "feat: descripción del cambio"
   git push origin feature/nombre-descriptivo
   ```

4. **Crear Pull Request**
   - Ve a GitHub
   - Crea PR hacia `develop`
   - Completa el template de PR
   - Espera a que CI pase

### Convenciones de Código

- Usa TypeScript estricto
- Componentes en PascalCase
- Archivos de componentes con extensión `.tsx`
- Hooks personalizados prefijados con `use`
- Contexts con sufijo `-context.tsx`
- Servicios con sufijo `.service.ts`

### Estructura de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva característica
fix: corrección de bug
docs: cambios en documentación
style: formateo, punto y coma faltante
refactor: refactorización de código
test: agregar tests
chore: actualizar dependencias
```

## 📝 Notas Importantes

### Diferencias con Backend

El frontend usa tipos de `helper` package, que debe estar sincronizado con el backend:

```typescript
// Tipos compartidos desde helper
import { User, UserRole, ApiResponse } from "helper"
```

Si agregas nuevos tipos en el backend, debes:
1. Actualizar `helper/src/types/`
2. Rebuild helper: `cd helper && pnpm build`
3. El frontend automáticamente usará los nuevos tipos

### Migraciones de Base de Datos

El frontend NO maneja migraciones. Todas las migraciones se hacen desde el backend:

```bash
# En el backend
cd api
pnpm migration:run
```

### Mock Data

El proyecto incluye `lib/mock-data.ts` para desarrollo sin backend. En producción, todo debe venir del API real.

---

**¿Preguntas o problemas?** Abre un issue en GitHub o contacta al equipo de desarrollo.

**Última actualización:** Enero 2026
