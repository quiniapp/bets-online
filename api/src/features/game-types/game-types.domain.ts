import { GameType, UpdateGameTypeDto } from 'helper';
import { gameTypesRepository } from './game-types.repository';
import { gamesDomain } from '../games/games.domain';

export class GameTypesDomain {
  async getAll(): Promise<GameType[]> {
    return gameTypesRepository.findAll();
  }

  async update(name: string, data: UpdateGameTypeDto): Promise<GameType | null> {
    const updated = await gameTypesRepository.update(name, data);
    if (updated) {
      // Global type sort is an ORDER BY input of the games list (fallback for
      // providers without a type rule) → re-warm the page-1 cache.
      gamesDomain.refreshGamesCache();
    }
    return updated;
  }
}

export const gameTypesDomain = new GameTypesDomain();
