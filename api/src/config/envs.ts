import { config } from 'dotenv';
import { z } from 'zod';
import path from 'path';

/**
 * Entornos soportados
 */
export enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Determina qué archivo .env cargar basado en el entorno
 * Puedes usar APP_ENV para forzar un entorno específico
 * Ejemplos:
 *   - APP_ENV=local npm run dev    -> carga .env.local
 *   - APP_ENV=production npm run dev -> carga .env.production
 *   - NODE_ENV=production          -> carga .env.production
 */
const parseDurationMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: "${duration}". Use e.g. "15m", "7d", "1h".`);
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
  };
  return value * multipliers[match[2]];
};

const getEnvFile = (): string => {
  const appEnv = process.env.APP_ENV as Environment;
  const nodeEnv = process.env.NODE_ENV as Environment;

  // APP_ENV tiene prioridad sobre NODE_ENV
  const environment = appEnv || nodeEnv || Environment.LOCAL;

  const envFiles: Record<Environment, string> = {
    [Environment.LOCAL]: '.env.local',
    [Environment.DEVELOPMENT]: '.env.development',
    [Environment.PRODUCTION]: '.env.production',
    [Environment.TEST]: '.env.test'
  };

  return envFiles[environment] || '.env.local';
};

// Cargar el archivo .env correspondiente
const envFile = getEnvFile();
const envPath = path.resolve(process.cwd(), envFile);

console.log(`🔧 Loading environment from: ${envFile}`);

const result = config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Could not load ${envFile}, falling back to default .env`);
  config(); // Fallback al .env por defecto
}

/**
 * Schema de validación para las variables de entorno
 * Usando Zod para validación y tipado fuerte
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum([Environment.LOCAL, Environment.DEVELOPMENT, Environment.PRODUCTION, Environment.TEST])
    .default(Environment.LOCAL),
  PORT: z.string().default('3001').transform(Number),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_LOCAL: z.string().optional(),
  DATABASE_URL_DEV: z.string().optional(),
  DATABASE_URL_PROD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Session
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform(origins => origins.split(',').map(o => o.trim())),

  // Admin Bootstrap
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_USERNAME: z.string().optional(),

  // Supabase (opcional si usas Supabase directamente)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // 21Viral provider integration
  VIRAL_USERNAME: z.string().min(1, 'VIRAL_USERNAME is required'),
  VIRAL_SECRET_KEY: z.string().min(32, 'VIRAL_SECRET_KEY must be at least 32 characters'),
  INTEGRATOR_URL: z.string().url().optional()
});

/**
 * Valida y parsea las variables de entorno
 */
const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
};

/**
 * Variables de entorno validadas y tipadas
 */
const envVars = parseEnv();

/**
 * Helper para obtener la DATABASE_URL correcta según el entorno
 */
const getDatabaseUrl = (): string => {
  const environment = envVars.NODE_ENV;

  // Si hay URLs específicas por entorno, usarlas
  if (environment === Environment.LOCAL && envVars.DATABASE_URL_LOCAL) {
    return envVars.DATABASE_URL_LOCAL;
  }

  if (environment === Environment.DEVELOPMENT && envVars.DATABASE_URL_DEV) {
    return envVars.DATABASE_URL_DEV;
  }

  if (environment === Environment.PRODUCTION && envVars.DATABASE_URL_PROD) {
    return envVars.DATABASE_URL_PROD;
  }

  // Fallback a DATABASE_URL genérica
  return envVars.DATABASE_URL;
};

/**
 * Configuración exportada - USAR ESTE OBJETO EN TODA LA APP
 */
export const envs = {
  // Environment
  NODE_ENV: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === Environment.PRODUCTION,
  isDevelopment: envVars.NODE_ENV === Environment.DEVELOPMENT,
  isLocal: envVars.NODE_ENV === Environment.LOCAL,
  isTest: envVars.NODE_ENV === Environment.TEST,

  // Server
  PORT: envVars.PORT,
  API_URL: envVars.API_URL,

  // Database
  DATABASE_URL: getDatabaseUrl(),
  database: {
    url: getDatabaseUrl(),
    local: envVars.DATABASE_URL_LOCAL,
    dev: envVars.DATABASE_URL_DEV,
    prod: envVars.DATABASE_URL_PROD
  },

  // JWT
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    accessTokenMaxAge: parseDurationMs(envVars.JWT_EXPIRES_IN),
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
    refreshTokenMaxAge: parseDurationMs(envVars.JWT_REFRESH_EXPIRES_IN),
  },

  // Session
  session: {
    secret: envVars.SESSION_SECRET
  },

  // CORS
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS
  },

  // Admin
  admin: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
    username: envVars.ADMIN_USERNAME
  },

  // Supabase
  supabase: {
    url: envVars.SUPABASE_URL,
    serviceKey: envVars.SUPABASE_SERVICE_KEY
  },

  // 21Viral provider integration
  viral: {
    username: envVars.VIRAL_USERNAME,
    secretKey: envVars.VIRAL_SECRET_KEY,
    integratorUrl: envVars.INTEGRATOR_URL
  }
} as const;

// Log de configuración actual
console.log('✅ Environment Configuration:');
console.log(`   Environment: ${envs.NODE_ENV}`);
console.log(`   Port: ${envs.PORT}`);
console.log(`   Database: ${envs.DATABASE_URL.substring(0, 50)}...`);
console.log(`   CORS Origins: ${envs.cors.allowedOrigins.join(', ')}`);
console.log(`   API URL: ${envs.API_URL}`);

export default envs;
