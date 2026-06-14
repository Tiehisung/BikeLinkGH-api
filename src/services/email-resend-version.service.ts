import { Resend } from 'resend';
import { IContact } from '../models/contact.model';
import { ENV } from '../config/env.config';

// RESEND VERSION
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendContactNotification = async (contact: IContact): Promise<void> => {
    const adminEmail = ENV.ADMIN_EMAIL

    try {
        await resend.emails.send({
            from: `${ENV.APP_NAME} <${ENV.ADMIN_EMAIL}>`,
            to: adminEmail!,
            subject: `📩 New ${contact.inquiryType} inquiry from ${contact.fullName}`,
            html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${contact.fullName}</p>
        <p><strong>Phone:</strong> ${contact.phoneNumber}</p>
        ${contact.email ? `<p><strong>Email:</strong> ${contact.email}</p>` : ''}
        <p><strong>Type:</strong> ${contact.inquiryType}</p>
        ${contact.message ? `<p><strong>Message:</strong><br>${contact.message}</p>` : ''}
      `,
        });

        console.log('✅ Notification sent');
    } catch (error) {
        console.error('❌ Failed to send:', error);
    }
};