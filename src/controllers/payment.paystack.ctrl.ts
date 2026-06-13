import { Request, Response } from 'express';
import PaystackService, { paystackService } from '../services/paystack.service';
import PaymentModel, { EMobileNetwork, EPaymentChannel, EPaymentStatus, EPaymentType } from '../models/payment.model';
import ListingModel from '../models/listing.model';
import { IAuthRequest } from '../types';

const PAYMENT_FEES = {
    listing_standard: 25,
    listing_premium: 40,
    verification: 10,
};

export const initiateMobileMoneyPayment = async (
    req: IAuthRequest,
    res: Response
): Promise<void> => {
    try {
        const { listingId, momoNumber, network, paymentType = EPaymentType.LISTING_FEE } = req.body;
        const user = req.user!;

        let amount = 0;
        let description = '';

        if (paymentType === EPaymentType.LISTING_FEE && listingId) {
            const listing = await ListingModel.findById(listingId);
            if (!listing) {
                res.status(404).json({ success: false, message: 'Listing not found' });
                return;
            }
            if (listing.seller.toString() !== user._id.toString()) {
                res.status(403).json({ success: false, message: 'Not your listing' });
                return;
            }
            if (listing.paymentStatus === EPaymentStatus.PAID) {
                res.status(400).json({ success: false, message: 'Already paid' });
                return;
            }
            amount = listing.listingType === 'premium'
                ? PAYMENT_FEES.listing_premium
                : PAYMENT_FEES.listing_standard;
            description = `Listing fee - ${listing.brand} ${listing.model || ''}`;
        } else if (paymentType === EPaymentType.VERIFICATION_FEE) {
            amount = PAYMENT_FEES.verification;
            description = 'Identity verification fee';
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment type' });
            return;
        }

        const reference = PaystackService.generateReference('LISTING');
        const formattedPhone = PaystackService.formatPhone(momoNumber || user.phoneNumber);
        const provider = PaystackService.mapNetwork(network || 'MTN');

        const payment = await PaymentModel.create({
            listing: listingId || undefined,
            payer: user._id,
            amount,
            fee: 0,
            momoNumber: formattedPhone,
            network: network || EMobileNetwork.MTN,
            paymentType,
            status: EPaymentStatus.PENDING,
            paystackReference: reference,
            metadata: { description, initiatedBy: user._id.toString() },
        });

        const result = await paystackService.chargeMobileMoney({
            email: `${user.phoneNumber}@motomartgh.com`,
            amount,
            reference,
            currency: 'GHS',
            mobile_money: { phone: formattedPhone, provider },
        });

        if (!result.success) {
            payment.status = EPaymentStatus.FAILED;
            payment.paystackGatewayResponse = result.message;
            await payment.save();

            res.status(400).json({
                success: false,
                message: result.message || 'Payment failed. Please try again.',
            });
            return;
        }

        payment.status = EPaymentStatus.PROCESSING;
        if (result.data?.transaction_id) {
            payment.paystackTransactionId = result.data.transaction_id;
        }
        await payment.save();

        res.json({
            success: true,
            message: 'Check your phone for the MoMo prompt and enter your PIN.',
            data: {
                paymentId: payment._id,
                reference,
                amount,
                status: payment.status,
            },
        });
    } catch (error) {
        console.error('Mobile money payment error:', error);
        res.status(500).json({ success: false, message: 'An error occurred.' });
    }
};

export const initiateCheckout = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId } = req.body;
        const user = req.user!;

        const listing = await ListingModel.findById(listingId);
        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        const amount = listing.listingType === 'premium'
            ? PAYMENT_FEES.listing_premium
            : PAYMENT_FEES.listing_standard;

        const reference = PaystackService.generateReference('LISTING');

        const payment = await PaymentModel.create({
            listing: listing._id,
            payer: user._id,
            amount,
            fee: 0,
            momoNumber: user.phoneNumber,
            network: EMobileNetwork.MTN,
            paymentType: EPaymentType.LISTING_FEE,
            status: EPaymentStatus.PENDING,
            paystackReference: reference,
        });

        const result = await paystackService.initializeTransaction({
            email: `${user.phoneNumber}@motomartgh.com`,
            amount,
            reference,
            callback_url: `${process.env.FRONTEND_URL}/dashboard/listings?payment=success&ref=${reference}`,
            channels: ['mobile_money', 'card'],
            metadata: {
                paymentId: payment._id.toString(),
                listingId: listing._id.toString(),
                userId: user._id.toString(),
            },
        });

        if (!result.success) {
            res.status(400).json({ success: false, message: result.message });
            return;
        }

        res.json({
            success: true,
            message: 'Redirecting to payment page...',
            data: {
                paymentId: payment._id,
                authorizationUrl: result.data?.authorization_url,
                reference,
                amount,
            },
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, message: 'Failed to initialize checkout' });
    }
};

export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const signature = req.headers['x-paystack-signature'] as string;
        const isValid = paystackService.validateWebhook(req.body, signature);

        if (!isValid && process.env.NODE_ENV === 'production') {
            res.status(401).json({ success: false, message: 'Invalid signature' });
            return;
        }

        const event = req.body;
        console.log('📩 Paystack webhook:', event.event);

        if (event.event === 'charge.success') {
            await handleChargeSuccess(event.data);
        }
        if (event.event === 'transfer.success') {
            console.log('Transfer success:', event.data.reference);
        }
        if (event.event === 'transfer.failed') {
            console.log('Transfer failed:', event.data.reference);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.sendStatus(200);
    }
};

// ============================================
// Helper: Update payment to paid status
// ============================================
const markPaymentAsPaid = async (
    payment: any,
    data: { transaction_id?: number; channel?: string; gateway_response?: string; paid_at?: string }
): Promise<void> => {
    payment.status = EPaymentStatus.PAID;
    payment.paystackTransactionId = data.transaction_id;
    payment.paystackChannel = data.channel;
    payment.paystackGatewayResponse = data.gateway_response || 'Payment successful';
    payment.completedAt = data.paid_at ? new Date(data.paid_at) : new Date();
    await payment.save();

    if (payment.listing && payment.paymentType === EPaymentType.LISTING_FEE) {
        await ListingModel.findByIdAndUpdate(payment.listing, {
            paymentStatus: EPaymentStatus.PAID,
            paymentReference: payment.paystackReference,
        });
    }
};

// ============================================
// VERIFY PAYMENT (Fixed)
// ============================================
export const verifyPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;

        const payment = await PaymentModel.findOne({ paystackReference: reference });

        // Already paid locally
        if (payment?.status === EPaymentStatus.PAID) {
            res.json({
                success: true,
                data: {
                    verified: true,
                    status: EPaymentStatus.PAID,
                    amount: payment.amount,
                    paymentId: payment._id,
                },
            });
            return;
        }

        // Check Paystack
        const result = await paystackService.verifyTransaction(reference);

        // Paystack confirms success — update local record
        if (result.success && result.data?.status === 'success' && payment) {
            await markPaymentAsPaid(payment, {
                transaction_id: result.data.transaction_id,
                channel: result.data.channel,
                gateway_response: result.data.gateway_response,
                paid_at: result.data.paid_at,
            });

            res.json({
                success: true,
                data: {
                    verified: true,
                    status: EPaymentStatus.PAID,
                    amount: payment.amount,
                    paymentId: payment._id,
                },
            });
            return;
        }

        // Still pending or failed
        res.json({
            success: true,
            data: {
                verified: false,
                status: result.data?.status || 'pending',
                amount: result.data?.amount,
            },
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed',
        });
    }
};

async function handleChargeSuccess(data: any): Promise<void> {
    try {
        const { reference, paid_at, channel, id: transactionId, gateway_response } = data;

        // Only update if payment is NOT already paid
        const payment = await PaymentModel.findOne({
            paystackReference: reference,
            status: { $ne: EPaymentStatus.PAID }, // Not already paid
        });

        if (!payment) {
            console.log('Payment not found or already processed:', reference);
            return;
        }

        await markPaymentAsPaid(payment, {
            transaction_id: transactionId,
            channel,
            gateway_response,
            paid_at,
        });

        console.log(`✅ Payment ${payment._id} confirmed via webhook`);
    } catch (error) {
        console.error('handleChargeSuccess error:', error);
    }
}


 
export const getPaymentHistory = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const payments = await PaymentModel.find({ payer: req.user!._id })
            .sort('-createdAt')
            .populate('listing', 'brand model price')
            .limit(50)
            .lean();

        res.json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
};

export const getPaymentById = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const payment = await PaymentModel.findById(req.params.id)
            .populate('listing', 'brand model price images');

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        if (
            payment.payer.toString() !== req.user!._id.toString() &&
            req.user?.role !== 'admin'
        ) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }

        res.json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch payment' });
    }
};