import { Request, Response } from 'express';
import PaystackService, { paystackService } from '../services/paystack.service';
import PaymentModel, { EMobileNetwork, EPaymentChannel, EPaymentStatus, EPaymentType } from '../models/payment.model';
import ListingModel from '../models/listing.model';
import { IAuthRequest } from '../types';
import { applyBoost } from './boost.ctrl';
import PricingModel from '../models/pricing.model';
import { ENV } from '../config/env.config';

export const initiateMobileMoneyPayment = async (
    req: IAuthRequest,
    res: Response
): Promise<void> => {
    try {
        const {
            listingId,
            momoNumber,
            network,
            paymentType = EPaymentType.LISTING_FEE,
            metadata = {}  // Accept additional metadata (boostKey, durationDays, etc.)
        } = req.body;
        const user = req.user!;

        let amount = 0;
        let description = '';
        let productKey = '';
        let referencePrefix = 'LISTING';


        // LISTING FEE

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
                res.status(400).json({ success: false, message: 'Listing fee already paid' });
                return;
            }

            // Get price from DB
            const pricingKey = listing.listingType === 'premium' ? 'premium' : 'standard';
            const pricing = await PricingModel.findOne({
                category: 'listing_fee',
                key: pricingKey,
                isActive: true,
            });

            amount = pricing?.amount || (listing.listingType === 'premium' ? 45 : 25);
            productKey = `listing_${pricingKey}`;
            description = `Listing fee - ${listing.brand} ${listing.model || ''}`;
            referencePrefix = 'LISTING';
        }


        // BOOST (Premium Upgrade)

        else if (paymentType === EPaymentType.PREMIUM_UPGRADE && listingId) {
            const boostKey = metadata.boostKey;
            if (!boostKey) {
                res.status(400).json({ success: false, message: 'Boost type is required' });
                return;
            }

            const listing = await ListingModel.findById(listingId);
            if (!listing) {
                res.status(404).json({ success: false, message: 'Listing not found' });
                return;
            }
            if (listing.seller.toString() !== user._id.toString()) {
                res.status(403).json({ success: false, message: 'Not your listing' });
                return;
            }

            // ✅ DIFFERENT CHECK: Check if already boosted (not if paid)
            if (listing.isBoosted && listing.boostExpiresAt && new Date() < listing.boostExpiresAt) {
                const remainingDays = Math.ceil(
                    (listing.boostExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                res.status(400).json({
                    success: false,
                    message: `Already boosted. Expires in ${remainingDays} days.`,
                });
                return;
            }

            // ✅ Listing must be paid first before boosting
            if (listing.paymentStatus !== EPaymentStatus.PAID) {
                res.status(400).json({
                    success: false,
                    message: 'Pay the listing fee first before boosting.',
                });
                return;
            }

            // Get boost price from DB
            const pricing = await PricingModel.findOne({
                category: 'featured_boost',
                key: boostKey,
                isActive: true,
            });

            if (!pricing) {
                res.status(400).json({ success: false, message: 'Invalid boost option' });
                return;
            }

            amount = pricing.amount;
            productKey = `boost_${boostKey}`;
            description = `Boost - ${listing.brand} ${listing.model || ''} (${boostKey})`;
            referencePrefix = 'BOOST';

            // ✅ Attach boost metadata to pass to webhook
            metadata.durationDays = pricing.metadata?.durationDays || 7;
        }


        // VERIFICATION FEE

        else if (paymentType === EPaymentType.VERIFICATION_FEE) {
            const pricing = await PricingModel.findOne({
                category: 'verification',
                key: 'physical',
                isActive: true,
            });

            amount = pricing?.amount || 60;
            productKey = 'verification_physical';
            description = 'Physical bike verification';
            referencePrefix = 'VERIFY';
        }


        // INVALID

        else {
            res.status(400).json({ success: false, message: 'Invalid payment type' });
            return;
        }


        // CREATE PAYMENT & CHARGE

        const reference = PaystackService.generateReference(referencePrefix as any);
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
            metadata: {
                description,
                initiatedBy: user._id.toString(),
                productKey,
                ...metadata, // ✅ Pass boostKey, durationDays, etc.
            },
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
                paymentType,
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

        const pricingKey = listing.listingType === 'premium' ? 'premium' : 'standard';
        const pricing = await PricingModel.findOne({
            category: 'listing_fee',
            key: pricingKey,
            isActive: true,
        });
        const amount = pricing?.amount || (listing.listingFee) || 20;

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
            callback_url: `${ENV.FRONTEND_URL}/dashboard/listings?payment=success&ref=${reference}`,
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

        if (!isValid && ENV.NODE_ENV === 'production') {
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

// Helper: Update payment to paid status
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

    //  HANDLE BOOST PAYMENT

    if (payment.paymentType === 'premium_upgrade' && payment.listing && payment.metadata?.boostKey) {
        const durationDays = payment.metadata.durationDays || 7;
        await applyBoost(
            payment.listing.toString(),
            payment.metadata.boostKey,
            durationDays,
            payment.paystackReference
        );
    }
};

// VERIFY PAYMENT (Fixed)
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