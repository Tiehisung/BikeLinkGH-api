import mongoose, { Schema } from 'mongoose';
import { Document } from 'mongoose';

// Escrow Interface
export interface IEscrow extends Document {
    listing: mongoose.Types.ObjectId;
    buyer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    amount: number;
    platformFee: number;
    sellerReceives: number;
    status: EscrowStatus;
    buyerPaymentRef?: string;
    buyerPaymentConfirmedBy?: mongoose.Types.ObjectId;
    buyerPaymentConfirmedAt?: Date;
    deliveryConfirmationCode?: string;
    buyerConfirmedAt?: Date;
    buyerNotes?: string;
    releaseReference?: string;
    releasedBy?: mongoose.Types.ObjectId;
    releasedAt?: Date;
    disputeReason?: string;
    disputeFiledBy?: mongoose.Types.ObjectId;
    disputeFiledAt?: Date;
    disputeResolution?: string;
    disputeResolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type EscrowStatus =
    | 'initiated'
    | 'awaiting_payment'
    | 'buyer_paid'
    | 'funds_held'
    | 'notified_seller'
    | 'bike_delivered'
    | 'buyer_inspecting'
    | 'buyer_confirmed'
    | 'released_to_seller'
    | 'completed'
    | 'disputed'
    | 'cancelled';

const escrowSchema = new Schema<IEscrow>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: true,
        },
        buyer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: { type: Number, required: true },
        platformFee: { type: Number, required: true },
        sellerReceives: { type: Number, required: true },
        status: {
            type: String,
            enum: [
                'initiated',
                'awaiting_payment',
                'buyer_paid',
                'funds_held',
                'notified_seller',
                'bike_delivered',
                'buyer_inspecting',
                'buyer_confirmed',
                'released_to_seller',
                'completed',
                'disputed',
                'cancelled',
            ],
            default: 'initiated',
        },
        buyerPaymentRef: String,
        buyerPaymentConfirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        buyerPaymentConfirmedAt: Date,
        deliveryConfirmationCode: String,
        buyerConfirmedAt: Date,
        buyerNotes: String,
        releaseReference: String,
        releasedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        releasedAt: Date,
        disputeReason: String,
        disputeFiledBy: { type: Schema.Types.ObjectId, ref: 'User' },
        disputeFiledAt: Date,
        disputeResolution: String,
        disputeResolvedAt: Date,
    },
    { timestamps: true }
);

const Escrow = mongoose.model<IEscrow>('Escrow', escrowSchema);
export default Escrow;