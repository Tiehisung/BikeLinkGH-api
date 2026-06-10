import { Router } from 'express';
import {
    getBrands,
    getPopularBrands,
    getBrandsByTier,
    createBrand,
    deleteBrand,
    toggleBrandActive,
    updateBrand,
    getAllBrands,
} from '../controllers/brand.ctrl';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', getBrands);
router.get('/popular', getPopularBrands);
router.get('/tier/:tier', getBrandsByTier);

router.use(authenticate);
router.use(authorize('admin'));

router.get('/all', getAllBrands);
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.patch('/:id/toggle-active', toggleBrandActive);
router.delete('/:id', deleteBrand);

export default router;