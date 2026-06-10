import { Router } from 'express';
import { providersController } from './providers.controller';

const router = Router();

router.get('/', providersController.getAll.bind(providersController));

export default router;
