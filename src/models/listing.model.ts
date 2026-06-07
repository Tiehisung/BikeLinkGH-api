import mongoose, { Schema } from 'mongoose';
import { IUser } from './user.model';
import { Types } from 'mongoose';

 export interface IListing  {
     _id: Types.ObjectId;
     seller: Types.ObjectId | IUser;
     brand: BikeBrand;
     model?: string;
     year?: number;
     mileage?: number;
     engineCapacity?: number;
     condition: BikeCondition;
     price: number;
     priceNegotiable: boolean;
     location: string;
     description?: string;
     reasonForSelling?: string;
     images: string[];
     videoUrl?: string;
     hasDocuments: boolean;
     documentType?: DocumentType;
     documentImage?: string;
     chassisNumber?: string;
     engineNumber?: string;
     listingType: ListingType;
     listingFee?: number;
     paymentStatus: PaymentStatus;
     paymentReference?: string;
     status: ListingStatus;
     adminNotes?: string;
     reviewedBy?: Types.ObjectId;
     reviewedAt?: Date;
     isPhysicallyVerified: boolean;
     inspectionId?: Types.ObjectId;
     viewCount: number;
     inquiryCount: number;
     createdAt: Date;
     updatedAt: Date;
     expiresAt: Date;
 }

export type BikeBrand = 'Haojue' | 'Bajaj' | 'Royal' | 'Honda' | 'Yamaha' | 'TVS' | 'KTM' | 'Kawasaki' | 'Suzuki' | 'Other';
export type BikeCondition = 'Excellent' | 'Good' | 'Fair' | 'Needs Repair';
export type DocumentType = 'Original Registration' | 'Duplicate Registration' | 'Receipt Only' | 'None' | '';
export type ListingType = 'standard' | 'premium';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'sold' | 'expired';

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
            enum: ['Haojue', 'Bajaj', 'Royal', 'Honda', 'Yamaha', 'TVS', 'KTM', 'Kawasaki', 'Suzuki', 'Other'],
        },
        model: String,
        year: Number,
        mileage: Number,
        engineCapacity: Number,
        condition: {
            type: String,
            required: [true, 'Condition is required'],
            enum: ['Excellent', 'Good', 'Fair', 'Needs Repair'],
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
            enum: ['Original Registration', 'Duplicate Registration', 'Receipt Only', 'None', ''],
        },
        documentImage: String,
        chassisNumber: String,
        engineNumber: String,
        listingType: {
            type: String,
            enum: ['standard', 'premium'],
            default: 'standard',
        },
        listingFee: Number,
        paymentStatus: {
            type: String,
            enum: ['unpaid', 'paid', 'refunded'],
            default: 'unpaid',
        },
        paymentReference: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'sold', 'expired'],
            default: 'pending',
        },
        adminNotes: String,
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        isPhysicallyVerified: { type: Boolean, default: false },
        inspectionId: { type: Schema.Types.ObjectId, ref: 'Inspection' },
        viewCount: { type: Number, default: 0 },
        inquiryCount: { type: Number, default: 0 },
        expiresAt: {
            type: Date,
            default: function () {
                return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            },
        },
    },
    { timestamps: true }
);

// Indexes for search
listingSchema.index({ brand: 1, condition: 1, location: 1, price: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });

const ListingModel = mongoose.model<IListing>('Listing', listingSchema);
export default ListingModel;