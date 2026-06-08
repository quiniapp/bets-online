import { FeaturedGame, FeaturedGameWithGame, CreateFeaturedGameDto, UpdateFeaturedGameDto } from 'helper';
import { featuredGamesRepository } from '../../persistence/repositories/featured-games.repository';
import { featuredGamesMemCache } from '../../utils/games-cache';

export class FeaturedGamesDomain {
  async getActive(): Promise<FeaturedGameWithGame[]> {
    return featuredGamesMemCache.getOrFetch(() => featuredGamesRepository.findAllActive());
  }

  async getAll(): Promise<FeaturedGameWithGame[]> {
    return featuredGamesRepository.findAllWithGame();
  }

  async create(data: CreateFeaturedGameDto): Promise<FeaturedGame> {
    const result = await featuredGamesRepository.create(data);
    featuredGamesMemCache.invalidate();
    return result;
  }

  async update(id: string, data: UpdateFeaturedGameDto): Promise<FeaturedGame | null> {
    const result = await featuredGamesRepository.update(id, data);
    featuredGamesMemCache.invalidate();
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await featuredGamesRepository.delete(id);
    featuredGamesMemCache.invalidate();
    return result;
  }
}

export const featuredGamesDomain = new FeaturedGamesDomain();
