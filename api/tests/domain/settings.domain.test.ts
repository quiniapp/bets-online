import { ErrorCode, UserRole } from 'helper';

jest.mock('../../src/persistence/models', () => ({}));
jest.mock('../../src/features/users/users.repository', () => ({
  usersRepository: { findById: jest.fn(), findOwner: jest.fn() },
}));
jest.mock('../../src/features/settings/casino-settings.repository', () => ({
  casinoSettingsRepository: { findByOwnerId: jest.fn(), patch: jest.fn() },
}));
jest.mock('../../src/utils/games-cache', () => ({
  casinoSettingsMemCache: { getOrFetch: jest.fn(), invalidate: jest.fn() },
}));
jest.mock('../../src/utils/cache-warmup', () => ({
  warmLobbySections: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/utils/audit', () => ({ writeAudit: jest.fn() }));

import { SettingsDomain } from '../../src/features/settings/settings.domain';
import { usersRepository } from '../../src/features/users/users.repository';
import { casinoSettingsRepository } from '../../src/features/settings/casino-settings.repository';
import { casinoSettingsMemCache } from '../../src/utils/games-cache';

const OWNER_ID = 'owner-1';
const ADMIN_ID = 'admin-1';
const CASHIER_ID = 'cashier-1';

const makeUser = (id: string, role: UserRole, parentUserId?: string) => ({
  id,
  role,
  parentUserId,
  username: id,
  status: 'ACTIVE',
});

const baseSettings = {
  id: 'settings-1',
  ownerId: OWNER_ID,
  headerCategories: [],
  lobbySlots: [],
  footerLinks: [],
  bottomNavItems: [],
  theme: 'dark' as const,
  updatedAt: new Date(),
};

describe('SettingsDomain.updateCasinoSettings — permisos', () => {
  let domain: SettingsDomain;

  beforeEach(() => {
    jest.clearAllMocks();
    domain = new SettingsDomain();
    (casinoSettingsRepository.patch as jest.Mock).mockResolvedValue(baseSettings);
    (casinoSettingsMemCache.invalidate as jest.Mock).mockReturnValue(undefined);
    (usersRepository.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === OWNER_ID) return Promise.resolve(makeUser(OWNER_ID, UserRole.OWNER));
      if (id === ADMIN_ID) return Promise.resolve(makeUser(ADMIN_ID, UserRole.ADMIN, OWNER_ID));
      if (id === CASHIER_ID) return Promise.resolve(makeUser(CASHIER_ID, UserRole.CASHIER, OWNER_ID));
      return Promise.resolve(null);
    });
  });

  it('permite al ADMIN cambiar solo el theme', async () => {
    await domain.updateCasinoSettings(ADMIN_ID, { theme: 'casino' });

    expect(casinoSettingsRepository.patch).toHaveBeenCalledWith(OWNER_ID, { theme: 'casino' });
    expect(casinoSettingsMemCache.invalidate).toHaveBeenCalled();
  });

  it('bloquea al ADMIN si intenta cambiar otro campo', async () => {
    await expect(
      domain.updateCasinoSettings(ADMIN_ID, { lobbySlots: [] })
    ).rejects.toMatchObject({ statusCode: 403, code: ErrorCode.INSUFFICIENT_PERMISSIONS });

    expect(casinoSettingsRepository.patch).not.toHaveBeenCalled();
  });

  it('bloquea al ADMIN si mezcla theme con otro campo', async () => {
    await expect(
      domain.updateCasinoSettings(ADMIN_ID, { theme: 'casino', footerLinks: [] })
    ).rejects.toMatchObject({ statusCode: 403, code: ErrorCode.INSUFFICIENT_PERMISSIONS });

    expect(casinoSettingsRepository.patch).not.toHaveBeenCalled();
  });

  it('deja al CASHIER sin permisos, incluso para el theme', async () => {
    await expect(
      domain.updateCasinoSettings(CASHIER_ID, { theme: 'casino' })
    ).rejects.toMatchObject({ statusCode: 403, code: ErrorCode.INSUFFICIENT_PERMISSIONS });

    expect(casinoSettingsRepository.patch).not.toHaveBeenCalled();
  });

  it('permite al OWNER cambiar cualquier campo', async () => {
    await domain.updateCasinoSettings(OWNER_ID, { lobbySlots: [] });

    expect(casinoSettingsRepository.patch).toHaveBeenCalledWith(OWNER_ID, { lobbySlots: [] });
  });
});
