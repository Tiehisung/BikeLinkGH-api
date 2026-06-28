import { Request, Response } from 'express';
import SmsLogModel from '../models/sms-log.model';
import { IAuthRequest } from '../types';

// AFRICA'S TALKING DELIVERY REPORT CALLBACK
export const smsDeliveryCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const reports = req.body;
        console.log('reports', reports)

        console.log('📩 SMS Delivery Report Received:');
        console.log(JSON.stringify(reports, null, 2));

        // Reports come as an object with a 'recipients' array or as a single object
        let recipients: any[] = [];

        if (Array.isArray(reports)) {
            recipients = reports;
        } else if (reports.recipients) {
            recipients = reports.recipients;
        } else if (reports.id) {
            // Single report
            recipients = [reports];
        }

        if (recipients.length === 0) {
            console.warn('⚠️ Empty delivery report received');
            res.sendStatus(200);
            return;
        }

        // Process each recipient status
        for (const recipient of recipients) {
            await SmsLogModel.findOneAndUpdate(
                { messageId: recipient.id || recipient.messageId },
                {
                    messageId: recipient.id || recipient.messageId,
                    recipient: recipient.number || recipient.phoneNumber,
                    status: recipient.status || 'Pending',
                    reason: recipient.statusReason || recipient.reason,
                    networkCode: recipient.networkCode,
                    cost: recipient.cost,
                    raw: recipient,
                },
                { upsert: true, }
            );
        }

        console.log(`✅ Logged ${recipients.length} delivery report(s)`);

        // Always return 200 to acknowledge receipt
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Delivery report error:', error);
        // Always return 200 so AT doesn't retry
        res.sendStatus(200);
    }
};

export const getSmsLogs = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 20, status } = req.query as any;

        const filter: any = {};
        if (status && status !== 'all') filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Number(limit));
        const skip = (pageNum - 1) * limitNum;

        const [logs, total] = await Promise.all([
            SmsLogModel.find(filter).sort('-createdAt').skip(skip).limit(limitNum).lean(),
            SmsLogModel.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: pageNum, limit: limitNum, total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch SMS logs' });
    }
};