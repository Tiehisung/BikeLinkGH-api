
// INITIALIZE PAYMENT (Returns reference for Paystack Popup)

import { Response } from "express";
import ListingModel from "../models/listing.model";
import PaymentModel from "../models/payment.model";
import PricingModel from "../models/pricing.model";
import {paystackService} from "../services/paystack.service";
import { IAuthRequest } from "../types";
import { applyBoost } from "./boost.ctrl";

export const initializePopupPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId, paymentType = 'listing_fee', metadata = {} } = req.body;
        const user = req.user!;

        let amount = 0;
        let description = '';

        if (paymentType === 'listing_fee' && listingId) {
            const listing = await ListingModel.findById(listingId);
            if (!listing) {
                res.status(404).json({ success: false, message: 'Listing not found' });
                return;
            }
            if (listing.seller.toString() !== user._id.toString()) {
                res.status(403).json({ success: false, message: 'Not your listing' });
                return;
            }
            if (listing.paymentStatus === 'paid') {
                res.status(400).json({ success: false, message: 'Already paid' });
                return;
            }

            const pricingKey = listing.listingType === 'premium' ? 'premium' : 'standard';
            const pricing = await PricingModel.findOne({
                category: 'listing_fee',
                key: pricingKey,
                isActive: true,
            });

            amount = pricing?.amount || (listing.listingType === 'premium' ? 45 : 25);
            description = `Listing fee - ${listing.brand} ${listing.model || ''}`;
        } else if (paymentType === 'premium_upgrade' && listingId) {
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
            if (listing.isBoosted && listing.boostExpiresAt && new Date() < listing.boostExpiresAt) {
                res.status(400).json({ success: false, message: 'Already boosted' });
                return;
            }
            if (listing.paymentStatus !== 'paid') {
                res.status(400).json({ success: false, message: 'Pay listing fee first' });
                return;
            }

            const pricing = await PricingModel.findOne({
                category: 'featured_boost',
                key: boostKey,
                isActive: true,
            });

            amount = pricing?.amount || (boostKey === '30day' ? 35 : 15);
            description = `Boost - ${listing.brand} ${listing.model || ''}`;
        } else {
            res.status(400).json({ success: false, message: 'Invalid payment type' });
            return;
        }

        // Generate unique reference
        const reference = `MOTO-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Create payment record
        const payment = await PaymentModel.create({
            listing: listingId || undefined,
            payer: user._id,
            amount,
            fee: 0,
            momoNumber: user.phoneNumber,
            network: 'MTN',
            paymentType,
            status: 'pending',
            paystackReference: reference,
            metadata: { description, initiatedBy: user._id.toString(), ...metadata },
        });

        res.json({
            success: true,
            data: {
                reference,
                amount,
                email: user.email || `${user.phoneNumber}@motomartgh.com`,
                paymentId: payment._id,
            },
        });
    } catch (error) {
        console.error('Initialize payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to initialize payment' });
    }
};

// VERIFY PAYMENT (Called after Paystack Popup success)
export const verifyPopupPayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { reference } = req.params;

        // Verify with Paystack
        const result = await paystackService.verifyTransaction(reference);

        if (result.success && result.data?.status === 'success') {
            // Update payment record
            const payment = await PaymentModel.findOne({ paystackReference: reference });

            if (payment && payment.status !== 'paid') {
                payment.status = 'paid';
                payment.paystackTransactionId = result.data.transaction_id;
                payment.paystackChannel = result.data.channel;
                payment.completedAt = new Date();
                await payment.save();

                // Update listing if listing fee
                if (payment.listing && payment.paymentType === 'listing_fee') {
                    await ListingModel.findByIdAndUpdate(payment.listing, {
                        paymentStatus: 'paid',
                        paymentReference: reference,
                    });
                }

                // Apply boost if premium upgrade
                if (payment.paymentType === 'premium_upgrade' && payment.listing && payment.metadata?.boostKey) {
                    await applyBoost(
                        payment.listing.toString(),
                        payment.metadata.boostKey,
                        payment.metadata.durationDays || 7,
                        reference
                    );
                }
            }

            res.json({
                success: true,
                verified: true,
                data: { status: 'paid', amount: payment?.amount },
            });
        } else {
            res.json({
                success: true,
                verified: false,
                data: { status: result.data?.status || 'pending' },
            });
        }
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};