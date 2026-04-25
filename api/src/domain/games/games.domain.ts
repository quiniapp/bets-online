import {
  Game,
  CreateGameDto,
  UpdateGameDto,
  ErrorCode,
  UserRole,
} from 'helper';
import { gamesRepository } from '../../persistence/repositories/games.repository';
import { usersRepository } from '../../persistence/repositories/users.repository';
import { AppError } from '../../middleware/error.middleware';
import { gamesCache, CACHE_PAGE, CACHE_LIMIT } from '../../utils/games-cache';

export class GamesDomain {
  /**
   * Create a new game (OWNER/ADMIN only)
   */
  async createGame(
    requesterId: string,
    gameData: CreateGameDto
  ): Promise<Game> {
    // Verify requester has permission
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (![UserRole.OWNER, UserRole.ADMIN].includes(requester.role)) {
      throw new AppError(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Only OWNER or ADMIN can create games'
      );
    }

    // Check if game with same name already exists
    const existingGame = await gamesRepository.findByName(gameData.name);
    if (existingGame) {
      throw new AppError(
        409,
        ErrorCode.GAME_ALREADY_EXISTS,
        'Game with this name already exists'
      );
    }

    // Validate bet limits
    if (gameData.minBet <= 0) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Minimum bet must be greater than 0'
      );
    }

    if (gameData.maxBet <= gameData.minBet) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Maximum bet must be greater than minimum bet'
      );
    }

    // Validate house edge
    if (gameData.houseEdge !== undefined) {
      if (gameData.houseEdge < 0 || gameData.houseEdge > 100) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'House edge must be between 0 and 100'
        );
      }
    }

    // Create game
    const game = await gamesRepository.create(gameData);
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
    return game;
  }

  /**
   * Get paginated games. Page 1 / default limit is served from cache for both activeOnly variants.
   */
  async getPaginatedGames(
    page: number,
    limit: number,
    activeOnly: boolean = false,
    providerName?: string,
    search?: string,
    gameType?: string,
    status?: 'active' | 'inactive' | 'all'
  ): Promise<{ games: Game[]; total: number }> {
    const resolvedActiveOnly = status === 'active' ? true : activeOnly;
    if (!providerName && !search && !gameType && !status && page === CACHE_PAGE && limit === CACHE_LIMIT) {
      const cached = gamesCache.get(resolvedActiveOnly);
      if (cached) return cached;

      const result = await gamesRepository.findPaginated(page, limit, resolvedActiveOnly);
      gamesCache.set(result, resolvedActiveOnly);
      return result;
    }
    return gamesRepository.findPaginated(page, limit, resolvedActiveOnly, providerName, search, gameType, status);
  }

  async getDistinctProviders(): Promise<string[]> {
    return gamesRepository.findDistinctProviders();
  }

  async getStats(): Promise<{ total: number; active: number }> {
    return gamesRepository.getStats();
  }

  async getTopPlayed(limit = 5): Promise<Array<{ id: string; name: string; isActive: boolean; betCount: number }>> {
    return gamesRepository.getTopPlayed(limit);
  }

  async getDistinctGameTypes(): Promise<string[]> {
    return gamesRepository.findDistinctGameTypes();
  }

  /**
   * Get game by ID
   */
  async getGameById(gameId: string): Promise<Game> {
    const game = await gamesRepository.findById(gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }
    return game;
  }

  /**
   * Update game (OWNER/ADMIN only)
   */
  async updateGame(
    requesterId: string,
    gameId: string,
    updateData: UpdateGameDto
  ): Promise<Game> {
    // Verify requester has permission
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (![UserRole.OWNER, UserRole.ADMIN].includes(requester.role)) {
      throw new AppError(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Only OWNER or ADMIN can update games'
      );
    }

    // Verify game exists
    const game = await gamesRepository.findById(gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    // If updating name, check it doesn't conflict with another game
    if (updateData.name && updateData.name !== game.name) {
      const existingGame = await gamesRepository.findByName(updateData.name);
      if (existingGame) {
        throw new AppError(
          409,
          ErrorCode.GAME_ALREADY_EXISTS,
          'Game with this name already exists'
        );
      }
    }

    // Validate bet limits if provided
    if (updateData.minBet !== undefined && updateData.minBet <= 0) {
      throw new AppError(
        400,
        ErrorCode.VALIDATION_ERROR,
        'Minimum bet must be greater than 0'
      );
    }

    if (updateData.maxBet !== undefined && updateData.minBet !== undefined) {
      if (updateData.maxBet <= updateData.minBet) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'Maximum bet must be greater than minimum bet'
        );
      }
    } else if (updateData.maxBet !== undefined) {
      if (updateData.maxBet <= game.minBet) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'Maximum bet must be greater than minimum bet'
        );
      }
    } else if (updateData.minBet !== undefined) {
      if (game.maxBet <= updateData.minBet) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'Maximum bet must be greater than minimum bet'
        );
      }
    }

    // Validate house edge if provided
    if (updateData.houseEdge !== undefined) {
      if (updateData.houseEdge < 0 || updateData.houseEdge > 100) {
        throw new AppError(
          400,
          ErrorCode.VALIDATION_ERROR,
          'House edge must be between 0 and 100'
        );
      }
    }

    // Update game
    const updated = await gamesRepository.update(gameId, updateData);
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
    return updated;
  }

  private async requireAdminOrOwner(requesterId: string): Promise<void> {
    const requester = await usersRepository.findById(requesterId);
    if (!requester) throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    if (![UserRole.OWNER, UserRole.ADMIN].includes(requester.role)) {
      throw new AppError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, 'Only OWNER or ADMIN can bulk update games');
    }
  }

  /**
   * Bulk set status by explicit IDs (OWNER/ADMIN only)
   */
  async bulkSetStatus(requesterId: string, ids: string[], isActive: boolean): Promise<number> {
    await this.requireAdminOrOwner(requesterId);
    if (!ids.length) return 0;
    const affected = await gamesRepository.bulkSetStatus(ids, isActive);
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
    return affected;
  }

  /**
   * Bulk set status by filter (OWNER/ADMIN only) — applies to ALL matching games
   */
  async bulkSetStatusByFilter(
    requesterId: string,
    isActive: boolean,
    providerName?: string,
    gameType?: string,
    currentStatus?: 'active' | 'inactive' | 'all'
  ): Promise<number> {
    await this.requireAdminOrOwner(requesterId);
    const affected = await gamesRepository.bulkSetStatusByFilter(isActive, providerName, gameType, currentStatus);
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
    return affected;
  }

  /**
   * Toggle game active status (OWNER/ADMIN only)
   */
  async toggleGameStatus(requesterId: string, gameId: string): Promise<Game> {
    // Verify requester has permission
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (![UserRole.OWNER, UserRole.ADMIN].includes(requester.role)) {
      throw new AppError(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Only OWNER or ADMIN can toggle game status'
      );
    }

    // Verify game exists
    const game = await gamesRepository.findById(gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    // Toggle status
    const toggled = await gamesRepository.update(gameId, { isActive: !game.isActive });
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
    return toggled;
  }

  /**
   * Delete game (OWNER only)
   */
  async deleteGame(requesterId: string, gameId: string): Promise<void> {
    // Verify requester has permission
    const requester = await usersRepository.findById(requesterId);
    if (!requester) {
      throw new AppError(404, ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    if (requester.role !== UserRole.OWNER) {
      throw new AppError(
        403,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        'Only OWNER can delete games'
      );
    }

    // Verify game exists
    const game = await gamesRepository.findById(gameId);
    if (!game) {
      throw new AppError(404, ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    // Delete game
    await gamesRepository.delete(gameId);
    gamesCache.invalidateAndRefresh((activeOnly) => gamesRepository.findPaginated(CACHE_PAGE, CACHE_LIMIT, activeOnly));
  }
}

export const gamesDomain = new GamesDomain();
