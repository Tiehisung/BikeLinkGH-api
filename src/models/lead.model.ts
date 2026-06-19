import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
    listing: mongoose.Types.ObjectId;
    buyer: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    buyerPhone: string;
    sellerPhone: string;
    smsSent: boolean;
    smsMessageId?: string;
    smsError?: string;
    status: ELeadStatus;
    notifications: INotificationResult[]
    createdAt: Date;
    updatedAt: Date;
}

export enum ELeadStatus {
    PENDING = 'pending',       // Just created, notifying...
    CONTACTED = 'contacted',   // Seller called the buyer
}

export enum ENotificationChannel {
    SMS = 'sms',
    EMAIL = 'email',
    DASHBOARD = 'dashboard',
}
export interface INotificationResult {
    channel: ENotificationChannel;
    success: boolean;
    messageId?: string;
    error?: string;
}

const leadSchema = new Schema<ILead>(
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
        buyerPhone: {
            type: String,
            required: true,
        },
        sellerPhone: {
            type: String,
            required: true,
        },
        smsSent: {
            type: Boolean,
            default: false,
        },
        smsMessageId: String,
        smsError: String,
        status: {
            type: String,
            enum: Object.values(ELeadStatus),
            default: ELeadStatus.PENDING,
        },
        notifications: [{
            channel: { type: String, enum: Object.values(ENotificationChannel) },
            success: Boolean,
            messageId: String,
            error: String,
            sentAt: { type: Date, default: Date.now },
        }],
    },
    { timestamps: true }
);

// One request per buyer per listing
leadSchema.index({ listing: 1, buyer: 1 }, { unique: true });
leadSchema.index({ seller: 1, createdAt: -1 });
leadSchema.index({ buyer: 1 });

const LeadModel = mongoose.model<ILead>('Lead', leadSchema);
export default LeadModel;