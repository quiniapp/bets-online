import cron from 'node-cron';
import { userCache } from '../persistence/cache/user.cache';
import { sessionsRepository } from '../persistence/repositories/sessions.repository';

export function startCacheSyncJob(): void {
  // Cada 6 horas: purga usuarios expirados del caché y sesiones vencidas de DB
  cron.schedule('0 */6 * * *', async () => {
    userCache.cleanup();
    try {
      await sessionsRepository.deleteExpired();
    } catch (err) {
      console.error('[CacheSync] Failed to delete expired sessions from DB:', err);
    }
  });
  console.log('[CacheSync] Cron job registered (every 6 h)');
}
