import { GameType, UpdateGameTypeDto } from 'helper';
import { gameTypesRepository } from './game-types.repository';

export class GameTypesDomain {
  async getAll(): Promise<GameType[]> {
    return gameTypesRepository.findAll();
  }

  async update(name: string, data: UpdateGameTypeDto): Promise<GameType | null> {
    return gameTypesRepository.update(name, data);
  }
}

export const gameTypesDomain = new GameTypesDomain();
