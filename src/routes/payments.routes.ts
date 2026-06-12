import { Router } from 'express';
import {
    initiateMobileMoneyPayment,
    initiateCheckout,
    paystackWebhook,
    verifyPayment,
    getPaymentHistory,
    getPaymentById,
} from '../controllers/payment.paystack.ctrl';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public webhook (no auth)
router.post('/webhook', paystackWebhook);

// Protected routes
router.post('/pay', authenticate, initiateMobileMoneyPayment);
router.post('/checkout', authenticate, initiateCheckout);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
router.get('/:id', authenticate, getPaymentById);

export default router;