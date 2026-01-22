# 🔧 Sistema de Configuración de Entornos

Este proyecto usa un sistema robusto de gestión de entornos que permite switchear fácilmente entre diferentes configuraciones (local, desarrollo, producción).

## 📁 Estructura de Archivos

```
api/
├── .env.local              # Configuración para desarrollo local
├── .env.development        # Configuración para entorno de desarrollo
├── .env.production         # Configuración para producción
├── .env.local.example      # Plantilla para .env.local
└── src/
    └── config/
        ├── envs.ts         # Sistema de carga y validación de entornos
        └── index.ts        # Re-exporta la configuración
```

## 🚀 Inicio Rápido

### 1. Crear tu archivo de configuración local

```bash
# Copiar el archivo de ejemplo
cp .env.local.example .env.local

# Editar con tus valores
# nano .env.local  # o usa tu editor favorito
```

### 2. Obtener las credenciales de Supabase

```bash
# Inicia Supabase local
npx supabase start

# Copia las credenciales que aparecen en la terminal
npx supabase status
```

### 3. Actualizar .env.local con las credenciales

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:55322/postgres
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_KEY=<tu-service-key>
```

## 🎯 Uso

### Ejecutar en diferentes entornos

```bash
# Desarrollo local (por defecto)
pnpm dev
# o explícitamente:
pnpm dev:local

# Entorno de desarrollo
pnpm dev:development

# Entorno de producción (local)
pnpm dev:prod
```

### Desde la línea de comandos

```bash
# Forzar un entorno específico
APP_ENV=local pnpm dev
APP_ENV=development pnpm dev
APP_ENV=production pnpm dev
```

## 📝 Variables de Entorno Requeridas

### Server
- `NODE_ENV` - Entorno de ejecución (local, development, production)
- `PORT` - Puerto del servidor (default: 3001)
- `API_URL` - URL base del API

### Database
- `DATABASE_URL` - URL de conexión a la base de datos (requerida)
- `DATABASE_URL_LOCAL` - URL específica para local (opcional)
- `DATABASE_URL_DEV` - URL específica para development (opcional)
- `DATABASE_URL_PROD` - URL específica para production (opcional)

### JWT & Authentication
- `JWT_SECRET` - Secret para tokens JWT (mínimo 32 caracteres)
- `JWT_EXPIRES_IN` - Tiempo de expiración del JWT (default: 15m)
- `JWT_REFRESH_SECRET` - Secret para refresh tokens (mínimo 32 caracteres)
- `JWT_REFRESH_EXPIRES_IN` - Tiempo de expiración del refresh token (default: 7d)
- `SESSION_SECRET` - Secret para sesiones (mínimo 32 caracteres)

### CORS
- `ALLOWED_ORIGINS` - Orígenes permitidos, separados por coma

### Admin (opcional)
- `ADMIN_EMAIL` - Email del administrador inicial
- `ADMIN_PASSWORD` - Contraseña del administrador inicial
- `ADMIN_USERNAME` - Username del administrador inicial

## 💡 Uso en el Código

### Importar la configuración

```typescript
// Opción 1: Usar el objeto config (recomendado para código existente)
import { config } from '@/config';

console.log(config.server.port);
console.log(config.database.url);
console.log(config.jwt.secret);

// Opción 2: Usar envs directamente (más flexible)
import { envs } from '@/config';

console.log(envs.PORT);
console.log(envs.DATABASE_URL);
console.log(envs.jwt.secret);

// Opción 3: Verificar el entorno
import { envs, Environment } from '@/config';

if (envs.isProduction) {
  // Código específico de producción
}

if (envs.NODE_ENV === Environment.LOCAL) {
  // Código específico de local
}
```

### Ejemplo de uso en un controller

```typescript
import { envs } from '@/config';

export class AuthController {
  async login(req: Request, res: Response) {
    const token = jwt.sign(
      { userId: user.id },
      envs.jwt.secret,
      { expiresIn: envs.jwt.expiresIn }
    );

    res.json({ token });
  }
}
```

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **NUNCA** commitees archivos `.env.local`, `.env.development`, o `.env.production` con valores reales
2. Usa secrets fuertes y únicos para cada entorno
3. En producción, usa gestores de secretos (AWS Secrets Manager, Vault, etc.)
4. Rota los secrets regularmente

### Generar secrets seguros

```bash
# Generar un secret aleatorio de 32 caracteres
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# O usando openssl
openssl rand -base64 32
```

## 🔄 Switchear entre bases de datos

### Opción 1: Usando URLs específicas por entorno

```env
# .env.local
DATABASE_URL_LOCAL=postgresql://postgres:postgres@localhost:55322/postgres
DATABASE_URL_DEV=postgresql://postgres:pass@dev-server:5432/casino_dev
DATABASE_URL_PROD=postgresql://postgres:pass@prod-server:5432/casino_prod
```

El sistema automáticamente usará la URL correcta según `NODE_ENV`.

### Opción 2: Cambiando DATABASE_URL manualmente

```env
# Para conectarte a la DB de desarrollo desde local
DATABASE_URL=postgresql://postgres:pass@dev-server:5432/casino_dev
```

### Opción 3: Programáticamente en el código

```typescript
import { envs } from '@/config';

// Acceder a URLs alternativas
const dbUrl = envs.isProduction
  ? envs.database.prod
  : envs.database.local;
```

## 🐛 Troubleshooting

### El servidor no levanta

1. Verifica que el archivo `.env.local` existe
2. Verifica que todas las variables requeridas están configuradas
3. Revisa que los secrets tengan al menos 32 caracteres
4. Verifica la conexión a la base de datos

### Error: "Invalid environment variables"

El sistema usa Zod para validación. Revisa el mensaje de error específico:

```bash
❌ Invalid environment variables:
{
  JWT_SECRET: ["String must contain at least 32 character(s)"]
}
```

### No encuentra el archivo .env

```bash
⚠️  Could not load .env.local, falling back to default .env
```

Esto significa que no existe el archivo para el entorno especificado. Créalo o verifica el nombre.

## 📚 Referencias

- [Configuración del proyecto](../CLAUDE.md)
- [Documentación de Zod](https://zod.dev/)
- [Dotenv](https://github.com/motdotla/dotenv)
- [Supabase Local Development](https://supabase.com/docs/guides/cli)

## 🤝 Contribuir

Al agregar nuevas variables de entorno:

1. Agrégalas al schema en `src/config/envs.ts`
2. Actualiza todos los archivos `.env.*` y sus `.example`
3. Documenta la nueva variable en este README
4. Actualiza el tipo de retorno del objeto `envs`
