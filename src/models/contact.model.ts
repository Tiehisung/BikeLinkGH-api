import mongoose, { Schema, Document } from 'mongoose';

// INTERFACE
export interface IContact extends Document {
    fullName: string;
    phoneNumber: string;
    email?: string;
    inquiryType: `${EInquiryType}`;
    message?: string;
    status: `${EMessageStatus}`;
    category: `${EMessageCategory}`;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum EMessageStatus {
    UNREAD = 'unread',
    READ = 'read',
}

export enum EMessageCategory {
    STARRED = 'starred',
    IMPORTANT = 'important',
    SPAM = 'spam',
    ARCHIVED = 'archived',
}

export enum EInquiryType {
    BUYING = 'buying',
    SELLING = 'selling',
    VERIFICATION = 'verification',
    PAYMENT = 'payment',
    LISTING = 'listing',
    PARTNERSHIP = 'partnership',
    OTHER = 'other',
}

// SCHEMA
const contactSchema = new Schema<IContact>(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        phoneNumber: {
            type: String,
            required: [true, 'Phone number is required'],
            match: [/^0[0-9]{9}$/, 'Enter a valid Ghana phone number'],
        },
        email: {
            type: String,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
        },
        inquiryType: {
            type: String,
            required: [true, 'Inquiry type is required'],
            enum: Object.values(EInquiryType),
        },
        message: {
            type: String,
            maxlength: [2000, 'Message cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: Object.values(EMessageStatus),
            default:EMessageStatus.UNREAD,
        },
        category: {
            type: String,
            enum: Object.values(EMessageCategory),
            default: null,
        },
        notes: {
            type: String,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
    },
    { timestamps: true }
);

// INDEXES
contactSchema.index({ status: 1, createdAt: -1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ createdAt: -1 });

const ContactModel = mongoose.model<IContact>('Contact', contactSchema);
export default ContactModel;