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

  async sendReminderNotificationEmail(data: {
    toEmail: string;
    name: string;
    documentName: string;
    documentId: string;
    reminderTitle: string;
    dueDate: Date;
    notes?: string | null;
  }): Promise<boolean> {
    try {
      if (!this.transporter && config.email.user && config.email.pass) {
        this.initTransporter();
      }

      const formattedDate = new Date(data.dueDate).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const docLink = `${config.frontendUrl}/documents/${data.documentId}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Legal Deadline Reminder</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #b45309 0%, #ea580c 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 0; font-size: 13px; color: #fef3c7; font-weight: 500; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
            .desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
            .alert-card { background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .detail-row { margin-bottom: 10px; font-size: 13px; color: #334155; }
            .detail-row:last-child { margin-bottom: 0; }
            .detail-label { font-weight: 700; color: #0f172a; display: inline-block; width: 110px; }
            .detail-value { font-weight: 600; color: #b45309; }
            .btn-wrap { text-align: center; margin: 28px 0 16px 0; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; }
            .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Legal Deadline Reminder</h1>
              <p>"Do Not Sign Before Reviewing the Document"</p>
            </div>
            <div class="content">
              <div class="greeting">Hello ${data.name || 'User'},</div>
              <div class="desc">
                This is an automated deadline alert regarding your legal document tracked in <strong>LegalAI</strong>. A critical contractual milestone or due date has arrived:
              </div>
              
              <div class="alert-card">
                <div class="detail-row">
                  <span class="detail-label">Event / Action:</span>
                  <span class="detail-value" style="font-size: 14px; color: #991b1b;">${data.reminderTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Due Date:</span>
                  <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Document:</span>
                  <span style="font-weight: 600; color: #1e293b;">${data.documentName}</span>
                </div>
                ${
                  data.notes
                    ? `<div class="detail-row">
                        <span class="detail-label">Notes:</span>
                        <span style="color: #475569;">${data.notes}</span>
                      </div>`
                    : ''
                }
              </div>

              <div class="btn-wrap">
                <a href="${docLink}" class="btn">View Document Analysis &rarr;</a>
              </div>

              <div class="warning">
                IMPORTANT: Review contractual terms before the deadline expires to prevent breach of contract, forfeit of security deposit, or automatic renewal penalties.
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} LegalAI Platform &bull; Automated Document Intelligence
            </div>
          </div>
        </body>
        </html>
      `;

      if (this.transporter) {
        await this.transporter.sendMail({
          from: config.email.from,
          to: data.toEmail,
          subject: `⏰ [Action Required] LegalAI Deadline Reminder: ${data.reminderTitle}`,
          text: `LegalAI Deadline Alert: ${data.reminderTitle} for document "${data.documentName}" is due on ${formattedDate}. Notes: ${data.notes || 'None'}. Review document at: ${docLink}`,
          html: htmlContent,
        });
        logger.info(`[EmailService] Reminder notification email sent to ${data.toEmail} for reminder "${data.reminderTitle}"`);
        return true;
      } else {
        logger.info(`[EmailService - DEV SIMULATION] Reminder notification for ${data.toEmail}: [${data.reminderTitle}] due ${formattedDate}`);
        return true;
      }
    } catch (err: any) {
      logger.error(`[EmailService] Failed to send reminder email to ${data.toEmail}: ${err.message}`);
      throw err;
    }
  }
}

export const emailService = new EmailService();
