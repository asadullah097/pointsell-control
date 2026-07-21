import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface WelcomeEmailParams {
  to: string;
  businessName: string;
  loginUrl: string;
  email: string;
  password: string;
  trialEndsAt: Date | null;
  planName?: string | null;
}

export interface RejectionEmailParams {
  to: string;
  businessName: string;
  reason?: string;
}

/**
 * SMTP mailer for tenant-facing transactional email (welcome / rejection).
 *
 * Falls back to logging the rendered email instead of throwing when SMTP_*
 * env vars aren't set — same "no-op when unconfigured" pattern as PosApiClient,
 * so local/dev environments and CI never need real SMTP credentials to boot.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from = this.config.get<string>('SMTP_FROM') ?? 'PointSell <no-reply@pointsell.app>';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn('SMTP_HOST/PORT/USER/PASS not fully configured — emails will be logged, not sent.');
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
    const trialLine = params.trialEndsAt
      ? `<p>Your free trial is active until <strong>${params.trialEndsAt.toDateString()}</strong>.</p>`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
        <h2 style="color:#0e7c66">Welcome to PointSell, ${escapeHtml(params.businessName)}!</h2>
        <p>Your account request has been approved${params.planName ? ` for the <strong>${escapeHtml(params.planName)}</strong> plan` : ''}. Here are your login details:</p>
        <table style="margin:16px 0;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Email</td><td style="padding:4px 0;font-weight:600">${escapeHtml(params.email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Temporary password</td><td style="padding:4px 0;font-weight:600;font-family:monospace">${escapeHtml(params.password)}</td></tr>
        </table>
        ${trialLine}
        <p style="margin:24px 0">
          <a href="${params.loginUrl}" style="background:#0e7c66;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Log in to PointSell</a>
        </p>
        <p style="color:#6b7280;font-size:13px">For security, please change your password after your first login.</p>
      </div>`;

    await this.send({
      to: params.to,
      subject: 'Welcome to PointSell — your account is ready',
      html,
    });
  }

  async sendRejectionEmail(params: RejectionEmailParams): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
        <h2>About your PointSell request</h2>
        <p>Thanks for your interest, ${escapeHtml(params.businessName)}. We're unable to set up your account at this time${params.reason ? `: ${escapeHtml(params.reason)}` : '.'}</p>
        <p>If you have questions, just reply to this email.</p>
      </div>`;

    await this.send({
      to: params.to,
      subject: 'About your PointSell request',
      html,
    });
  }

  private async send(mail: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[dev email] to=${mail.to} subject="${mail.subject}"\n${mail.html}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, ...mail });
    } catch (err) {
      this.logger.error(`Failed to send email to ${mail.to}: ${(err as Error).message}`);
      throw err;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
