# Casino Management Platform 🎰

Sistema completo de gestión para casinos basado en fichas con jerarquía de usuarios, gestión contable y múltiples modelos de compensación.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [API Documentation](#api-documentation)
- [Base de Datos](#base-de-datos)
- [Testing](#testing)
- [Deployment](#deployment)

## ✨ Características

### Gestión de Usuarios
- **Jerarquía de 4 niveles**: Dueño → Administradores → Cajeros → Jugadores
- Sistema de permisos basado en roles
- Bloqueo/desbloqueo de usuarios
- Gestión de contraseñas (cambio y reset)
- Visualización de árbol jerárquico

### Gestión de Fichas
- Venta de fichas a jugadores
- Registro de premios y pérdidas
- Retiros y depósitos
- Historial completo de movimientos
- Trazabilidad contable total

### Modelos de Compensación para Cajeros
- **Porcentaje semanal**: Ganancia = Ventas - Premios
- **Panel**: Diferencia entre precio de compra y venta
- Sistema extensible para futuros modelos

### Sistema de Recupero
- Asistencia de administradores a cajeros
- Múltiples modalidades de recupero
- Tracking de deudas pendientes

## 🛠 Stack Tecnológico

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Base de Datos**: PostgreSQL (Supabase)
- **Autenticación**: JWT con sesiones
- **Validación**: Zod
- **Documentación**: Swagger

### Frontend
- **Framework**: Next.js 15
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State**: Context API

### Shared
- **Package Manager**: npm workspaces
- **Linter**: ESLint
- **Formatter**: Prettier
- **Testing**: Jest
- **Date Management**: dayjs

## 📁 Estructura del Proyecto

```
casino-management-platform/
├── api/                    # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── controllers/    # Request handlers
│   │   ├── domain/         # Business logic
│   │   ├── persistence/    # Database layer
│   │   ├── middleware/     # Auth, validation, errors
│   │   ├── config/         # Configuration files
│   │   └── server.ts       # Entry point
│   └── package.json
├── web/                    # Frontend (Next.js)
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   └── package.json
├── helper/                 # Shared utilities
│   ├── src/
│   │   ├── types/         # TypeScript types
│   │   ├── validators/    # Zod schemas
│   │   ├── constants/     # Constants
│   │   └── utils/         # Utility functions
│   └── package.json
└── package.json           # Root package.json
```

## 📋 Requisitos Previos

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **PostgreSQL**: >= 15 (o cuenta de Supabase)
- **Git**: Para clonar el repositorio

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd bets-online
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará todas las dependencias en los tres workspaces (api, web, helper).

### 3. Configurar variables de entorno

Crea archivos `.env` en cada workspace:

**Raíz** (`.env`):
```bash
cp .env.example .env
```

**API** (`api/.env`):
```bash
cp api/.env.example api/.env
```

**Web** (`web/.env.local`):
```bash
cp web/.env.example web/.env.local
```

## ⚙️ Configuración

### 1. Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia las credenciales en `api/.env`:

```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

3. Ejecuta las migraciones:

```bash
# Opción 1: Con Supabase CLI
supabase link --project-ref your-project-ref
supabase db push

# Opción 2: Con psql
psql $DATABASE_URL -f api/src/persistence/migrations/001_initial_schema.sql
```

### 2. JWT y Sesiones

Genera secrets seguros para JWT en `api/.env`:

```bash
# En Linux/Mac
openssl rand -base64 32

# O usa cualquier generador de strings aleatorios
```

```env
JWT_SECRET=your-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
SESSION_SECRET=your-secure-session-secret-here
```

### 3. Usuario Administrador Inicial

Configura el usuario owner en `api/.env`:

```env
ADMIN_EMAIL=admin@casino.com
ADMIN_PASSWORD=change-this-password
ADMIN_USERNAME=owner
```

**⚠️ IMPORTANTE**: Cambia estas credenciales después del primer despliegue.

## 🎯 Uso

### Desarrollo

Ejecuta el proyecto completo (API + Web):

```bash
npm run dev
```

O ejecuta cada workspace por separado:

```bash
# Solo API
npm run api:dev

# Solo Web
npm run web:dev

# Build helper (si haces cambios)
npm run helper:build
```

El proyecto estará disponible en:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **API Docs**: http://localhost:3001/doc

### Build para Producción

```bash
# Build completo
npm run build

# Build individual
npm run build --workspace=api
npm run build --workspace=web
npm run build --workspace=helper
```

### Testing

```bash
# Run todos los tests
npm test

# Watch mode
npm run test:watch

# Con coverage
npm test -- --coverage
```

### Linting y Formato

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

## 📚 API Documentation

La documentación completa del API está disponible en Swagger:

**Local**: http://localhost:3001/doc

### Endpoints Principales

#### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Cambiar contraseña
- `GET /api/auth/me` - Usuario actual

#### Usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/:id` - Obtener usuario
- `PATCH /api/users/:id` - Actualizar usuario
- `POST /api/users/:id/block` - Bloquear usuario
- `GET /api/users/me/children` - Mis usuarios hijos
- `GET /api/users/me/tree` - Árbol jerárquico

#### Fichas
- `POST /api/chips/sell` - Vender fichas
- `POST /api/chips/prize` - Pagar premio
- `POST /api/chips/loss` - Registrar pérdida
- `POST /api/chips/withdraw` - Retirar fichas
- `GET /api/chips/my-balance` - Mi saldo
- `GET /api/chips/movements/:userId` - Historial de movimientos

## 🗄️ Base de Datos

### Tablas Principales

1. **users** - Usuarios con jerarquía
2. **balances** - Saldos de fichas
3. **chip_movements** - Movimientos contables
4. **cashier_compensation_modes** - Modos de compensación
5. **cashier_settlements** - Liquidaciones periódicas
6. **chip_panels** - Paneles de fichas
7. **recoveries** - Recuperos
8. **sessions** - Sesiones activas
9. **audit_logs** - Log de auditoría

Ver [Database Schema](./api/src/persistence/migrations/README.md) para más detalles.

## 🧪 Testing

### Backend Tests

```bash
cd api
npm test
```

### Frontend Tests

```bash
cd web
npm test
```

### E2E Tests (TBD)

```bash
npm run test:e2e
```

## 🚢 Deployment

### API (Backend)

1. **Variables de entorno**: Configura todas las variables en tu plataforma
2. **Database**: Ejecuta migraciones en producción
3. **Build**: `npm run build --workspace=api`
4. **Start**: `npm start --workspace=api`

Opciones de hosting:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

### Web (Frontend)

```bash
cd web
npm run build
```

Opciones de hosting:
- Vercel (recomendado)
- Netlify
- Cloudflare Pages

## 📝 Scripts Disponibles

### Raíz
- `npm run dev` - Desarrollo completo
- `npm run build` - Build completo
- `npm test` - Tests completos
- `npm run lint` - Lint completo
- `npm run format` - Format completo

### API
- `npm run dev` - Desarrollo con nodemon
- `npm run build` - Build TypeScript
- `npm start` - Start producción
- `npm test` - Tests con Jest

### Web
- `npm run dev` - Desarrollo Next.js
- `npm run build` - Build producción
- `npm start` - Start producción
- `npm run lint` - Lint Next.js

### Helper
- `npm run build` - Compilar TypeScript
- `npm run dev` - Watch mode

## 🔒 Seguridad

- ✅ Autenticación JWT con refresh tokens
- ✅ Passwords hasheados con bcrypt (10 rounds)
- ✅ Validación de inputs con Zod
- ✅ Helmet para security headers
- ✅ CORS configurado
- ✅ Rate limiting (TBD)
- ✅ SQL injection prevention (Supabase)
- ✅ XSS prevention

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Equipo

Desarrollado para gestión integral de casinos.

## 📞 Soporte

Para preguntas o soporte, contacta al equipo de desarrollo.

---

**⚠️ Recordatorios Importantes**:
1. Cambia las credenciales por defecto después del primer despliegue
2. Usa HTTPS en producción
3. Configura backups automáticos de la base de datos
4. Revisa los logs de auditoría regularmente
5. Mantén las dependencias actualizadas

---

Made with ❤️ using TypeScript, React, and Node.js
