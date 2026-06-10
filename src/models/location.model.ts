import mongoose, { Schema, Document } from 'mongoose';
import { slugify } from '../lib/slug';

export interface ILocation extends Document {
    name: string;
    slug: string;
    region: string
    type: ELocationType
    isActive: boolean;
    isPopular: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export enum ELocationType {
    town = 'town',
    city = 'city',
    distric = 'district',
}

const locationSchema = new Schema<ILocation>(
    {
        name: {
            type: String,
            required: [true, 'Location name is required'],
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Slug is required'],
            unique: true,
            lowercase: true,
        },
        region: {
            type: String,
            default: 'Upper West',
        },
        type: {
            type: String,
            enum: Object.values(ELocationType),
            default: ELocationType['town'],
        },
        isActive: { type: Boolean, default: true },
        isPopular: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

locationSchema.index({ isActive: 1, displayOrder: 1 });
locationSchema.index({ region: 1 });
 

locationSchema.pre<ILocation>('save', async function () {
    if (this.isModified('name')) {
        this.slug = slugify(this.name)
    }
});

const LocationModel = mongoose.model<ILocation>('Location', locationSchema);
export default LocationModel;