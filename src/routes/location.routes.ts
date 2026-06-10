import { Router } from 'express';
import { getLocations, getPopularLocations, getLocationsByRegion, getAllLocations, createLocation, updateLocation, toggleLocationActive, deleteLocation } from '../controllers/location.ctrl';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getLocations);
router.get('/popular', getPopularLocations);
router.get('/region/:region', getLocationsByRegion);

router.use(authenticate, authorize('admin'));

router.get('/all', getAllLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.patch('/:id/toggle-active', toggleLocationActive);
router.delete('/:id', deleteLocation);

export default router;