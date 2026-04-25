import cron from 'node-cron';
import { userCache } from '../persistence/cache/user.cache';
import { sessionsRepository } from '../persistence/repositories/sessions.repository';

export function startCacheSyncJob(): void {
  cron.schedule('0 */6 * * *', () => {
    userCache.cleanup();
  });

  // Sessions now live up to 7 days; periodic cleanup prevents table growth.
  cron.schedule('0 4 * * *', async () => {
    await sessionsRepository.deleteExpired();
  });

  console.log('[CacheSync] Cron jobs registered (cache: 6h, sessions: daily 3am)');
}
