import { envs } from './envs';

/**
 * CONFIGURACIÓN PRINCIPAL DE LA APLICACIÓN
 *
 * Este archivo re-exporta la configuración desde envs.ts
 * Usa este objeto para acceder a todas las variables de entorno
 *
 * Para cambiar de entorno:
 *   APP_ENV=local pnpm dev       -> usa .env.local
 *   APP_ENV=development pnpm dev -> usa .env.development
 *   APP_ENV=production pnpm dev  -> usa .env.production
 */

export const config = {
  server: {
    port: envs.PORT,
    env: envs.NODE_ENV,
    apiUrl: envs.API_URL
  },
  database: {
    url: envs.DATABASE_URL,
    // URLs alternativas por entorno (si están configuradas)
    local: envs.database.local,
    dev: envs.database.dev,
    prod: envs.database.prod
  },
  jwt: envs.jwt,
  session: envs.session,
  cors: envs.cors,
  admin: envs.admin,
  supabase: envs.supabase,
  viral: envs.viral,
  logging: envs.logging,
  timezone: envs.timezone
};

// Re-exportar envs para uso directo
export { envs, Environment } from './envs';

export default config;
