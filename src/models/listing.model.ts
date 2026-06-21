import mongoose, { Schema } from 'mongoose';
import { IUser } from './user.model';
import { Types } from 'mongoose';
import { EPaymentStatus } from './payment.model';

export interface IListing {
    _id: Types.ObjectId;
    seller: Types.ObjectId | IUser;
    brand: string;
    model?: string;
    year?: number;
    mileage?: number;
    engineCapacity?: number;
    condition: `${EBikeCondition}`;
    price: number;
    priceNegotiable: boolean;
    location: string;
    description?: string;
    reasonForSelling?: string;
    images: string[];
    videoUrl?: string;
    hasDocuments: boolean;
    documentType?: `${EDocumentType}`;
    documentImage?: string;
    chassisNumber?: string;
    engineNumber?: string;
    listingType: `${EListingType}`;
    listingFee?: number;
    paymentStatus: `${EPaymentStatus}`;
    paymentReference?: string;
    status: `${EListingStatus}`;
    adminNotes?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    isPhysicallyVerified: boolean;
    inspectionId?: Types.ObjectId;
    viewCount: number;
    inquiryCount: number;
    viewers: {//Track viewers as much as possible
        _id: string
        userId?: string
        fullName?: string;
        phoneNumber?: string;
        viewedAt: Date
    }[];

    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;

    isBoosted: boolean,
    boostType: '7day' | '30day' | null,
    boostExpiresAt: Date,
    boostPurchasedAt: Date,
    boostPaymentReference: string,
}

export enum EBikeCondition {
    Excellent = 'Excellent',
    Good = 'Good',
    Fair = 'Fair',
    NeedsRepair = 'Needs Repair',
}

export enum EDocumentType {
    OriginalRegistration = 'Original Registration',
    DuplicateRegistration = 'Duplicate Registration',
    ReceiptOnly = 'Receipt Only',
    None = 'None',
    Empty = '',
}

export enum EListingType {
    Standard = 'standard',
    Premium = 'premium',
}


export enum EListingStatus {
    Pending = 'pending',
    Approved = 'approved',
    Rejected = 'rejected',
    Sold = 'sold',
    Expired = 'expired',
}

// Convert all enums to union types
export type TBikeCondition = `${EBikeCondition}`;


const listingSchema = new Schema<IListing>(
    {
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Seller is required'],
        },
        brand: {
            type: String,
            required: [true, 'Brand is required'],
        },
        model: String,
        year: Number,
        mileage: Number,
        engineCapacity: Number,
        condition: {
            type: String,
            required: [true, 'Condition is required'],
            enum: Object.values(EBikeCondition),
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        priceNegotiable: { type: Boolean, default: true },
        location: {
            type: String,
            required: [true, 'Location is required'],
        },
        description: { type: String, maxlength: 1000 },
        reasonForSelling: { type: String, maxlength: 500 },
        images: [{ type: String }],
        videoUrl: String,
        hasDocuments: { type: Boolean, default: false },
        documentType: {
            type: String,
            enum: Object.values(EDocumentType),
        },
        documentImage: String,
        chassisNumber: String,
        engineNumber: String,
        listingType: {
            type: String,
            enum: Object.values(EListingType),
            default: 'standard',
        },
        listingFee: Number,
        paymentStatus: {
            type: String,
            enum: Object.values(EPaymentStatus),
            default: EPaymentStatus.PENDING,
        },
        paymentReference: String,
        status: {
            type: String,
            enum: Object.values(EListingStatus),
            default: 'pending',
        },
        adminNotes: String,
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        // leads: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
        reviewedAt: Date,
        isPhysicallyVerified: { type: Boolean, default: false },
        inspectionId: { type: Schema.Types.ObjectId, ref: 'Inspection' },
        viewCount: { type: Number, default: 0 },
        viewers: {
            type: [
                {
                    userId: {
                        type: Schema.Types.ObjectId,
                        ref: 'User',
                        default: null,
                    },
                    fullName: {
                        type: String,
                        default: 'Anonymous',
                    },
                    phoneNumber: {
                        type: String,
                        default: null,
                    },
                    viewedAt: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],
            default: []
        },
        inquiryCount: { type: Number, default: 0 },
        expiresAt: {
            type: Date,
            default: function () {
                return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            },
        },

        isBoosted: {
            type: Boolean,
            default: false,
        },
        boostType: {
            type: String,
            enum: ['7day', '30day', null],
            default: null,
        },
        boostExpiresAt: {
            type: Date,
            default: null,
        },
        boostPurchasedAt: {
            type: Date,
            default: null,
        },
        boostPaymentReference: {
            type: String,
        },
    },
    { timestamps: true }
);

// Indexes for search
listingSchema.index({ brand: 1, condition: 1, location: 1, price: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });

// Add index for sorting boosted listings
listingSchema.index({ isBoosted: -1, boostExpiresAt: 1 });
listingSchema.index({ boostExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const ListingModel = mongoose.model<IListing>('Listing', listingSchema);
export default ListingModel;