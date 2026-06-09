
import mongoose, { Schema, Document, } from 'mongoose';
import { slugify } from '../lib/slug';

// ============================================
// INTERFACE
// ============================================
export interface IBrand extends Document {
    name: string;
    slug: string;
    tier: EBrandTier
    logo?: string;
    isActive: boolean;
    isPopular: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export enum EBrandTier {
    high = 'high',
    mid = 'mid',
    economy = 'economy'
}

// ============================================
// SCHEMA
// ============================================
const brandSchema = new Schema<IBrand>(
    {
        name: {
            type: String,
            required: [true, 'Brand name is required'],
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Brand slug is required'],
            unique: true,
            lowercase: true,
        },
        tier: {
            type: String,
            enum: Object.values(EBrandTier),
            default: EBrandTier.mid,
        },
        logo: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isPopular: {
            type: Boolean,
            default: false,
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// INDEXES
// ============================================
brandSchema.index({ isActive: 1, displayOrder: 1 });
brandSchema.index({ slug: 1 });
brandSchema.index({ tier: 1 });

// ============================================
// MIDDLEWARE - Auto generate slug
// ============================================
brandSchema.pre<IBrand>('save', async function () {
    if (this.isModified('name')) {
        this.slug = slugify(this.name)
    }
});
const BrandModel = mongoose.model<IBrand>('Brand', brandSchema);
export default BrandModel;