// Set viral credentials before config module is parsed
process.env.VIRAL_USERNAME = 'testuser';
process.env.VIRAL_SECRET_KEY = 'a'.repeat(32);

import { viralService } from '../../src/services/viral.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('viralService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (viralService as any).username = 'testuser';
    (viralService as any).secretKey = 'a'.repeat(32);
    (viralService as any).baseUrl = 'https://api.stg.games-viral.com/';
  });

  describe('getGames', () => {
    it('sends POST to /v1/games with HMAC Authorization header', async () => {
      const fakeGames = [
        { id: 1, name: 'Wolf Gold', type: 'slot', defaultLogo: 'https://img/wolf.png', providerName: 'pragmatic', providerGameId: 'vs25wolfgold' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: fakeGames })
      });

      const result = await viralService.getGames();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stg.games-viral.com/v1/games',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: expect.stringMatching(/^HMAC-SHA256 testuser:/)
          })
        })
      );
      expect(result).toEqual(fakeGames);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(viralService.getGames()).rejects.toThrow('21Viral getGames failed: 500');
    });
  });

  describe('createGameSession', () => {
    const baseParams = {
      playerId: '100001',
      playerUserName: 'testplayer',
      playerDeviceType: 'Desktop' as const,
      providerName: 'pragmatic',
      providerGameId: 'vs25wolfgold',
      gameMode: 'Real' as const,
      localeCode: 'es-AR',
      countryCode: 'AR',
      currency: 'ARS',
      balance: '500.00',
      lobbyUrl: 'https://operator.com/lobby',
      depositUrl: 'https://operator.com/deposit'
    };

    it('sends POST to /v1/games/sessions and returns gameStartUrl', async () => {
      const fakeUrl = 'https://games.provider.com/session/abc123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gameStartUrl: fakeUrl })
      });

      const result = await viralService.createGameSession(baseParams);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stg.games-viral.com/v1/games/sessions',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toBe(fakeUrl);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable'
      });

      await expect(viralService.createGameSession(baseParams)).rejects.toThrow(
        '21Viral createGameSession failed: 422'
      );
    });

    it('includes optional promoBalance when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gameStartUrl: 'https://url' })
      });

      await viralService.createGameSession({ ...baseParams, promoBalance: '50.00' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.promoBalance).toBe('50.00');
    });

    it('omits optional fields when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gameStartUrl: 'https://url' })
      });

      await viralService.createGameSession(baseParams);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.promoBalance).toBeUndefined();
      expect(callBody.exitUrl).toBeUndefined();
    });
  });
});
