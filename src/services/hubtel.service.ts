import axios from 'axios';

 
export interface IHubtelPaymentRequest {
    customerName: string;
    customerMsisdn: string;    // Phone number: 23324XXXXXXX
    customerEmail?: string;
    channel: 'mtn-gh' | 'vodafone-gh' | 'tigo-gh';
    amount: number;
    primaryCallbackUrl: string;
    secondaryCallbackUrl?: string;
    description: string;
    clientReference: string;    // Your unique ID
}

export interface HubtelPaymentResponse {
    success: boolean;
    transactionId?: string;
    message?: string;
    status: 'pending' | 'completed' | 'failed';
}

// ============================================
// HUBTEL CLIENT
// ============================================
class HubtelService {
    private clientId: string;
    private clientSecret: string;
    private merchantId: string;
    private baseUrl: string;
    private authToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        this.clientId = process.env.HUBTEL_CLIENT_ID || '';
        this.clientSecret = process.env.HUBTEL_CLIENT_SECRET || '';
        this.merchantId = process.env.HUBTEL_MERCHANT_ID || '';
        this.baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://api.hubtel.com/v1'
            : 'https://sandbox.hubtel.com/v1';
    }

    // Get auth token
    private async getToken(): Promise<string> {
        if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.authToken;
        }

        const response = await axios.post(
            `${this.baseUrl}/auth/token`,
            {
                clientId: this.clientId,
                clientSecret: this.clientSecret,
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        this.authToken = response.data.accessToken;
        this.tokenExpiry = new Date(Date.now() + response.data.expiresIn * 1000);
        return this.authToken!;
    }

    // Receive MoMo payment
    async receiveMobileMoney(params: IHubtelPaymentRequest): Promise<HubtelPaymentResponse> {
        try {
            const token = await this.getToken();

            const response = await axios.post(
                `${this.baseUrl}/merchantaccount/merchants/${this.merchantId}/receive/mobilemoney`,
                {
                    CustomerName: params.customerName,
                    CustomerMsisdn: params.customerMsisdn,
                    CustomerEmail: params.customerEmail || '',
                    Channel: params.channel,
                    Amount: params.amount,
                    PrimaryCallbackUrl: params.primaryCallbackUrl,
                    SecondaryCallbackUrl: params.secondaryCallbackUrl || params.primaryCallbackUrl,
                    Description: params.description,
                    ClientReference: params.clientReference,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                success: true,
                transactionId: response.data.TransactionId,
                status: 'pending',
            };
        } catch (error: any) {
            console.error('Hubtel payment error:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Payment failed',
                status: 'failed',
            };
        }
    }

    // Check payment status
    async checkPaymentStatus(transactionId: string): Promise<HubtelPaymentResponse> {
        try {
            const token = await this.getToken();

            const response = await axios.get(
                `${this.baseUrl}/merchantaccount/merchants/${this.merchantId}/transactions/${transactionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            return {
                success: true,
                transactionId: response.data.TransactionId,
                status: response.data.Status === 'Success' ? 'completed' : 'pending',
            };
        } catch (error) {
            return { success: false, status: 'failed', message: 'Failed to check status' };
        }
    }
}

export const hubtelService = new HubtelService();