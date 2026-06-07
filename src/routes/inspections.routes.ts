import { Router } from 'express';
import {
    requestInspection,
    getInspectionStatus,
    getMyInspections,
} from '../controllers/inspection.ctrl';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/request', requestInspection);
router.get('/mine', getMyInspections);
router.get('/:id', getInspectionStatus);

export default router;