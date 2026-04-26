import { gamesRepository } from '../../src/persistence/repositories/games.repository';
import { GameModel } from '../../src/persistence/models';

jest.mock('../../src/persistence/models', () => ({
  GameModel: {
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 })
  }
}));

describe('GamesRepository ordering', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findAll uses provider sort_order then game sort_order ORDER BY', async () => {
    await gamesRepository.findAll(false);
    const call = (GameModel.findAll as jest.Mock).mock.calls[0][0];
    const orderStr = JSON.stringify(call.order);
    expect(orderStr).toContain('sort_order');
    expect(orderStr).toContain('2147483647');
  });

  it('findPaginated uses provider sort_order then game sort_order ORDER BY', async () => {
    await gamesRepository.findPaginated(1, 10);
    const call = (GameModel.findAndCountAll as jest.Mock).mock.calls[0][0];
    const orderStr = JSON.stringify(call.order);
    expect(orderStr).toContain('sort_order');
    expect(orderStr).toContain('2147483647');
  });
});
