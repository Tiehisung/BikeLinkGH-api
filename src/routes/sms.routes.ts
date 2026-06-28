import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSmsBalance, sendTestSms } from '../controllers/sms.ctrl';


const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/balance', getSmsBalance);
router.post('/test', sendTestSms);

export default router;