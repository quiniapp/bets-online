import { Router } from 'express';
import { featuredGamesController } from './featured-games.controller';

const router = Router();

router.get('/', (req, res, next) => featuredGamesController.getActive(req, res, next));

export default router;
