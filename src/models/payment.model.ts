import mongoose, { Schema } from 'mongoose';
import { Types } from 'mongoose';

export enum EPaymentType {
    LISTING_FEE = 'listing_fee',
    PREMIUM_UPGRADE = 'premium_upgrade',
    VERIFICATION_FEE = 'verification_fee',
    ESCROW_DEPOSIT = 'escrow_deposit',
    ESCROW_RELEASE = 'escrow_release',
}

export enum EPaymentStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    PAID = 'paid',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum EMobileNetwork {
    MTN = 'MTN',
    AIRTEL_TIGO = 'AirtelTigo',
    VODAFONE = 'Vodafone',
}

export enum EPaymentChannel {
    MOBILE_MONEY = 'mobile_money',
    CARD = 'card',
    BANK_TRANSFER = 'bank_transfer',
    USSD = 'ussd',
    QR = 'qr',
    BANK = 'bank',
}
export interface IPayment extends Document {
    _id: Types.ObjectId;
    listing?: Types.ObjectId;
    payer: Types.ObjectId;
    recipient?: Types.ObjectId;
    amount: number;
    fee: number;
    totalAmount: number;
    paymentType: EPaymentType;
    status: EPaymentStatus;
    momoNumber: string;
    network: EMobileNetwork;
    paystackReference?: string;
    paystackTransactionId?: number;
    paystackChannel?: EPaymentChannel;
    paystackGatewayResponse?: string;

    hubtelTransactionId?: string;
    momoReference?: string;
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}


const paymentSchema = new Schema<IPayment>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
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
            min: 0,
        },
        fee: { type: Number, default: 0 },
        momoNumber: { type: String, required: true },
        network: {
            type: String,
            enum: Object.values(EMobileNetwork),
            required: true,
        },
        paymentType: {
            type: String,
            enum: Object.values(EPaymentType),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(EPaymentStatus),
            default: EPaymentStatus.PENDING,
        },
        // Paystack-specific fields
        paystackReference: { type: String, unique: true, sparse: true },
        paystackTransactionId: { type: Number },
        paystackChannel: { type: String },
        paystackGatewayResponse: { type: String },
        // Legacy
        hubtelTransactionId: { type: String },
        momoReference: { type: String },
        metadata: { type: Schema.Types.Mixed },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Indexes
paymentSchema.index({ payer: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

const PaymentModel = mongoose.model<IPayment>('Payment', paymentSchema);
export default PaymentModel;