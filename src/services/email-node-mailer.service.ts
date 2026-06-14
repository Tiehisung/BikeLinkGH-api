import nodemailer from 'nodemailer';
import { IContact } from '../models/contact.model';
import { ENV } from '../config/env.config';

// ============================================
// CONFIGURATION
// ============================================
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: ENV.SMTP_MAILER.HOST,
    port: Number(ENV.SMTP_MAILER.PORT) ,
    secure: true,
    auth: {
        user: ENV.SMTP_MAILER.AUTH_USER,
        pass: ENV.SMTP_MAILER.AUTH_PASS, //google generated app pass
    },
});

// ============================================
// VERIFY CONNECTION (Run on startup)
// ============================================
export const verifyEmailConnection = async (): Promise<boolean> => {
    try {
        await transporter.verify();
        console.log('✅ Email service ready');
        return true;
    } catch (error) {
        console.error('❌ Email service failed:', error);
        return false;
    }
};

// ============================================
// SEND CONTACT NOTIFICATION TO ADMIN
// ============================================
export const sendContactNotification = async (contact: IContact): Promise<void> => {
    const adminEmail = ENV.ADMIN_EMAIL || ENV.CONTACT_EMAIL;
    const frontendUrl = ENV.FRONTEND_URL || 'http://localhost:5173';

    const inquiryLabels: Record<string, string> = {
        buying: '🏍️ Want to Buy',
        selling: '💰 Want to Sell',
        verification: '🛡️ Verification Help',
        payment: '💳 Payment Issue',
        listing: '📝 Listing Help',
        partnership: '🤝 Partnership',
        other: '📩 Other',
    };

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
        .field { margin-bottom: 16px; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716C; font-weight: 600; margin-bottom: 4px; }
        .value { font-size: 15px; color: #1C1917; }
        .message-box { background: #F5F5F4; padding: 16px; border-radius: 12px; margin-top: 8px; white-space: pre-wrap; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
        .badge-new { background: #FEF3C7; color: #D97706; }
        .footer { background: #F5F5F4; padding: 16px 24px; border-radius: 0 0 16px 16px; text-align: center; font-size: 12px; color: #78716C; border: 1px solid #E7E5E4; border-top: none; }
        .footer a { color: #F97316; text-decoration: none; }
        .emoji { font-size: 24px; margin-right: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏍️ ${ENV.APP_NAME} - New Contact Message</h1>
        </div>
        <div class="body">
          <div class="field">
            <div class="label">Status</div>
            <span class="badge badge-new">🔴 New Message</span>
          </div>
          <div class="field">
            <div class="label">Inquiry Type</div>
            <div class="value">${inquiryLabels[contact.inquiryType] || contact.inquiryType}</div>
          </div>
          <div class="field">
            <div class="label">Full Name</div>
            <div class="value">${contact.fullName}</div>
          </div>
          <div class="field">
            <div class="label">Phone Number</div>
            <div class="value"><a href="tel:${contact.phoneNumber}">${contact.phoneNumber}</a></div>
          </div>
          ${contact.email ? `
          <div class="field">
            <div class="label">Email</div>
            <div class="value"><a href="mailto:${contact.email}">${contact.email}</a></div>
          </div>
          ` : ''}
          ${contact.message ? `
          <div class="field">
            <div class="label">Message</div>
            <div class="message-box">${contact.message}</div>
          </div>
          ` : '<div class="field"><div class="value" style="color: #78716C; font-style: italic;">No message provided</div></div>'}
        </div>
        <div class="footer">
          <p>View all messages in the <a href="${frontendUrl}/admin/contacts">Admin Dashboard</a></p>
          <p style="margin-top: 8px;">${ENV.APP_NAME} - Ghana's Trusted Motorbike Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
NEW CONTACT MESSAGE - ${ENV.APP_NAME}
=================================

Type: ${inquiryLabels[contact.inquiryType] || contact.inquiryType}
Name: ${contact.fullName}
Phone: ${contact.phoneNumber}
${contact.email ? `Email: ${contact.email}` : ''}
${contact.message ? `\nMessage:\n${contact.message}` : '\nNo message provided.'}

View in admin: ${frontendUrl}/admin/contacts
  `.trim();

    try {
        await transporter.sendMail({
            from: `"${ENV.APP_NAME}" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `📩 New ${contact.inquiryType} inquiry from ${contact.fullName}`,
            text,
            html,
        });

        console.log(`✅ Contact notification sent to ${adminEmail}`);
    } catch (error) {
        console.error('❌ Failed to send contact notification:', error);
        // Don't throw - we don't want the contact form to fail if email fails
    }
};

// ============================================
// SEND REPLY TO CUSTOMER (For admin use)
// ============================================
export const sendContactReply = async (
    contact: IContact,
    replyMessage: string
): Promise<void> => {
    if (!contact.email) {
        console.warn('Cannot send reply - no email provided');
        return;
    }

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
        .footer { background: #F5F5F4; padding: 16px 24px; border-radius: 0 0 16px 16px; text-align: center; font-size: 12px; color: #78716C; border: 1px solid #E7E5E4; border-top: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏍️ ${ENV.APP_NAME} - Reply to Your Inquiry</h1>
        </div>
        <div class="body">
          <p>Hello ${contact.fullName},</p>
          <p>Thank you for contacting ${ENV.APP_NAME}. Here is our response to your inquiry:</p>
          <div style="background: #F5F5F4; padding: 16px; border-radius: 12px; margin: 16px 0; white-space: pre-wrap;">
            ${replyMessage}
          </div>
          <p>If you have any further questions, feel free to reply to this email or call us.</p>
        </div>
        <div class="footer">
          <p>${ENV.APP_NAME} - Ghana's Trusted Motorbike Marketplace</p>
          <p>Wa, Upper West Region</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        await transporter.sendMail({
            from: `"${ENV.APP_NAME} Support" <${process.env.SMTP_USER}>`,
            to: contact.email,
            subject: `Re: Your ${contact.inquiryType} inquiry - ${ENV.APP_NAME}`,
            html,
        });

        console.log(`✅ Reply sent to ${contact.email}`);
    } catch (error) {
        console.error('❌ Failed to send reply:', error);
        throw error;
    }
};