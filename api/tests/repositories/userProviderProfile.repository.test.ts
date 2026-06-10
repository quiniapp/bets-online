import { UserProviderProfileRepository } from '../../src/features/integrations/21viral/userProviderProfile.repository';
import { sequelize } from '../../src/config/sequelize';

afterAll(() => sequelize.close());

describe('UserProviderProfileRepository', () => {
  const repo = new UserProviderProfileRepository();

  describe('findByProviderPlayerId', () => {
    it('should return null when profile does not exist', async () => {
      const result = await repo.findByProviderPlayerId('21viral', '99999999');
      expect(result).toBeNull();
    });
  });
});
