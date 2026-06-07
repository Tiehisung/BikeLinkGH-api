import mongoose, { Schema, Types } from 'mongoose';
import { Document } from 'mongoose';

export interface IInspection extends Document {
    listing: Types.ObjectId;
    inspector: Types.ObjectId;
    seller: Types.ObjectId;
    scheduledDate?: Date;
    inspectionLocation?: string;
    findings: {
        engineStarts?: boolean;
        engineCondition?: string;
        engineSoundNormal?: boolean;
        chassisNumberVisible?: boolean;
        chassisMatchesDocuments?: boolean;
        engineNumberVisible?: boolean;
        engineMatchesDocuments?: boolean;
        visibleDamage?: string;
        tireCondition?: string;
        brakesFunctional?: boolean;
        lightsFunctional?: boolean;
        testRideCompleted?: boolean;
        testRideNotes?: string;
        overallRating?: number;
    };
    inspectionPhotos: string[];
    inspectionVideo?: string;
    certificateNumber?: string;
    certificateIssued: boolean;
    stickerApplied: boolean;
    status: InspectionStatus
    notes?: string;
    createdAt: Date;
    completedAt?: Date;
}
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';


const inspectionSchema = new Schema<IInspection>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: true,
        },
        inspector: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        scheduledDate: Date,
        inspectionLocation: String,
        findings: {
            engineStarts: Boolean,
            engineCondition: String,
            engineSoundNormal: Boolean,
            chassisNumberVisible: Boolean,
            chassisMatchesDocuments: Boolean,
            engineNumberVisible: Boolean,
            engineMatchesDocuments: Boolean,
            visibleDamage: String,
            tireCondition: String,
            brakesFunctional: Boolean,
            lightsFunctional: Boolean,
            testRideCompleted: Boolean,
            testRideNotes: String,
            overallRating: { type: Number, min: 1, max: 5 },
        },
        inspectionPhotos: [{ type: String }],
        inspectionVideo: String,
        certificateNumber: { type: String, unique: true, sparse: true },
        certificateIssued: { type: Boolean, default: false },
        stickerApplied: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['scheduled', 'in_progress', 'completed', 'failed', 'cancelled'],
            default: 'scheduled',
        },
        notes: String,
        completedAt: Date,
    },
    { timestamps: true }
);

// Auto-generate certificate number
inspectionSchema.pre<IInspection>('save', async function () {
    if (this.isModified('status') && this.status === 'completed' && !this.certificateNumber) {
        const count = await mongoose.model('Inspection').countDocuments();
        this.certificateNumber = `MC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }
});

const Inspection = mongoose.model<IInspection>('Inspection', inspectionSchema);
export default Inspection;