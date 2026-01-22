# ⚡ Quick Start - Sistema de Entornos

## 🚀 Setup en 3 pasos

### 1. Ejecutar el script de setup automático

```bash
cd api
pnpm setup
```

Este script:
- ✅ Crea `.env.local` desde el template
- ✅ Detecta y configura las credenciales de Supabase
- ✅ Genera secrets seguros automáticamente
- ✅ Valida la configuración

### 2. Verificar la configuración

```bash
cat .env.local
```

### 3. Iniciar el servidor

```bash
pnpm dev
```

## 🎯 Comandos Disponibles

```bash
# Desarrollo local (default)
pnpm dev                # Usa .env.local

# Entorno específico
pnpm dev:local          # Usa .env.local
pnpm dev:development    # Usa .env.development
pnpm dev:prod           # Usa .env.production

# O manualmente:
APP_ENV=production pnpm dev
```

## 📝 Estructura de Archivos Creados

```
api/
├── .env.local              ✅ Tu configuración local (NO commitear)
├── .env.development        ✅ Configuración de dev (NO commitear)
├── .env.production         ✅ Configuración de prod (NO commitear)
├── .env.local.example      📄 Template (SÍ commitear)
├── scripts/
│   └── setup-env.js        🔧 Script de setup automático
├── src/
│   └── config/
│       ├── envs.ts         🎛️ Sistema de entornos
│       └── index.ts        📤 Export principal
├── ENV_SETUP.md            📖 Documentación completa
└── QUICK_START.md          ⚡ Esta guía
```

## 💡 Uso en el Código

```typescript
// Importar la configuración
import { envs } from './config';

// Usar las variables
console.log(envs.PORT);              // 3001
console.log(envs.DATABASE_URL);      // postgresql://...
console.log(envs.jwt.secret);        // tu-jwt-secret
console.log(envs.isProduction);      // false (en local)

// Verificar entorno
if (envs.isLocal) {
  console.log('Estás en local');
}
```

## 🔄 Switchear entre bases de datos

### Opción 1: Usando diferentes entornos

```bash
# Conectar a DB local
pnpm dev:local

# Conectar a DB de desarrollo
pnpm dev:development

# Conectar a DB de producción (local)
pnpm dev:prod
```

### Opción 2: Editar DATABASE_URL en .env.local

```env
# Local Supabase
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres

# O conectar a otra DB
DATABASE_URL=postgresql://user:pass@remote-server:5432/dbname
```

## ❓ Problemas Comunes

### Error: "Invalid environment variables"

**Solución:** Las variables no cumplen con la validación (ej: secrets muy cortos)

```bash
# Re-ejecutar el setup para generar secrets válidos
pnpm setup
```

### Error: "Could not load .env.local"

**Solución:** El archivo no existe

```bash
# Ejecutar el setup
pnpm setup

# O copiar manualmente
cp .env.local.example .env.local
```

### Supabase no está corriendo

**Solución:**

```bash
npx supabase start
pnpm setup  # Re-ejecutar para obtener credenciales
```

## 📚 Documentación Completa

Para más detalles, consulta [ENV_SETUP.md](./ENV_SETUP.md)

## 🎉 ¡Listo!

Ahora puedes:
- ✅ Cambiar fácilmente entre entornos
- ✅ Tener múltiples configuraciones de DB
- ✅ Variables validadas con TypeScript
- ✅ Secrets seguros auto-generados
