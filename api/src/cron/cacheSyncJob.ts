import cron from 'node-cron';
import { userCache } from '../persistence/cache/user.cache';

export function startCacheSyncJob(): void {
  // Cada 6 horas: purga entradas de usuarios expiradas del caché en memoria.
  // Las sesiones en DB expiran solas (20 min) y son rechazadas en el query;
  // no requieren limpieza activa salvo que el volumen de usuarios justifique un DELETE periódico.
  cron.schedule('0 */6 * * *', () => {
    userCache.cleanup();
  });
  console.log('[CacheSync] Cron job registered (every 6 h)');
}
