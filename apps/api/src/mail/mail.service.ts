import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmailTemplateKind = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export interface DevOutboxMessage {
  id: string;
  to: string;
  subject: string;
  template: EmailTemplateKind;
  actionUrl: string;
  token: string;
  expiresAt: string;
  sentAt: string;
}

export interface EmailDispatchResult {
  delivered: boolean;
  mode: 'dev_outbox' | 'smtp' | 'disabled';
  warning?: string;
}

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  private getDeliveryMode(): 'dev_outbox' | 'smtp' | 'disabled' {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const configured = this.configService.get<'dev_outbox' | 'smtp' | 'disabled'>(
      'EMAIL_DELIVERY_MODE',
      'dev_outbox',
    );
    if (nodeEnv === 'production' && configured === 'dev_outbox') {
      throw new Error('Development email outbox (dev_outbox) cannot be used in production.');
    }
    return configured;
  }

  public getOutboxDir(): string {
    const rel = this.configService.get<string>('EMAIL_DEV_OUTBOX_DIR', '.dev-mailbox');
    if (path.isAbsolute(rel)) {
      return rel;
    }
    const workspaceRoot =
      fs.existsSync(path.resolve(process.cwd(), 'package.json')) &&
      fs.existsSync(path.resolve(process.cwd(), 'prisma'))
        ? process.cwd()
        : path.resolve(process.cwd(), '../..');
    return path.join(workspaceRoot, rel);
  }

  async sendVerificationEmail(params: {
    to: string;
    fullName: string;
    rawToken: string;
    expiresAt: Date;
  }): Promise<EmailDispatchResult> {
    const webUrl = this.configService
      .get<string>('WEB_URL', 'http://localhost:5173')
      .replace(/\/+$/, '');
    const actionUrl = `${webUrl}/verify-email?token=${encodeURIComponent(params.rawToken)}`;

    return this.dispatch({
      to: params.to,
      subject: 'Verify your PDSChain v2 account email address',
      template: 'EMAIL_VERIFICATION',
      actionUrl,
      token: params.rawToken,
      expiresAt: params.expiresAt,
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    fullName: string;
    rawToken: string;
    expiresAt: Date;
  }): Promise<EmailDispatchResult> {
    const webUrl = this.configService
      .get<string>('WEB_URL', 'http://localhost:5173')
      .replace(/\/+$/, '');
    const actionUrl = `${webUrl}/reset-password?token=${encodeURIComponent(params.rawToken)}`;

    return this.dispatch({
      to: params.to,
      subject: 'PDSChain v2 password reset instructions',
      template: 'PASSWORD_RESET',
      actionUrl,
      token: params.rawToken,
      expiresAt: params.expiresAt,
    });
  }

  private async dispatch(params: {
    to: string;
    subject: string;
    template: EmailTemplateKind;
    actionUrl: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailDispatchResult> {
    const mode = this.getDeliveryMode();

    if (mode === 'disabled') {
      return {
        delivered: false,
        mode: 'disabled',
        warning:
          'Email delivery is currently disabled in environment configuration (EMAIL_DELIVERY_MODE=disabled).',
      };
    }

    if (mode === 'smtp') {
      const smtpHost = this.configService.get<string>('SMTP_HOST', '');
      if (!smtpHost) {
        return {
          delivered: false,
          mode: 'smtp',
          warning: 'SMTP_HOST is not configured; email could not be dispatched.',
        };
      }
      // Note: External SMTP transport is not configured with third-party credentials in Phase 2.
      return {
        delivered: false,
        mode: 'smtp',
        warning: 'External SMTP transport requires an active relay server.',
      };
    }

    // Development outbox catcher (.dev-mailbox/)
    const outboxDir = this.getOutboxDir();
    fs.mkdirSync(outboxDir, { recursive: true });

    const message: DevOutboxMessage = {
      id: randomUUID(),
      to: params.to.toLowerCase().trim(),
      subject: params.subject,
      template: params.template,
      actionUrl: params.actionUrl,
      token: params.token,
      expiresAt: params.expiresAt.toISOString(),
      sentAt: new Date().toISOString(),
    };

    const safeRecipientFile = message.to.replace(/[^a-z0-9._@-]/gi, '_');
    const recipientFilePath = path.join(outboxDir, `${safeRecipientFile}.json`);

    let existingMessages: DevOutboxMessage[] = [];
    if (fs.existsSync(recipientFilePath)) {
      try {
        existingMessages = JSON.parse(
          fs.readFileSync(recipientFilePath, 'utf-8'),
        ) as DevOutboxMessage[];
      } catch {
        existingMessages = [];
      }
    }
    existingMessages.push(message);
    fs.writeFileSync(recipientFilePath, JSON.stringify(existingMessages, null, 2) + '\n', 'utf-8');

    return {
      delivered: true,
      mode: 'dev_outbox',
    };
  }

  /**
   * Helper for local development & automated testing only (never enabled in production).
   */
  readDevOutboxForRecipient(email: string): DevOutboxMessage[] {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      throw new Error('Development outbox inspection is prohibited in production.');
    }
    const outboxDir = this.getOutboxDir();
    const normalized = email.toLowerCase().trim();
    const safeRecipientFile = normalized.replace(/[^a-z0-9._@-]/gi, '_');
    const recipientFilePath = path.join(outboxDir, `${safeRecipientFile}.json`);
    if (!fs.existsSync(recipientFilePath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(recipientFilePath, 'utf-8')) as DevOutboxMessage[];
    } catch {
      return [];
    }
  }
}
