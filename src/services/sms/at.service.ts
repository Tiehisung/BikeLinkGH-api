import AfricasTalking from 'africastalking';
import { ENV } from '../../config/env.config';
import SmsLogModel from '../../models/sms-log.model';

// INITIALIZE
const at = AfricasTalking({
    apiKey: ENV.AT_SMS.AT_API_KEY || '',
    username: ENV.AT_SMS.AT_USERNAME || 'sandbox',
});

const sms = at.SMS;
const account = at.ACCOUNT;

const senderId = ENV.AT_SMS.AT_SENDER_ID as string
const isSandbox = ENV.AT_SMS.AT_SENDER_ID == 'sandbox'

// TYPES
export interface ATSmsPayload {
    to: string | string[];
    message: string;
    from?: string;
    premium?: boolean;
}

export interface ATSmsResponse {
    success: boolean;
    messageId?: string;
    recipients?: number;
    error?: string;
}

export interface ATAccountInfo {
    balance: string;
    countryCode: string;
    isSandbox: boolean;
}

// SEND SMS
export const sendSms = async (payload: ATSmsPayload): Promise<ATSmsResponse> => {

    try {
        const options: any = {
            to: Array.isArray(payload.to) ? payload.to : [payload.to],
            message: payload.message,
        };

        if (payload.from || senderId) {
            options.from = payload.from || senderId;
        }

        const result = payload.premium
            ? await sms.sendPremium(options)
            : await sms.send(options);

        const data = result.SMSMessageData;

   
        // ✅ LOG OUTGOING SMS
 
        if (data.Recipients) {
            for (const recipient of data.Recipients) {
                await SmsLogModel.create({
                    messageId: recipient.messageId || data.Message,
                    recipient: recipient.number,
                    status: recipient.status || 'Pending',
                    cost: recipient.cost,
                    networkCode: (recipient as any).networkCode,
                    raw: recipient,
                });
            }
        }


        return {
            success: data.Recipients?.some((r: any) => r.status === 'Success') || false,
            messageId: data.Message,
            recipients: data.Recipients?.length || 0,
        };
    } catch (error: any) {
        console.error('SMS send error:', error?.response?.data || error?.message || error);
        console.log('📱 SMS WOULD HAVE BEEN SENT:');
        console.log('   To:', payload.to);
        console.log('   Message:', payload.message);

        return {
            success: false,
            error: error?.message || error?.response?.data?.SMSMessageData?.Message || 'Failed to send SMS',
        };
    }
};

// SEND BULK SMS
export const sendBulkSms = async (recipients: string[], message: string): Promise<ATSmsResponse> => {
    return sendSms({ to: recipients, message });
};

// GET ACCOUNT INFO
export const getATAccountInfo = async (): Promise<{ success: boolean; data?: ATAccountInfo; error?: string }> => {
    try {
        const result = await account.fetchAccount();
        const userData = result.UserData;

        return {
            success: true,
            data: {
                balance: isSandbox ? `${userData.balance} (Sandbox)` : userData.balance,
                countryCode: (userData as any).countryCode || 'GH',
                isSandbox,
            },
        };
    } catch (error: any) {
        console.error('Account info error:', error?.response?.data || error?.message || error);
        return {
            success: false,
            error: error?.message || 'Failed to fetch account info',
        };
    }
};

// GET BALANCE
export const getATAccountBalance = async (): Promise<string> => {
    const result = await getATAccountInfo();
    return result.data?.balance || '0';
};

// FORMAT PHONE
export const formatPhone = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-\+]/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '233' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('233')) {
        cleaned = '233' + cleaned;
    }

    return '+' + cleaned;
};

// SMS TEMPLATES
export const generateSellerSms = (data: {
    sellerName: string;
    buyerName: string;
    buyerPhone: string;
    bikeTitle: string;
    bikePrice: number;
}): string => {
    return `${ENV.APP_NAME}: ${data.buyerName} wants to buy your ${data.bikeTitle} (GHS ${data.bikePrice.toLocaleString()}). Call them: ${data.buyerPhone}`;
};

export const generateBuyerConfirmationSms = (data: {
    buyerName: string;
    sellerName: string;
    bikeTitle: string;
}): string => {
    return `${ENV.APP_NAME}: ${data.sellerName} has been notified about your interest in the ${data.bikeTitle}. They will call you shortly.`;
};