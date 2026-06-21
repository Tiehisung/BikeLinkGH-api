import axios, { AxiosInstance } from 'axios';

// ============================================
// TYPES
// ============================================
export interface InitializeTransactionParams {
    email: string;
    amount: number;           // In GHS
    currency?: string;
    reference: string;
    callback_url?: string;
    channels?: string[];
    metadata?: Record<string, any>;
}

export interface ChargeMobileMoneyParams {
    email: string;
    amount: number;
    reference: string;
    currency: string;
    mobile_money: {
        phone: string;
        provider: 'mtn' | 'vod' | 'tgo';
    };
}

export interface PaystackResponse {
    success: boolean;
    message?: string;
    data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
        status?: string;
        transaction_id?: number;
        amount?: number;
        paid_at?: string;
        channel?: string;
    };
}

export interface VerifyTransactionResponse extends PaystackResponse {
    data?: PaystackResponse['data'] & {
        gateway_response?: string;
        ip_address?: string;
        fees?: number;
        authorization?: {
            authorization_code?: string;
            bin?: string;
            last4?: string;
            exp_month?: string;
            exp_year?: string;
            channel?: string;
            card_type?: string;
            bank?: string;
            country_code?: string;
            brand?: string;
        };
        customer?: {
            id: number;
            email: string;
        };
    };
}

// ============================================
// PAYSTACK SERVICE CLASS
// ============================================
class PaystackService {
    private secretKey: string;
    private publicKey: string;
    private webhookSecret: string;
    private client: AxiosInstance;

    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
        this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || '';

        this.client = axios.create({
            baseURL: 'https://api.paystack.co',
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    // ============================================
    // INITIALIZE TRANSACTION (Checkout page)
    // ============================================
    async initializeTransaction(params: InitializeTransactionParams): Promise<PaystackResponse> {
        try {
            const response = await this.client.post('/transaction/initialize', {
                email: params.email,
                amount: Math.round(params.amount * 100), // Convert GHS to pesewas
                currency: params.currency || 'GHS',
                reference: params.reference,
                callback_url: params.callback_url,
                channels: params.channels || ['mobile_money', 'card'],
                metadata: {
                    ...params.metadata,
                    source: 'motomartgh',
                },
            });

            return {
                success: true,
                data: {
                    authorization_url: response.data.data.authorization_url,
                    access_code: response.data.data.access_code,
                    reference: response.data.data.reference,
                },
            };
        } catch (error: any) {
            console.error('Paystack initialize error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Payment initialization failed',
            };
        }
    }

    // ============================================
    // CHARGE MOBILE MONEY DIRECTLY (USSD push)
    // ============================================
    async chargeMobileMoney(params: ChargeMobileMoneyParams): Promise<PaystackResponse> {
        try {
            const response = await this.client.post('/charge', {
                email: params.email,
                amount: Math.round(params.amount * 100),
                reference: params.reference,
                currency: params.currency || 'GHS',
                mobile_money: {
                    phone: params.mobile_money.phone,
                    provider: params.mobile_money.provider,
                },
                metadata: {
                    source: 'motomartgh',
                },
            });

            return {
                success: true,
                message: response.data.data.status === 'send_otp'
                    ? 'Check your phone for MoMo prompt'
                    : 'Payment initiated',
                data: {
                    reference: response.data.data.reference,
                    status: response.data.data.status,
                    transaction_id: response.data.data.id,
                },
            };
        } catch (error: any) {
            console.error('Paystack charge error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Mobile money charge failed',
            };
        }
    }

    // ============================================
    // VERIFY TRANSACTION
    // ============================================
    async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
        try {
            const response = await this.client.get(`/transaction/verify/${reference}`);

            const data = response.data.data;

            return {
                success: data.status === 'success',
                data: {
                    reference: data.reference,
                    status: data.status,
                    transaction_id: data.id,
                    amount: data.amount / 100, // Convert back to GHS
                    paid_at: data.paid_at,
                    channel: data.channel,
                    gateway_response: data.gateway_response,
                    authorization: data.authorization,
                    customer: data.customer,
                    fees: data.fees / 100,
                },
            };
        } catch (error: any) {
            console.error('Paystack verify error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Verification failed',
            };
        }
    }

    // ============================================
    // LIST BANKS (for bank transfer option)
    // ============================================
    async listBanks(): Promise<any> {
        try {
            const response = await this.client.get('/bank?country=ghana');
            return { success: true, data: response.data.data };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    // ============================================
    // VALIDATE WEBHOOK SIGNATURE
    // ============================================
    validateWebhook(body: any, signature: string): boolean {
        if (!this.webhookSecret) {
            console.warn('⚠️  Paystack webhook secret not set');
            return false;
        }

        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', this.webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');

        return hash === signature;
    }

    // ============================================
    // GENERATE UNIQUE REFERENCE
    // ============================================
    static generateReference(type: 'LISTING' | 'ESCROW' | 'VERIFY'|'BOOST'): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `MOTO-${type}-${timestamp}-${random}`;
    }

    // ============================================
    // MAP NETWORK TO PAYSTACK PROVIDER
    // ============================================
    static mapNetwork(network: string): 'mtn' | 'vod' | 'tgo' {
        const map: Record<string, 'mtn' | 'vod' | 'tgo'> = {
            MTN: 'mtn',
            Vodafone: 'vod',
            AirtelTigo: 'tgo',
        };
        return map[network] || 'mtn';
    }

    // ============================================
    // FORMAT PHONE NUMBER FOR PAYSTACK
    // ============================================
    static formatPhone(phone: string): string {
        // Remove any spaces or dashes
        let cleaned = phone.replace(/[\s-]/g, '');
        // Convert 0XX to 233XX
        if (cleaned.startsWith('0')) {
            cleaned = '233' + cleaned.substring(1);
        }
        // Add 233 if missing
        if (!cleaned.startsWith('233')) {
            cleaned = '233' + cleaned;
        }
        return cleaned;
    }
}

// Export singleton
export const paystackService = new PaystackService();
export default PaystackService;