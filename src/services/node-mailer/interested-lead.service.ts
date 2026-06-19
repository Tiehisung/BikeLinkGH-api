// ============================================
// SEND NEW LEAD NOTIFICATION TO SELLER (Email)

import { nodeMailerTransporter } from "./_index";
import { ENV } from "../../config/env.config";

// ============================================
export const sendNewLeadEmail = async (data: {
  sellerEmail: string;
  sellerName: string;
  buyerName: string;
  buyerPhone: string;
  bikeTitle: string;
  bikePrice: number;
  listingUrl: string;
}): Promise<void> => {
  const frontendUrl = ENV.FRONTEND_URL

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1C1917; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F97316; color: white; padding: 24px; border-radius: 16px 16px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; }
        .body { background: #FAFAF9; padding: 24px; border: 1px solid #E7E5E4; }
        .highlight { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .cta { display: inline-block; background: #F97316; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { background: #F5F5F4; padding: 16px 24px; border-radius: 0 0 16px 16px; text-align: center; font-size: 12px; color: #78716C; border: 1px solid #E7E5E4; border-top: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏍️ New Buyer Lead!</h1>
        </div>
        <div class="body">
          <p>Hello ${data.sellerName},</p>
          <p>Someone is interested in your motorbike!</p>
          <div class="highlight">
            <p><strong>Buyer:</strong> ${data.buyerName}</p>
            <p><strong>Phone:</strong> <a href="tel:${data.buyerPhone}">${data.buyerPhone}</a></p>
            <p><strong>Bike:</strong> ${data.bikeTitle}</p>
            <p><strong>Price:</strong> GHS ${data.bikePrice.toLocaleString()}</p>
          </div>
          <p>Call the buyer directly to arrange a meeting and close the deal.</p>
          <a href="${frontendUrl}/dashboard/leads" class="cta">View in Dashboard</a>
          <p style="margin-top: 16px; font-size: 14px; color: #78716C;">
            Tip: Respond quickly — buyers often contact multiple sellers.
          </p>
        </div>
        <div class="footer">
          <p>MotoMartGH - Ghana's Trusted Motorbike Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await nodeMailerTransporter.sendMail({
      from: `"${ENV.APP_NAME}" <${ENV.ADMIN_EMAIL}>`,
      to: data.sellerEmail,
      subject: `🏍️ New buyer interested in your ${data.bikeTitle}!`,
      html,
    });
    console.log(`✅ Lead email sent to ${data.sellerEmail}`);
  } catch (error) {
    console.error('❌ Failed to send lead email:', error);
  }
};