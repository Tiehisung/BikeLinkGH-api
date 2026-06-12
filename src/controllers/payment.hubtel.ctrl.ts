import { Response } from 'express';
import { hubtelService } from '../services/hubtel.service';
import PaymentModel, { EPaymentStatus, EPaymentType } from '../models/payment.model';
import ListingModel from '../models/listing.model';
import { IAuthRequest } from '../types';

// ============================================
// INITIATE PAYMENT (Hubtel)
// ============================================
export const initiatePayment = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { listingId, momoNumber, network } = req.body;
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

        // Check if already paid
        if (listing.paymentStatus === 'paid') {
            res.status(400).json({ success: false, message: 'Already paid' });
            return;
        }

        const amount = listing.listingType === 'premium' ? 40 : 25;
        const clientReference = `LISTING-${listing._id}-${Date.now()}`;

        // Map network to Hubtel channel
        const networkMap: Record<string, string> = {
            MTN: 'mtn-gh',
            AirtelTigo: 'tigo-gh',
            Vodafone: 'vodafone-gh',
        };

        const channel = networkMap[network] || 'mtn-gh';

        // Format phone for Hubtel (must start with 233)
        const formattedPhone = momoNumber.startsWith('0')
            ? '233' + momoNumber.substring(1)
            : momoNumber;

        // Create payment record
        const payment = await PaymentModel.create({
            listing: listing._id,
            payer: user._id,
            amount,
            fee: 0,
            momoNumber: formattedPhone,
            network,
            paymentType: 'listing_fee'as EPaymentType,
            status: EPaymentStatus.PENDING,
            metadata: { clientReference },
        });

        // Call Hubtel
        const result = await hubtelService.receiveMobileMoney({
            customerName: user.fullName,
            customerMsisdn: formattedPhone,
            channel: channel as any,
            amount,
            primaryCallbackUrl: `${process.env.API_URL}/api/payments/hubtel-webhook`,
            description: `Listing fee - ${listing.brand} ${listing.model || ''}`,
            clientReference,
        });

        if (!result.success) {
            res.status(400).json({
                success: false,
                message: result.message || 'Payment initiation failed',
            });
            return;
        }

        // Update payment with transaction ID
        payment.hubtelTransactionId = result.transactionId;
        payment.metadata = payment.metadata || {};
        payment.metadata.clientReference = clientReference;
        await payment.save();

        res.json({
            success: true,
            message: 'Check your phone for MoMo prompt',
            data: {
                paymentId: payment._id,
                transactionId: result.transactionId,
                amount,
                reference: clientReference,
            },
        });
    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ success: false, message: 'Payment failed' });
    }
};

// ============================================
// HUBTEL WEBHOOK
// ============================================
export const hubtelWebhook = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { ClientReference, Status, TransactionId, Amount } = req.body;

        console.log('Hubtel webhook received:', { ClientReference, Status, TransactionId });

        // Find payment by client reference
        const payment = await PaymentModel.findOne({
            'metadata.clientReference': ClientReference,
        });

        if (!payment) {
            console.warn('Payment not found for reference:', ClientReference);
            res.sendStatus(200); // Always return 200 to Hubtel
            return;
        }

        if (Status === 'Success') {
            payment.status = EPaymentStatus.SUCCESS;
            payment.completedAt = new Date();

            // Update listing payment status
            if (payment.listing) {
                await ListingModel.findByIdAndUpdate(payment.listing, {
                    paymentStatus: 'paid',
                    paymentReference: ClientReference,
                });
            }
        } else {
            payment.status = EPaymentStatus.FAILED;
        }

        await payment.save();
        res.sendStatus(200);
    } catch (error) {
        console.error('Hubtel webhook error:', error);
        res.sendStatus(200); // Always 200 to acknowledge receipt
    }
};

// ============================================
// CHECK PAYMENT STATUS (Polling fallback)
// ============================================
export const checkPaymentStatus = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { paymentId } = req.params;

        const payment = await PaymentModel.findById(paymentId);
        if (!payment) {
            res.status(404).json({ success: false, message: 'Payment not found' });
            return;
        }

        // Check via Hubtel
        if (payment.hubtelTransactionId) {
            const status = await hubtelService.checkPaymentStatus(payment.hubtelTransactionId);

            if (status.status === 'completed' && payment.status !== 'success') {
                payment.status =EPaymentStatus.SUCCESS
                payment.completedAt = new Date();

                if (payment.listing) {
                    await ListingModel.findByIdAndUpdate(payment.listing, {
                        paymentStatus: 'paid',
                    });
                }

                await payment.save();
            }
        }

        res.json({
            success: true,
            data: {
                paymentId: payment._id,
                status: payment.status,
                amount: payment.amount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
};