import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { getSmsBalance, sendTestSms } from '../controllers/sms.ctrl';
import { getSmsLogs, smsDeliveryCallback } from '../controllers/sms-callback.ctrl';


const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/balance', getSmsBalance);
router.post('/test', sendTestSms);
// Africa's Talking delivery reports (no auth — they call this URL)
router.post('/delivery-report', smsDeliveryCallback);

router.get('/logs', getSmsLogs);

export default router;