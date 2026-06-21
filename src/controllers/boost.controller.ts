import { Response } from 'express';
import ListingModel from '../models/listing.model';
import PaymentModel, { EMobileNetwork, EPaymentStatus, EPaymentType } from '../models/payment.model';
import PricingModel from '../models/pricing.model';
import { IAuthRequest, IApiResponse } from '../types';
import PaystackService from '../services/paystack.service';

// ============================================
// INITIATE BOOST PAYMENT
// ============================================
export const initiateBoost = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId, boostKey } = req.body;
        const user = req.user!;

        // Find listing
        const listing = await ListingModel.findById(listingId);
        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        // Check ownership
        if (listing.seller.toString() !== user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not your listing' });
            return;
        }

        // Check if already boosted
        if (listing.isBoosted && listing.boostExpiresAt && new Date() < listing.boostExpiresAt) {
            const remaining = Math.ceil((listing.boostExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            res.status(400).json({
                success: false,
                message: `Already boosted. Expires in ${remaining} days.`,
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

        const amount = pricing.amount;
        const durationDays = pricing.metadata?.durationDays || 7;
        const reference = PaystackService.generateReference('BOOST');

        // Create payment record
        const payment = await PaymentModel.create({
            listing: listing._id,
            payer: user._id,
            amount,
            fee: 0,
            momoNumber: user.phoneNumber || 'N/A',
            network: EMobileNetwork.MTN,
            paymentType: EPaymentType.PREMIUM_UPGRADE, // Reuse this type or create 'boost'
            status: EPaymentStatus.PENDING,
            paystackReference: reference,
            metadata: {
                boostKey,
                listingId: listing._id.toString(),
                durationDays,
            },
        });

        // Return payment info
        res.json({
            success: true,
            data: {
                paymentId: payment._id,
                reference,
                amount,
                boostKey,
                durationDays,
                listingTitle: `${listing.brand} ${listing.model || ''}`.trim(),
            },
        });
    } catch (error) {
        console.error('Initiate boost error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate boost' });
    }
};

// ============================================
// APPLY BOOST (Called after payment confirmed)
// ============================================
export const applyBoost = async (listingId: string, boostKey: string, durationDays: number, reference: string): Promise<void> => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await ListingModel.findByIdAndUpdate(listingId, {
        isBoosted: true,
        boostType: boostKey,
        boostExpiresAt: expiresAt,
        boostPurchasedAt: new Date(),
        boostPaymentReference: reference,
    });

    console.log(`✅ Boost applied to listing ${listingId} — expires ${expiresAt.toISOString()}`);
};

// ============================================
// CHECK BOOST STATUS
// ============================================
export const checkBoostStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId } = req.params;
        const user = req.user!;

        const listing = await ListingModel.findById(listingId);
        if (!listing) {
            res.status(404).json({ success: false, message: 'Listing not found' });
            return;
        }

        if (listing.seller.toString() !== user._id.toString()) {
            res.status(403).json({ success: false, message: 'Not your listing' });
            return;
        }

        const isBoosted = listing.isBoosted && listing.boostExpiresAt && new Date() < listing.boostExpiresAt;
        const remainingDays = isBoosted
            ? Math.ceil((listing.boostExpiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;

        res.json({
            success: true,
            data: {
                isBoosted,
                boostType: listing.boostType,
                remainingDays,
                expiresAt: listing.boostExpiresAt,
                purchasedAt: listing.boostPurchasedAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to check boost status' });
    }
};

// ============================================
// GET BOOSTED LISTINGS (For search sorting)
// ============================================
export const getBoostedListingsCount = async (): Promise<number> => {
    return ListingModel.countDocuments({
        isBoosted: true,
        boostExpiresAt: { $gt: new Date() },
    });
};