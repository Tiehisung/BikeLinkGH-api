import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// INTERFACE
// ============================================
export interface IPricing extends Document {
    category: string;        // 'listing_fee', 'featured_boost', 'verification', 'subscription'
    categoryName: string;    // 'Listing Fees', 'Featured Boosts'
    key: string;             // 'standard', 'premium', '7day', '30day'
    label: string;           // 'Standard Listing', 'Premium Listing'
    description: string;
    amount: number;
    currency: string;
    features: string[];
    isPopular: boolean;
    isActive: boolean;
    displayOrder: number;
    metadata?: Record<string, any>;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMA
// ============================================
const pricingSchema = new Schema<IPricing>(
    {
        category: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        categoryName: {
            type: String,
            required: true,
        },
        key: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        label: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'GHS',
        },
        features: [{ type: String }],
        isPopular: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

// ============================================
// INDEXES
// ============================================
pricingSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
pricingSchema.index({ category: 1, key: 1 }, { unique: true }); // Unique key per category
pricingSchema.index({ isActive: 1 });

const PricingModel = mongoose.model<IPricing>('Pricing', pricingSchema);
export default PricingModel;