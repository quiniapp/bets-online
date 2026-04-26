import { FeaturedGame, FeaturedGameWithGame, CreateFeaturedGameDto, UpdateFeaturedGameDto } from 'helper';
import { featuredGamesRepository } from '../../persistence/repositories/featured-games.repository';

export class FeaturedGamesDomain {
  async getActive(): Promise<FeaturedGameWithGame[]> {
    return featuredGamesRepository.findAllActive();
  }

  async getAll(): Promise<FeaturedGame[]> {
    return featuredGamesRepository.findAll();
  }

  async create(data: CreateFeaturedGameDto): Promise<FeaturedGame> {
    return featuredGamesRepository.create(data);
  }

  async update(id: string, data: UpdateFeaturedGameDto): Promise<FeaturedGame | null> {
    return featuredGamesRepository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return featuredGamesRepository.delete(id);
  }
}

export const featuredGamesDomain = new FeaturedGamesDomain();
