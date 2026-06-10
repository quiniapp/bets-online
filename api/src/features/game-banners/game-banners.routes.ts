import { Router } from 'express';
import { gameBannersController } from './game-banners.controller';

const router = Router();

router.get('/', (req, res, next) => gameBannersController.getActive(req, res, next));

export default router;
