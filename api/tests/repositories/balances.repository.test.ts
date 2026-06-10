import { BalancesRepository } from '../../src/features/chips/balances.repository';

describe('BalancesRepository.updateChipBalance', () => {
  it('should export updateChipBalance method', () => {
    const repo = new BalancesRepository();
    expect(typeof repo.updateChipBalance).toBe('function');
  });

  it('should export findByUserIdWithLock method', () => {
    const repo = new BalancesRepository();
    expect(typeof repo.findByUserIdWithLock).toBe('function');
  });
});
