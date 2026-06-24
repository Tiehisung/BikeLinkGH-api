import { Router } from 'express';
import { getListingOG, getHomeOG } from '../controllers/og.ctrl';

const router = Router();

// Listing OG tags (for bots)
router.get('/listing/:id', getListingOG);

// Home page OG tags
router.get('/home', getHomeOG);

export default router;