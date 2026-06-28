import mongoose, { Schema, Document } from 'mongoose';

export interface ISmsLog extends Document {
    messageId: string;
    recipient: string;
    status: 'Success' | 'Failed' | 'Rejected' | 'Pending';
    reason?: string;
    networkCode?: string;
    cost?: string;
    raw?: any;
    createdAt: Date;
    updatedAt: Date;
}

 
const smsLogSchema = new Schema<ISmsLog>(
    {
        messageId: {
            type: String,
            required: true,
            index: true,
        },
        recipient: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['Success', 'Failed', 'Rejected', 'Pending'],
            required: true,
        },
        reason: {
            type: String,
        },
        networkCode: {
            type: String,
        },
        cost: {
            type: String,
        },
        raw: {
            type: Schema.Types.Mixed,
        },
    },
    { timestamps: true }
);
 
smsLogSchema.index({ recipient: 1 });
smsLogSchema.index({ status: 1 });
smsLogSchema.index({ createdAt: -1 });

const SmsLogModel = mongoose.models.SmsLog || mongoose.model<ISmsLog>('SmsLog', smsLogSchema);
export default SmsLogModel;