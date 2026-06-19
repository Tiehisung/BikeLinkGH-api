import nodemailer from 'nodemailer';
import { ENV } from '../../config/env.config';

// ============================================
// CONFIGURATION
// ============================================
export const nodeMailerTransporter = nodemailer.createTransport({
  service: "gmail",
  host: ENV.SMTP_MAILER.HOST,
  port: Number(ENV.SMTP_MAILER.PORT),
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
    await nodeMailerTransporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service failed:', error);
    return false;
  }
};