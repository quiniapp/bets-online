import { gameBannersRepository } from '../../src/features/game-banners/game-banners.repository';
import { GameBannerModel } from '../../src/features/game-banners/game-banner.model';

jest.mock('../../src/features/game-banners/game-banner.model', () => ({
  GameBannerModel: {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
    max: jest.fn().mockResolvedValue(null)
  }
}));

const row = (over: Record<string, unknown> = {}) => ({
  get: () => ({
    id: 'b1',
    gameId: null,
    sortOrder: 1,
    isActive: true,
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over
  })
});

describe('GameBannersRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create auto-assigns sortOrder = max + 1 when not provided', async () => {
    (GameBannerModel.max as jest.Mock).mockResolvedValue(4);
    (GameBannerModel.create as jest.Mock).mockResolvedValue(row({ sortOrder: 5 }));
    const res = await gameBannersRepository.create({});
    expect(GameBannerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 5, isActive: true })
    );
    expect(res.sortOrder).toBe(5);
    expect(res.gameId).toBeNull();
  });

  it('create uses sortOrder 1 when table is empty', async () => {
    (GameBannerModel.max as jest.Mock).mockResolvedValue(null);
    (GameBannerModel.create as jest.Mock).mockResolvedValue(row({ sortOrder: 1 }));
    await gameBannersRepository.create({});
    expect(GameBannerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 1 })
    );
  });

  it('setImageUrl updates the row imageUrl', async () => {
    await gameBannersRepository.setImageUrl('b1', 'http://x/banner-images/banners/b1/a.png');
    expect(GameBannerModel.update).toHaveBeenCalledWith(
      { imageUrl: 'http://x/banner-images/banners/b1/a.png' },
      { where: { id: 'b1' } }
    );
  });

  it('delete returns the deleted banner and destroys it', async () => {
    const destroy = jest.fn();
    (GameBannerModel.findByPk as jest.Mock).mockResolvedValue({
      ...row({ imageUrl: 'http://x/banner-images/banners/b1/a.png' }),
      destroy
    });
    const res = await gameBannersRepository.delete('b1');
    expect(res?.imageUrl).toContain('a.png');
    expect(destroy).toHaveBeenCalled();
  });

  it('delete returns null when not found', async () => {
    (GameBannerModel.findByPk as jest.Mock).mockResolvedValue(null);
    expect(await gameBannersRepository.delete('nope')).toBeNull();
  });

  it('findAllActive queries active rows ordered, WITHOUT a game include', async () => {
    (GameBannerModel.findAll as jest.Mock).mockResolvedValue([]);
    await gameBannersRepository.findAllActive();
    const arg = (GameBannerModel.findAll as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ isActive: true });
    expect(arg.include).toBeUndefined();
  });
});
