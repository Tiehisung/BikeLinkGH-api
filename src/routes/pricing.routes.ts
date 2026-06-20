import { Router } from "express";
import { getActivePricing, getPricingByCategory, getAllPricing, createPricing, updatePricing, togglePricingActive, deletePricing } from "../controllers/pricing.ctrl";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { EUserRole } from "../models/user.model";



const router = Router();

// Public
router.get('/active', getActivePricing);
router.get('/category/:category', getPricingByCategory);

// Admin
router.use(authenticate, authorize(EUserRole.ADMIN));
router.get('/', getAllPricing);
router.post('/', createPricing);
router.put('/:id', updatePricing);
router.patch('/:id/toggle', togglePricingActive);
router.delete('/:id', deletePricing);

export default router;