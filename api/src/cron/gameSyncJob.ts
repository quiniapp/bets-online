import cron from 'node-cron';
import { gameLaunchDomain } from '../features/integrations/21viral/gameLaunch.domain';

export function startGameSyncJob(): void {
  // Runs at minute 0 of every 12th hour: 00:00 and 12:00
  cron.schedule('0 */12 * * *', async () => {
    console.log('[GameSync] Starting scheduled game sync…');
    try {
      const result = await gameLaunchDomain.syncGames();
      console.log(`[GameSync] Synced ${result.synced} games`);
    } catch (err) {
      console.error('[GameSync] Sync failed:', err);
    }
  }, { timezone: 'America/Argentina/Buenos_Aires' });
  console.log('[GameSync] Cron job registered (every 12 h)');
}
