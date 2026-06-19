import axios from 'axios';

// ============================================
// TYPES
// ============================================
export interface ATSmsPayload {
    to: string;        // Can be comma-separated: "233XXXXXXXXX,233YYYYYYYYY"
    message: string;
    from?: string;     // Sender ID or shortcode
}

export interface ATSmsResponse {
    success: boolean;
    messageId?: string;
    recipients?: number;
    error?: string;
}

// ============================================
// AFRICA'S TALKING SMS SERVICE
// ============================================
class ATSmsService {
    private apiKey: string;
    private username: string;
    private senderId: string;
    private baseUrl: string;

    constructor() {
        this.username = process.env.AT_USERNAME || 'sandbox'; // Your Africa's Talking username
        this.apiKey = process.env.AT_API_KEY || '';
        this.senderId = process.env.AT_SENDER_ID || 'MotoMartGH'; // Your approved sender ID
        this.baseUrl = 'https://api.africastalking.com/version1';
    }

    // ============================================
    // SEND SMS
    // ============================================
    async sendSms(payload: ATSmsPayload): Promise<ATSmsResponse> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/messaging`,
                new URLSearchParams({
                    username: this.username,
                    to: payload.to,
                    message: payload.message,
                    from: payload.from || this.senderId,
                }),
                {
                    headers: {
                        'apiKey': this.apiKey,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                    },
                }
            );

            const data = response.data.SMSMessageData;

            return {
                success: true,
                messageId: data.Message,
                recipients: data.Recipients?.length || 0,
            };
        } catch (error: any) {
            console.error('SMS send error:', error.response?.data || error.message);

            // Fallback: Log the message
            console.log('📱 SMS WOULD HAVE BEEN SENT:');
            console.log('   To:', payload.to);
            console.log('   Message:', payload.message);

            return {
                success: false,
                error: error.response?.data?.SMSMessageData?.Message || 'Failed to send SMS',
            };
        }
    }

    // ============================================
    // SEND BULK SMS
    // ============================================
    async sendBulkSms(recipients: string[], message: string): Promise<ATSmsResponse> {
        return this.sendSms({
            to: recipients.join(','),
            message,
        });
    }

    // ============================================
    // CHECK BALANCE
    // ============================================
    async getBalance(): Promise<{ balance: string }> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/user?username=${this.username}`,
                {},
                {
                    headers: {
                        'apiKey': this.apiKey,
                        'Accept': 'application/json',
                    },
                }
            );

            return {
                balance: response.data.UserData.balance,
            };
        } catch (error: any) {
            console.error('Balance check error:', error);
            return { balance: '0' };
        }
    }

    // ============================================
    // FORMAT PHONE FOR AFRICA'S TALKING
    // ============================================
    static formatPhone(phone: string): string {
        let cleaned = phone.replace(/[\s\-\+]/g, '');

        // Convert 0XX to 233XX
        if (cleaned.startsWith('0')) {
            cleaned = '233' + cleaned.substring(1);
        }

        // Add country code if missing
        if (!cleaned.startsWith('233')) {
            cleaned = '233' + cleaned;
        }

        return '+' + cleaned; // Africa's Talking requires + prefix
    }

    // ============================================
    // SMS TEMPLATES
    // ============================================
    static generateSellerSms(data: {
        sellerName: string;
        buyerName: string;
        buyerPhone: string;
        bikeTitle: string;
        bikePrice: number;
    }): string {
        return `MotoMartGH: ${data.buyerName} wants to buy your ${data.bikeTitle} (GHS ${data.bikePrice.toLocaleString()}). Call them: ${data.buyerPhone}`;
    }

    static generateBuyerConfirmation(data: {
        buyerName: string;
        sellerName: string;
        bikeTitle: string;
    }): string {
        return `MotoMartGH: ${data.sellerName} has been notified about your interest in the ${data.bikeTitle}. They will call you shortly.`;
    }
}

// Export singleton
export const at_smsService = new ATSmsService();
export default ATSmsService;