import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { Env } from '../config/env.validation';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends account emails through AWS SES when MAIL_FROM is set (always in
 * production). Otherwise writes them to the log, so the verification link can
 * be clicked during local development.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from?: string;
  private readonly ses?: SESv2Client;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    // Region and credentials come from the ECS task (AWS_REGION, task role)
    if (this.from) this.ses = new SESv2Client({});
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.ses || !this.from) {
      this.logger.log(
        `Email to ${message.to}: ${message.subject}\n${message.text}`,
      );
      return;
    }

    await this.ses.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: message.text, Charset: 'UTF-8' },
              Html: { Data: message.html, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
  }
}
