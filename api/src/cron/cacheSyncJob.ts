import cron from 'node-cron';
import { userCache } from '../persistence/cache/user.cache';
import { sessionCache } from '../persistence/cache/session.cache';
import { sessionsRepository } from '../persistence/repositories/sessions.repository';

export function startCacheSyncJob(): void {
  // Every 10 minutes: purge expired in-memory cache entries + delete expired DB sessions
  cron.schedule('*/10 * * * *', async () => {
    userCache.cleanup();
    sessionCache.cleanup();
    try {
      await sessionsRepository.deleteExpired();
    } catch (err) {
      console.error('[CacheSync] Failed to delete expired sessions from DB:', err);
    }
  });
  console.log('[CacheSync] Cron job registered (every 10 min)');
}
