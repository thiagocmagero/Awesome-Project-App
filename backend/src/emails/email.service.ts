import * as React from 'react';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { readAppUrl, readSmtpEnv, type SmtpEnv } from './email.config';
import {
  CommentMentionEmail,
  type CommentMentionEmailProps,
} from './templates/comment-mention.email';

/**
 * Estado actual do transporter SMTP — usado pelo endpoint
 * `GET /platform-config/email/smtp-status` para o banner do EmailSettingsPage.
 */
export interface EmailServiceStatus {
  ready: boolean;
  host: string | null;
  port: number | null;
  /** Variáveis em falta (ex.: `['SMTP_PASSWORD']`). Vazio se ready. */
  missing: string[];
}

interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Service responsável por enviar emails transacionais via SMTP da Brevo.
 *
 * Filosofia:
 * - Secrets em env vars (`SMTP_*`), nunca em BD.
 * - Metadados editáveis (enabled / fromEmail / fromName) vivem em `EmailConfig`
 *   da Postgres (singleton id=1).
 * - Falhas são logadas mas **nunca** propagadas — todos os callers são
 *   fire-and-forget.
 * - O transporter é um singleton lazy (criado na primeira chamada).
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private smtpEnv: SmtpEnv | null = null;
  private missingEnv: string[] = [];
  private readonly appUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.appUrl = readAppUrl();
  }

  onModuleInit() {
    const { env, missing } = readSmtpEnv();
    this.smtpEnv = env;
    this.missingEnv = missing;

    if (!env) {
      this.logger.warn(
        `SMTP env vars missing — emails disabled (missing: ${missing.join(', ')})`,
      );
      return;
    }

    // Lazy-create do transporter no primeiro envio para evitar handshake
    // desnecessário quando a app boot-a sem nunca enviar email.
    this.logger.log(
      `SMTP transporter ready (${env.host}:${env.port}) — created lazily on first send`,
    );
  }

  /** Estado do transporter para o controller `GET /platform-config/email/smtp-status`. */
  getStatus(): EmailServiceStatus {
    if (!this.smtpEnv) {
      return { ready: false, host: null, port: null, missing: this.missingEnv };
    }
    return {
      ready: true,
      host: this.smtpEnv.host,
      port: this.smtpEnv.port,
      missing: [],
    };
  }

  /** Singleton lazy — devolve `null` se as env vars não estiverem completas. */
  private getTransporter(): Transporter | null {
    if (!this.smtpEnv) return null;
    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host: this.smtpEnv.host,
      port: this.smtpEnv.port,
      // 465 → TLS implícito; 587 → STARTTLS (negociado)
      secure: this.smtpEnv.port === 465,
      auth: {
        user: this.smtpEnv.username,
        pass: this.smtpEnv.password,
      },
    });
    return this.transporter;
  }

  /**
   * Envia o email de menção. Não throws — chamadores são fire-and-forget.
   * Devolve `void`; sucesso/falha vai para o logger.
   */
  async sendMentionEmail(input: {
    recipientEmail: string;
    recipientName: string;
    actorName: string;
    projectName: string;
    contextName: string;
    excerpt: string;
    commentUrl: string;
  }): Promise<void> {
    try {
      // 1) Carregar metadados (enabled/fromEmail/fromName) da BD
      const config = await this.prisma.emailConfig.findUnique({
        where: { id: 1 },
        select: { enabled: true, fromEmail: true, fromName: true },
      });

      if (!config?.enabled) {
        this.logger.debug(
          `sendMentionEmail skipped: EmailConfig.enabled=false`,
        );
        return;
      }
      if (!config.fromEmail) {
        this.logger.warn(
          `sendMentionEmail skipped: EmailConfig.fromEmail not set`,
        );
        return;
      }

      // 2) Verificar transporter
      const transporter = this.getTransporter();
      if (!transporter) {
        this.logger.warn(
          `sendMentionEmail skipped: SMTP env vars missing (${this.missingEnv.join(', ')})`,
        );
        return;
      }

      // 3) Render do template (HTML + plain text)
      const props: CommentMentionEmailProps = {
        recipientName: input.recipientName,
        actorName: input.actorName,
        projectName: input.projectName,
        contextName: input.contextName,
        excerpt: input.excerpt,
        commentUrl: input.commentUrl,
        appUrl: this.appUrl,
      };
      const element = React.createElement(CommentMentionEmail, props);
      const html = await render(element);
      const text = await render(element, { plainText: true });

      // 4) Build do "From" header
      const from = config.fromName
        ? `"${config.fromName}" <${config.fromEmail}>`
        : config.fromEmail;

      // 5) Enviar
      const info = await transporter.sendMail({
        from,
        to: input.recipientEmail,
        subject: `${input.actorName} mencionou-te em ${input.contextName}`,
        html,
        text,
      });

      this.logger.log(
        `MENTION email sent to ${input.recipientEmail} (messageId=${info.messageId})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`sendMentionEmail failed: ${msg}`);
    }
  }
}
