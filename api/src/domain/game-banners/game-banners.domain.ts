import { GameBanner, GameBannerWithGame, CreateGameBannerDto, UpdateGameBannerDto } from 'helper';
import { gameBannersRepository } from '../../persistence/repositories/game-banners.repository';

export class GameBannersDomain {
  async getActive(): Promise<GameBannerWithGame[]> {
    return gameBannersRepository.findAllActive();
  }

  async getAll(): Promise<GameBanner[]> {
    return gameBannersRepository.findAll();
  }

  async create(data: CreateGameBannerDto): Promise<GameBanner> {
    return gameBannersRepository.create(data);
  }

  async update(id: string, data: UpdateGameBannerDto): Promise<GameBanner | null> {
    return gameBannersRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return gameBannersRepository.delete(id);
  }
}

export const gameBannersDomain = new GameBannersDomain();
