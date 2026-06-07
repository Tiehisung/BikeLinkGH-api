import mongoose, { Schema } from 'mongoose';
import { Types } from 'mongoose';

 export interface IPayment extends Document {
     listing?: Types.ObjectId;
     payer: Types.ObjectId;
     recipient?: Types.ObjectId;
     amount: number;
     fee: number;
     momoNumber: string;
     network: MobileNetwork;
     paymentType: PaymentType;
     status: TransactionStatus;
     hubtelTransactionId?: string;
     momoReference?: string;
     metadata?: Record<string, any>;
     createdAt: Date;
     completedAt?: Date;
 }

export type MobileNetwork = 'MTN' | 'AirtelTigo' | 'Vodafone';
export type PaymentType = 'listing_fee' | 'premium_upgrade' | 'verification_fee' | 'escrow_deposit' | 'escrow_release';
export type TransactionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'refunded';

const paymentSchema = new Schema<IPayment>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: function (this: IPayment) {
                return ['listing_fee', 'premium_upgrade', 'escrow_deposit', 'escrow_release'].includes(this.paymentType);
            },
        },
        payer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        recipient: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Amount cannot be negative'],
        },
        fee: { type: Number, default: 0 },
        momoNumber: {
            type: String,
            required: true,
        },
        network: {
            type: String,
            enum: ['MTN', 'AirtelTigo', 'Vodafone'],
            required: true,
        },
        paymentType: {
            type: String,
            enum: ['listing_fee', 'premium_upgrade', 'verification_fee', 'escrow_deposit', 'escrow_release'],
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
            default: 'pending',
        },
        hubtelTransactionId: String,
        momoReference: String,
        metadata: Schema.Types.Mixed,
        completedAt: Date,
    },
    { timestamps: true }
);

const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema);
export default PaymentModel;