import { Response } from 'express';
import PaymentModel from '../models/payment.model';
import ListingModel from '../models/listing.model';
import { IAuthRequest, IApiResponse } from '../types';

// ============================================
// INITIATE LISTING FEE PAYMENT
// @route   POST /api/payments/listing-fee
// ============================================
export const payListingFee = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId, momoNumber, network } = req.body;

        // Find listing
        const listing = await ListingModel.findById(listingId);

        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' } as IApiResponse);
            return;
        }

        // Check ownership
        if (listing.seller.toString() !== req.user!._id.toString()) {
            res.status(403).json({ success: false, message: 'Not your listing' } as IApiResponse);
            return;
        }

        // Check if already paid
        if (listing.paymentStatus === 'paid') {
            res.status(400).json({ success: false, message: 'Listing fee already paid' } as IApiResponse);
            return;
        }

        const amount = listing.listingFee || (listing.listingType === 'premium' ? 40 : 25);

        // Create payment record
        const payment = await PaymentModel.create({
            listing: listing._id,
            payer: req.user!._id,
            amount,
            fee: 0,
            momoNumber,
            network: network || 'MTN',
            paymentType: 'listing_fee',
            status: 'pending',
        });

        // In production: Call Hubtel API here
        // For now, we'll simulate with a reference code
        const mockReference = `MOTO-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        res.json({
            success: true,
            message: 'Payment initiated. Check your phone for MoMo prompt.',
            data: {
                paymentId: payment._id,
                amount,
                momoNumber,
                network: network || 'MTN',
                reference: mockReference,
                // In production, this would be the Hubtel checkout URL or session ID
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ success: false, message: 'Error initiating payment' } as IApiResponse);
    }
};

// ============================================
// CONFIRM PAYMENT (Webhook or Manual)
// @route   POST /api/payments/confirm
// ============================================
export const confirmPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { paymentId, reference, status } = req.body;

        const payment = await PaymentModel.findById(paymentId);

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' } as IApiResponse);
            return;
        }

        // Update payment status
        payment.status = status || 'success';
        payment.momoReference = reference;
        payment.completedAt = new Date();
        await payment.save();

        // If listing fee, update the listing
        if (payment.paymentType === 'listing_fee' && payment.listing) {
            await ListingModel.findByIdAndUpdate(payment.listing, {
                paymentStatus: 'paid',
                paymentReference: reference,
                // Note: Listing still needs admin approval
            });
        }

        res.json({
            success: true,
            message: 'Payment confirmed',
            data: payment,
        } as IApiResponse);
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ success: false, message: 'Error confirming payment' } as IApiResponse);
    }
};

// ============================================
// GET PAYMENT STATUS
// @route   GET /api/payments/:id/status
// ============================================
export const getPaymentStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const payment = await PaymentModel.findById(req.params.id);

        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' } as IApiResponse);
            return;
        }

        // Check if user is the payer
        if (payment.payer.toString() !== req.user!._id.toString() && req.user?.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Not authorized' } as IApiResponse);
            return;
        }

        res.json({
            success: true,
            data: {
                paymentId: payment._id,
                amount: payment.amount,
                status: payment.status,
                paymentType: payment.paymentType,
                completedAt: payment.completedAt,
            },
        } as IApiResponse);
    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment status' } as IApiResponse);
    }
};

// ============================================
// GET MY PAYMENT HISTORY
// @route   GET /api/payments/history
// ============================================
export const getPaymentHistory = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const payments = await PaymentModel.find({ payer: req.user!._id })
            .sort('-createdAt')
            .populate('listing', 'brand model price')
            .limit(50);

        res.json({
            success: true,
            count: payments.length,
            data: payments,
        } as IApiResponse);
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ success: false, message: 'Error fetching payment history' } as IApiResponse);
    }
};