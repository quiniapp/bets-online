import { ProviderTransactionRepository } from '../../src/persistence/repositories/providerTransaction.repository';
import { TransactionType } from 'helper';

describe('ProviderTransactionRepository', () => {
  const repo = new ProviderTransactionRepository();

  describe('findByIdempotencyKey', () => {
    it('should return null when transaction does not exist', async () => {
      const result = await repo.findByIdempotencyKey(
        '21viral',
        'non-existent-tx-id',
        TransactionType.Debit
      );
      expect(result).toBeNull();
    });
  });

  describe('findOriginalForReversal', () => {
    it('should return null when no Debit/Credit found for given id', async () => {
      const result = await repo.findOriginalForReversal('21viral', 'non-existent-tx-id');
      expect(result).toBeNull();
    });
  });
});
