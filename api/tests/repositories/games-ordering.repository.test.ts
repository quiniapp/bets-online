import { gamesRepository } from '../../src/features/games/games.repository';
import { GameModel } from '../../src/persistence/models';

jest.mock('../../src/persistence/models', () => ({
  GameModel: {
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 })
  }
}));

// Catalog order: provider sort → provider name → per-provider type rule →
// global game_types sort → game_type name → game sort → name.
function assertCatalogOrder(order: unknown): void {
  const orderStr = JSON.stringify(order);
  expect(orderStr).toContain('2147483647');
  const providerSort = orderStr.indexOf('SELECT sort_order FROM providers');
  const typeRule = orderStr.indexOf('FROM provider_game_type_orders');
  const globalTypeSort = orderStr.indexOf('SELECT sort_order FROM game_types');
  const typeName = orderStr.indexOf('COALESCE(\\"GameModel\\".\\"game_type\\"');
  const gameSort = orderStr.indexOf('COALESCE(\\"GameModel\\".\\"sort_order\\"');
  expect(providerSort).toBeGreaterThanOrEqual(0);
  expect(typeRule).toBeGreaterThan(providerSort);
  expect(globalTypeSort).toBeGreaterThan(typeRule);
  expect(typeName).toBeGreaterThan(globalTypeSort);
  expect(gameSort).toBeGreaterThan(typeName);
}

describe('GamesRepository ordering', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findAll orders by provider, per-provider type rule, global type sort, then game sort', async () => {
    await gamesRepository.findAll(false);
    const call = (GameModel.findAll as jest.Mock).mock.calls[0][0];
    assertCatalogOrder(call.order);
  });

  it('findPaginated orders by provider, per-provider type rule, global type sort, then game sort', async () => {
    await gamesRepository.findPaginated(1, 10);
    const call = (GameModel.findAndCountAll as jest.Mock).mock.calls[0][0];
    assertCatalogOrder(call.order);
  });
});
