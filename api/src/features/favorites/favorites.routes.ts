import { Router } from 'express';
import { authMiddleware, requireRole } from '../../middleware/auth.middleware';
import { userFavoriteGamesController } from './userFavoriteGames.controller';
import { UserRole } from 'helper';

const router = Router();

router.use(authMiddleware);
router.use(requireRole(UserRole.PLAYER));

router.get('/my-ids', userFavoriteGamesController.getMyFavoriteIds.bind(userFavoriteGamesController));
router.get('/my-games', userFavoriteGamesController.getMyFavorites.bind(userFavoriteGamesController));
router.post('/:gameId', userFavoriteGamesController.addFavorite.bind(userFavoriteGamesController));
router.delete('/:gameId', userFavoriteGamesController.removeFavorite.bind(userFavoriteGamesController));

export default router;
