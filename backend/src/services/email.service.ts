import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../config/logger';

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (config.email.user && config.email.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      logger.info(`[EmailService] Nodemailer transporter initialized with user: ${config.email.user}`);
    } else {
      logger.warn(`[EmailService] SMTP credentials incomplete (user: ${config.email.user}, pass: ${config.email.pass ? 'set' : 'NOT SET'}). Email sending in sandbox/log mode.`);
    }
  }

  async sendOtpEmail(toEmail: string, otpCode: string, name: string): Promise<boolean> {
    try {
      // Re-init transporter if pass became available dynamically
      if (!this.transporter && config.email.user && config.email.pass) {
        this.initTransporter();
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>LegalAI Account Verification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 0; font-size: 13px; color: #bfdbfe; font-weight: 500; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
            .otp-box { background: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; margin: 0; }
            .otp-expiry { font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 500; }
            .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LegalAI</h1>
              <p>"Do Not Sign Before Reviewing the Document"</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${name || 'User'},</div>
              <div class="desc">
                Welcome to <strong>LegalAI</strong>! To complete your account registration and verify your email address, please enter the following 6-digit verification code:
              </div>
              
              <div class="otp-box">
                <div class="otp-code">${otpCode}</div>
                <div class="otp-expiry">Valid for 10 minutes only</div>
              </div>

              <div class="desc" style="font-size: 13px; color: #64748b;">
                Enter this code in your registration screen to activate your account and start analyzing legal documents safely.
              </div>

              <div class="warning">
                If you did not request this verification code, you can safely ignore this email. No account will be created without this verification code.
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} LegalAI Platform. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;

      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.email.from,
          to: toEmail,
          subject: `${otpCode} is your LegalAI verification code`,
          text: `Your LegalAI verification code is: ${otpCode}. It is valid for 10 minutes.`,
          html: htmlContent,
        });
        logger.info(`[EmailService] Verification OTP successfully sent to ${toEmail}`);
        return true;
      } else {
        logger.info(`[EmailService - DEV SIMULATION] Verification OTP for ${toEmail}: [${otpCode}]`);
        return true;
      }
    } catch (err: any) {
      logger.error(`[EmailService] Failed to send email to ${toEmail}: ${err.message}`);
      throw err;
    }
  }
}

export const emailService = new EmailService();
