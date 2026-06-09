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
    const filePath = `banners/${banner.id}/${Date.now()}-${file.originalname}`;
    let uploaded = false;
    try {
      const imageUrl = await supabaseStorage.uploadFile(BUCKET, filePath, file.buffer, file.mimetype);
      uploaded = true;
      await gameBannersRepository.setImageUrl(banner.id, imageUrl);
      return { ...banner, imageUrl };
    } catch (err) {
      // roll back the orphan row so we never leave an image-less banner
      await gameBannersRepository.delete(banner.id);
      if (uploaded) {
        try {
          await supabaseStorage.deleteFile(BUCKET, filePath);
        } catch {
          // object may not exist; rollback cleanup is best-effort
        }
      }
      throw err;
    }
  }

  async replaceImage(id: string, file: BannerImageFile): Promise<GameBanner | null> {
    const banner = await gameBannersRepository.findById(id);
    if (!banner) return null;
    const filePath = `banners/${id}/${Date.now()}-${file.originalname}`;
    const imageUrl = await supabaseStorage.uploadFile(BUCKET, filePath, file.buffer, file.mimetype);
    await gameBannersRepository.setImageUrl(id, imageUrl);
    await this.deleteStoredImage(banner.imageUrl);
    return { ...banner, imageUrl };
  }

  async update(id: string, data: UpdateGameBannerDto): Promise<GameBanner | null> {
    return gameBannersRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await gameBannersRepository.delete(id);
    if (!deleted) return false;
    await this.deleteStoredImage(deleted.imageUrl);
    return true;
  }

  private async deleteStoredImage(imageUrl: string | null | undefined): Promise<void> {
    if (!imageUrl) return;
    const path = supabaseStorage.pathFromPublicUrl(BUCKET, imageUrl);
    if (!path) return;
    try {
      await supabaseStorage.deleteFile(BUCKET, path);
    } catch (err) {
      // best-effort cleanup; a storage failure must not fail the operation
      console.error(`Failed to delete banner image from storage: ${path}`, err);
    }
  }
}

export const gameBannersDomain = new GameBannersDomain();
