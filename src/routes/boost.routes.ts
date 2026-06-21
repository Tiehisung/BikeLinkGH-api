import { Router } from 'express';
import { initiateBoost, checkBoostStatus } from '../controllers/boost.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/initiate', authenticate, initiateBoost);
router.get('/status/:listingId', authenticate, checkBoostStatus);

export default router;