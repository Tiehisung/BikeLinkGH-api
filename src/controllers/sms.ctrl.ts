import { Response } from 'express';

import { IAuthRequest, IApiResponse } from '../types';
import { ENV } from '../config/env.config';
import { formatPhone, getATAccountInfo, sendSms } from '../services/sms/at.service';


export const getSmsBalance = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const result = await getATAccountInfo();

        if (!result.success) {
            res.status(500).json({
                success: false,
                message: result.error || 'Failed to fetch balance',
            } as IApiResponse);
            return;
        }

        res.json({ success: true, data: result.data } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch SMS balance' } as IApiResponse);
    }
};

export const sendTestSms = async (req: IAuthRequest, res: Response): Promise<void> => {
    try {
        const { phone, message } = req.body;

        if (!phone) {
            res.status(400).json({ success: false, message: 'Phone number is required' });
            return;
        }

        const formattedPhone = formatPhone(phone);
        const testMessage = message || `This is a test SMS from ${ENV.APP_NAME}. If you received this, SMS is working! 🏍️`;

        const result = await sendSms({
            to: formattedPhone,
            message: testMessage,
        });

        res.json({
            success: true,
            data: {
                smsSent: result.success,
                messageId: result.messageId,
                recipients: result.recipients,
            },
        } as IApiResponse);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to send test SMS' } as IApiResponse);
    }
};