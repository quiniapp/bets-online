import { buildHmacAuthHeader, canonicalize } from '../../src/utils/hmac.utils';

describe('hmac.utils', () => {
  describe('canonicalize', () => {
    it('sorts object keys alphabetically', () => {
      const input = { z: 1, a: 2, m: 3 };
      expect(canonicalize(input)).toBe('{"a":2,"m":3,"z":1}');
    });

    it('handles nested objects recursively', () => {
      const input = { b: { y: 1, x: 2 }, a: 'hello' };
      expect(canonicalize(input)).toBe('{"a":"hello","b":{"x":2,"y":1}}');
    });

    it('matches the example from 21Viral spec', () => {
      const body = {
        playerId: '1',
        currency: 'EUR',
        providerName: 'pragmatic',
        providerGameId: 'vs20olympgate',
        gameMode: 'Real',
        timestamp: 1734904927,
        language: 'en',
        playerDeviceType: 'Desktop',
        balance: '504.44',
        playerUserName: 'player1'
      };
      const expected =
        '{"balance":"504.44","currency":"EUR","gameMode":"Real","language":"en",' +
        '"playerDeviceType":"Desktop","playerId":"1","playerUserName":"player1",' +
        '"providerGameId":"vs20olympgate","providerName":"pragmatic","timestamp":1734904927}';
      expect(canonicalize(body)).toBe(expected);
    });
  });

  describe('buildHmacAuthHeader', () => {
    it('produces the Authorization header from the 21Viral spec example', () => {
      const body = {
        playerId: '1',
        currency: 'EUR',
        providerName: 'pragmatic',
        providerGameId: 'vs20olympgate',
        gameMode: 'Real',
        timestamp: 1734904927,
        language: 'en',
        playerDeviceType: 'Desktop',
        balance: '504.44',
        playerUserName: 'player1'
      };
      const header = buildHmacAuthHeader('app-id-1', 'app secret', body);
      expect(header).toBe(
        'HMAC-SHA256 app-id-1:b21161d379510092a955ae02fb792d9d7713b483390bac19032debb6e11bc3a9'
      );
    });
  });
});
