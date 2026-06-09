jest.mock('../../src/persistence/repositories/game-banners.repository', () => ({
  gameBannersRepository: {
    create: jest.fn(),
    setImageUrl: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
    findAllActive: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn()
  }
}));
jest.mock('../../src/services/supabase-storage.service', () => ({
  supabaseStorage: {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    pathFromPublicUrl: jest.fn()
  }
}));

import { gameBannersDomain } from '../../src/domain/game-banners/game-banners.domain';
import { gameBannersRepository } from '../../src/persistence/repositories/game-banners.repository';
import { supabaseStorage } from '../../src/services/supabase-storage.service';

const file = { buffer: Buffer.from('x'), originalname: 'a.png', mimetype: 'image/png' };

describe('GameBannersDomain', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createWithImage creates a banner, uploads the file, and stores the url', async () => {
    (gameBannersRepository.create as jest.Mock).mockResolvedValue({
      id: 'b1', gameId: null, sortOrder: 1, isActive: true, imageUrl: null
    });
    (supabaseStorage.uploadFile as jest.Mock).mockResolvedValue(
      'http://x/banner-images/banners/b1/1-a.png'
    );
    const res = await gameBannersDomain.createWithImage(file);
    expect(supabaseStorage.uploadFile).toHaveBeenCalledWith(
      'banner-images',
      expect.stringContaining('banners/b1/'),
      file.buffer,
      'image/png'
    );
    expect(gameBannersRepository.setImageUrl).toHaveBeenCalledWith(
      'b1', 'http://x/banner-images/banners/b1/1-a.png'
    );
    expect(res.imageUrl).toContain('1-a.png');
  });

  it('createWithImage rolls back the banner row if the upload fails', async () => {
    (gameBannersRepository.create as jest.Mock).mockResolvedValue({
      id: 'b1', gameId: null, sortOrder: 1, isActive: true, imageUrl: null
    });
    (supabaseStorage.uploadFile as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(gameBannersDomain.createWithImage(file)).rejects.toThrow('boom');
    expect(gameBannersRepository.delete).toHaveBeenCalledWith('b1');
  });

  it('replaceImage returns null when the banner does not exist', async () => {
    (gameBannersRepository.findById as jest.Mock).mockResolvedValue(null);
    expect(await gameBannersDomain.replaceImage('nope', file)).toBeNull();
    expect(supabaseStorage.uploadFile).not.toHaveBeenCalled();
  });

  it('delete removes the storage file when an imageUrl is present', async () => {
    (gameBannersRepository.delete as jest.Mock).mockResolvedValue({
      id: 'b1', imageUrl: 'http://x/banner-images/banners/b1/a.png'
    });
    (supabaseStorage.pathFromPublicUrl as jest.Mock).mockReturnValue('banners/b1/a.png');
    const ok = await gameBannersDomain.delete('b1');
    expect(ok).toBe(true);
    expect(supabaseStorage.deleteFile).toHaveBeenCalledWith('banner-images', 'banners/b1/a.png');
  });

  it('delete returns false and skips storage when banner not found', async () => {
    (gameBannersRepository.delete as jest.Mock).mockResolvedValue(null);
    expect(await gameBannersDomain.delete('x')).toBe(false);
    expect(supabaseStorage.deleteFile).not.toHaveBeenCalled();
  });

  it('replaceImage deletes the previous image object after uploading the new one', async () => {
    (gameBannersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'b1', imageUrl: 'http://x/banner-images/banners/b1/old.png'
    });
    (supabaseStorage.uploadFile as jest.Mock).mockResolvedValue(
      'http://x/banner-images/banners/b1/2-a.png'
    );
    (supabaseStorage.pathFromPublicUrl as jest.Mock).mockReturnValue('banners/b1/old.png');
    const res = await gameBannersDomain.replaceImage('b1', file);
    expect(gameBannersRepository.setImageUrl).toHaveBeenCalledWith('b1', 'http://x/banner-images/banners/b1/2-a.png');
    expect(supabaseStorage.deleteFile).toHaveBeenCalledWith('banner-images', 'banners/b1/old.png');
    expect(res?.imageUrl).toContain('2-a.png');
  });

  it('replaceImage does not call deleteFile when there was no previous image', async () => {
    (gameBannersRepository.findById as jest.Mock).mockResolvedValue({ id: 'b1', imageUrl: null });
    (supabaseStorage.uploadFile as jest.Mock).mockResolvedValue('http://x/banner-images/banners/b1/2-a.png');
    await gameBannersDomain.replaceImage('b1', file);
    expect(supabaseStorage.deleteFile).not.toHaveBeenCalled();
  });

  it('createWithImage does not delete any object when the upload itself fails', async () => {
    (gameBannersRepository.create as jest.Mock).mockResolvedValue({
      id: 'b1', gameId: null, sortOrder: 1, isActive: true, imageUrl: null
    });
    (supabaseStorage.uploadFile as jest.Mock).mockRejectedValue(new Error('boom'));
    await expect(gameBannersDomain.createWithImage(file)).rejects.toThrow('boom');
    expect(gameBannersRepository.delete).toHaveBeenCalledWith('b1');
    expect(supabaseStorage.deleteFile).not.toHaveBeenCalled();
  });
});
