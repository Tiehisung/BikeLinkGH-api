import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { scriptCtrl } from '../controllers/scripts/script.ctrl';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/', scriptCtrl);



export default router;