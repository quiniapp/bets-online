import { providerTypeOrdersRepository } from '../../src/features/provider-type-orders/provider-type-orders.repository';
import { ProviderGameTypeOrderModel } from '../../src/persistence/models';

const mockQuery = jest.fn().mockResolvedValue([]);
const mockTransaction = jest.fn(async (cb: (t: unknown) => Promise<void>) => cb('TX'));

jest.mock('../../src/persistence/models', () => ({
  ProviderGameTypeOrderModel: {
    destroy: jest.fn().mockResolvedValue(0),
    bulkCreate: jest.fn().mockResolvedValue([]),
    sequelize: {
      query: (...args: unknown[]) => mockQuery(...args),
      transaction: (cb: (t: unknown) => Promise<void>) => mockTransaction(cb),
    },
  },
}));

describe('ProviderTypeOrdersRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('findEffectiveByProvider joins rules and game_types ordered by effective sort', async () => {
    await providerTypeOrdersRepository.findEffectiveByProvider('pragmatic');
    const [sql, options] = mockQuery.mock.calls[0];
    expect(sql).toContain('FROM (');
    expect(sql).toContain('GROUP BY game_type');
    expect(sql).toContain('LEFT JOIN provider_game_type_orders');
    expect(sql).toContain('LEFT JOIN game_types');
    expect(sql).toContain('COALESCE(pgto.sort_order, 2147483647)');
    expect((options as { replacements: { providerName: string } }).replacements.providerName).toBe('pragmatic');
  });

  it('replaceAll deletes then bulk-creates inside one transaction', async () => {
    await providerTypeOrdersRepository.replaceAll('pragmatic', [
      { gameType: 'LiveGames', sortOrder: 0 },
      { gameType: 'videoSlots', sortOrder: 1 },
    ]);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(ProviderGameTypeOrderModel.destroy).toHaveBeenCalledWith({
      where: { providerName: 'pragmatic' },
      transaction: 'TX',
    });
    expect(ProviderGameTypeOrderModel.bulkCreate).toHaveBeenCalledWith(
      [
        { providerName: 'pragmatic', gameType: 'LiveGames', sortOrder: 0 },
        { providerName: 'pragmatic', gameType: 'videoSlots', sortOrder: 1 },
      ],
      { transaction: 'TX' }
    );
  });

  it('replaceAll with empty items only deletes (clears rules)', async () => {
    await providerTypeOrdersRepository.replaceAll('pragmatic', []);
    expect(ProviderGameTypeOrderModel.destroy).toHaveBeenCalledTimes(1);
    expect(ProviderGameTypeOrderModel.bulkCreate).not.toHaveBeenCalled();
  });
});
