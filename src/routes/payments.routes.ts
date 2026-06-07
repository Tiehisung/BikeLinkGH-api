import { Router } from 'express';
import {
    payListingFee,
    confirmPayment,
    getPaymentStatus,
    getPaymentHistory,
} from '../controllers/payment.ctrl';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/listing-fee', payListingFee);
router.post('/confirm', confirmPayment);
router.get('/history', getPaymentHistory);
router.get('/:id/status', getPaymentStatus);

export default router;