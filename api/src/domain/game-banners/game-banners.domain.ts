import { GameBanner, UpdateGameBannerDto } from 'helper';
import { gameBannersRepository } from '../../persistence/repositories/game-banners.repository';
import { supabaseStorage } from '../../services/supabase-storage.service';

const BUCKET = 'banner-images';

export interface BannerImageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export class GameBannersDomain {
  async getActive(): Promise<GameBanner[]> {
    return gameBannersRepository.findAllActive();
  }

  async getAll(): Promise<GameBanner[]> {
    return gameBannersRepository.findAll();
  }

  async createWithImage(file: BannerImageFile, sortOrder?: number): Promise<GameBanner> {
    const banner = await gameBannersRepository.create({ sortOrder });
    try {
      const filePath = `banners/${banner.id}/${Date.now()}-${file.originalname}`;
      const imageUrl = await supabaseStorage.uploadFile(
        BUCKET,
        filePath,
        file.buffer,
        file.mimetype
      );
      await gameBannersRepository.setImageUrl(banner.id, imageUrl);
      return { ...banner, imageUrl };
    } catch (err) {
      // roll back the orphan row so we never leave an image-less banner
      await gameBannersRepository.delete(banner.id);
      throw err;
    }
  }

  async replaceImage(id: string, file: BannerImageFile): Promise<GameBanner | null> {
    const banner = await gameBannersRepository.findById(id);
    if (!banner) return null;
    const filePath = `banners/${id}/${Date.now()}-${file.originalname}`;
    const imageUrl = await supabaseStorage.uploadFile(BUCKET, filePath, file.buffer, file.mimetype);
    await gameBannersRepository.setImageUrl(id, imageUrl);
    return { ...banner, imageUrl };
  }

  async update(id: string, data: UpdateGameBannerDto): Promise<GameBanner | null> {
    return gameBannersRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await gameBannersRepository.delete(id);
    if (!deleted) return false;
    if (deleted.imageUrl) {
      const path = supabaseStorage.pathFromPublicUrl(BUCKET, deleted.imageUrl);
      if (path) {
        try {
          await supabaseStorage.deleteFile(BUCKET, path);
        } catch (err) {
          // row is already gone; a storage cleanup failure must not fail the delete
          console.error(`Failed to delete banner image from storage: ${path}`, err);
        }
      }
    }
    return true;
  }
}

export const gameBannersDomain = new GameBannersDomain();
