import cron from 'node-cron';
import { gameLaunchDomain } from '../features/integrations/21viral/gameLaunch.domain';

export function startGameSyncJob(): void {
  // Runs once a day at 04:00 (America/Argentina/Buenos_Aires)
  cron.schedule('0 4 * * *', async () => {
    console.log('[GameSync] Starting scheduled game sync…');
    try {
      const result = await gameLaunchDomain.syncGames();
      console.log(`[GameSync] Synced ${result.synced} games`);
    } catch (err) {
      console.error('[GameSync] Sync failed:', err);
    }
  }, { timezone: 'America/Argentina/Buenos_Aires' });
  console.log('[GameSync] Cron job registered (daily 04:00 AR)');
}
