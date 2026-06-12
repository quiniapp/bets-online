import { Router } from 'express';
import { lobbyController } from './lobby.controller';

const router = Router();

// Public — the players' home fetches everything it renders from here
router.get('/', lobbyController.getLobby.bind(lobbyController));

export default router;
