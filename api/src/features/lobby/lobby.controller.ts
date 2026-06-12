import { Request, Response, NextFunction } from 'express';
import { ApiResponseBuilder, LobbyData, LobbySlotGames, Game, FeaturedGameWithGame, LOBBY_SECTION_LIMIT } from 'helper';
import { gamesDomain } from '../games/games.domain';
import { providersDomain } from '../providers/providers.domain';
import { featuredGamesDomain } from '../featured-games/featured-games.domain';
import { settingsDomain } from '../settings/settings.domain';
import { CACHE_PAGE } from '../../utils/games-cache';
import { setPublicCache } from '../../utils/http-cache';

// Public payload — rtp is owner-only and must never leave through here
const stripRtp = (game: Game): Game => ({ ...game, rtp: undefined });
const stripFeaturedRtp = (items: FeaturedGameWithGame[]): FeaturedGameWithGame[] =>
  items.map(f => ({ ...f, game: { ...f.game, rtp: undefined } }));

export class LobbyController {
  /**
   * @swagger
   * /api/lobby:
   *   get:
   *     summary: Aggregated public lobby payload (settings, types, providers, featured, slot sections)
   *     tags: [Lobby]
   *     responses:
   *       200:
   *         description: Everything the home needs in one response
   */
  async getLobby(req: Request, res: Response, next: NextFunction) {
    try {
      const [settings, types, providers, featured] = await Promise.all([
        settingsDomain.getCasinoSettings(),
        gamesDomain.getDistinctGameTypes(),
        providersDomain.getAll(),
        featuredGamesDomain.getActive()
      ]);

      const slots: LobbySlotGames[] = await Promise.all(
        settings.lobbySlots.map(async slot => {
          const gameType = slot.kind === 'provider' ? undefined : (slot.categoryType || undefined);
          const providerName = slot.kind === 'category' ? undefined : (slot.providerName || undefined);
          if (!gameType && !providerName) return { id: slot.id, games: [], total: 0 };
          const { games, total } = await gamesDomain.getPaginatedGames(
            CACHE_PAGE,
            LOBBY_SECTION_LIMIT,
            true,
            providerName,
            undefined,
            gameType
          );
          return { id: slot.id, games: games.map(stripRtp), total };
        })
      );

      const data: LobbyData = {
        settings,
        types,
        providers,
        featured: stripFeaturedRtp(featured),
        slots
      };

      setPublicCache(req, res, 60);
      return res.json(ApiResponseBuilder.success(data));
    } catch (error) {
      return next(error);
    }
  }
}

export const lobbyController = new LobbyController();
