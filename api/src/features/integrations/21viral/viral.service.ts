import { config } from '../../../config';
import { buildHmacAuthHeader } from '../../../utils/hmac.utils';
import { addProviderTiming } from '../../../utils/request-context';
import { logger } from '../../../utils/logger';

export interface ViralGame {
  id: number;
  name: string;
  type: string;
  defaultLogo: string;
  providerName: string;
  providerGameId: string;
  rtp?: number;
}

export interface CreateGameSessionParams {
  playerId: string;
  playerUserName: string;
  playerDeviceType: 'Desktop' | 'Mobile';
  providerName: string;
  providerGameId: string;
  gameMode: 'Real' | 'Demo';
  localeCode: string;
  countryCode: string;
  currency: string;
  balance: string;
  lobbyUrl: string;
  depositUrl: string;
  promoBalance?: string;
  exitUrl?: string;
}

class ViralService {
  private username: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.username = config.viral.username;
    this.secretKey = config.viral.secretKey;
    this.baseUrl = config.viral.integratorUrl ?? 'https://api.stg.games-viral.com/';
  }

  private buildHeaders(body: Record<string, unknown>): Record<string, string> {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: buildHmacAuthHeader(this.username, this.secretKey, body)
    };
  }

  private log(direction: 'REQUEST' | 'RESPONSE', endpoint: string, data: unknown) {
    logger.debug({ provider: '21viral', direction, endpoint, data }, 'provider-payload');
  }

  /**
   * fetch wrapper that measures the round-trip to the 21viral integrator and
   * attributes it to the current request (addProviderTiming) so the per-request
   * timing log can separate provider latency from DB/app latency.
   */
  private async timedFetch(endpoint: string, init: RequestInit): Promise<Response> {
    const start = process.hrtime.bigint();
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, init);
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      addProviderTiming(ms);
      logger.info(
        { provider: '21viral', endpoint, ms: Math.round(ms * 100) / 100, status: res.status },
        'provider-call'
      );
      return res;
    } catch (error) {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      addProviderTiming(ms);
      logger.error(
        { provider: '21viral', endpoint, ms: Math.round(ms * 100) / 100, error: String(error) },
        'provider-call-failed'
      );
      throw error;
    }
  }

  async getGames(): Promise<ViralGame[]> {
    const body = { timestamp: Math.floor(Date.now() / 1000) };
    this.log('REQUEST', 'v1/games', body);

    const res = await this.timedFetch('v1/games', {
      method: 'POST',
      headers: this.buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      this.log('RESPONSE', 'v1/games', { status: res.status, body: text });
      throw new Error(`21Viral getGames failed: ${res.status} — ${text}`);
    }

    const data = await res.json() as { games: ViralGame[] };
    this.log('RESPONSE', 'v1/games', { status: res.status, gameCount: data.games?.length });
    return data.games;
  }

  async createGameSession(params: CreateGameSessionParams): Promise<string> {
    const body: Record<string, unknown> = {
      timestamp: Math.floor(Date.now() / 1000),
      playerId: params.playerId,
      playerUserName: params.playerUserName,
      playerDeviceType: params.playerDeviceType,
      providerName: params.providerName,
      providerGameId: params.providerGameId,
      gameMode: params.gameMode,
      localeCode: params.localeCode,
      countryCode: params.countryCode,
      currency: params.currency,
      balance: params.balance,
      lobbyUrl: params.lobbyUrl,
      depositUrl: params.depositUrl
    };

    if (params.promoBalance !== undefined) body.promoBalance = params.promoBalance;
    if (params.exitUrl !== undefined) body.exitUrl = params.exitUrl;

    this.log('REQUEST', 'v1/games/sessions', body);

    const res = await this.timedFetch('v1/games/sessions', {
      method: 'POST',
      headers: this.buildHeaders(body),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      this.log('RESPONSE', 'v1/games/sessions', { status: res.status, body: text });
      throw new Error(`21Viral createGameSession failed: ${res.status} — ${text}`);
    }

    const data = (await res.json()) as { gameStartUrl: string };
    this.log('RESPONSE', 'v1/games/sessions', { status: res.status, gameStartUrl: data.gameStartUrl });
    return data.gameStartUrl;
  }
}

export const viralService = new ViralService();
