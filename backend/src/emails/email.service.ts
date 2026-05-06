import * as React from 'react';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { I18nService } from '../i18n/i18n.service';
import { readAppUrl, readSmtpEnv, type SmtpEnv } from './email.config';
import {
  CommentMentionEmail,
  type CommentMentionEmailProps,
} from './templates/comment-mention.email';
import {
  TaskAssignedEmail,
  type TaskAssignedEmailProps,
} from './templates/task-assigned.email';
import {
  InvitationReceivedEmail,
  type InvitationReceivedEmailProps,
} from './templates/invitation-received.email';
import {
  InvitationAcceptedEmail,
  type InvitationAcceptedEmailProps,
} from './templates/invitation-accepted.email';
import {
  InvitationDeclinedEmail,
  type InvitationDeclinedEmailProps,
} from './templates/invitation-declined.email';
import {
  CommentReactionEmail,
  type CommentReactionEmailProps,
} from './templates/comment-reaction.email';
import {
  TimesheetSubmittedEmail,
  type TimesheetSubmittedEmailProps,
} from './templates/timesheet-submitted.email';
import {
  TimesheetApprovedEmail,
  type TimesheetApprovedEmailProps,
} from './templates/timesheet-approved.email';
import {
  TimesheetPartiallyApprovedEmail,
  type TimesheetPartiallyApprovedEmailProps,
} from './templates/timesheet-partially-approved.email';
import {
  TimesheetRejectedEmail,
  type TimesheetRejectedEmailProps,
} from './templates/timesheet-rejected.email';
import type { CommonEmailTexts } from './templates/components/EmailLayout';

/** Locale fallback usado quando o user.locale é null ou não tem traduções. */
const FALLBACK_LOCALE = 'en';

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
 * - Locale: cada `sendXxxEmail` recebe o `locale` do destinatário (vem de
 *   `User.locale`). As strings são resolvidas via `I18nService.getNamespace`
 *   no namespace `email`. Fallback chain: `<locale>` → `'en'` → empty string.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private smtpEnv: SmtpEnv | null = null;
  private missingEnv: string[] = [];
  readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
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
      secure: this.smtpEnv.port === 465,
      auth: {
        user: this.smtpEnv.username,
        pass: this.smtpEnv.password,
      },
    });
    return this.transporter;
  }

  // ─── i18n helpers ────────────────────────────────────────────────────────────

  /**
   * Carrega o namespace `email` para o locale + 'en' (fallback). Funde os
   * dois bundles num único objecto plano (key dot-notation → string), com o
   * locale principal a sobrepor-se ao 'en'.
   *
   * Output exemplo: `{ 'common.greeting': 'Hi {{recipientName}},', 'mention.subject': '...', ... }`.
   */
  private async loadEmailBundle(locale: string | null): Promise<Record<string, string>> {
    const code = locale && locale !== FALLBACK_LOCALE ? locale : null;

    const [primaryNested, fallbackNested] = await Promise.all([
      code ? this.i18n.getNamespace(code, 'email').catch(() => null) : Promise.resolve(null),
      this.i18n.getNamespace(FALLBACK_LOCALE, 'email').catch(() => null),
    ]);

    const flat: Record<string, string> = {};
    this.collectKeys(fallbackNested, '', flat);   // fallback first
    if (primaryNested) this.collectKeys(primaryNested, '', flat); // primary overrides
    return flat;
  }

  /** Recurse num objecto nested (resultado do `getNamespace`) e colapsa em flat dot-notation. */
  private collectKeys(
    obj: unknown,
    prefix: string,
    out: Record<string, string>,
  ): void {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        out[key] = v;
      } else if (typeof v === 'object' && v !== null) {
        this.collectKeys(v, key, out);
      }
    }
  }

  /**
   * Substitui placeholders `{{var}}` pelo valor correspondente em `vars`.
   * Variável em falta vira string vazia (defensivo, evita "undefined" no email).
   */
  private interpolate(str: string, vars: Record<string, string | number>): string {
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = vars[k];
      return v == null ? '' : String(v);
    });
  }

  /** Resolve a chave do bundle e interpola variáveis. Empty string se chave falta. */
  private t(
    bundle: Record<string, string>,
    key: string,
    vars: Record<string, string | number> = {},
  ): string {
    return this.interpolate(bundle[key] ?? '', vars);
  }

  /** Constrói o objecto `CommonEmailTexts` partilhado por todos os templates. */
  private buildCommon(
    bundle: Record<string, string>,
    vars: Record<string, string | number>,
  ): CommonEmailTexts {
    const prefsUrl = `${this.appUrl}/settings/notifications`;
    return {
      greeting: this.t(bundle, 'common.greeting', vars),
      footer_text: this.t(bundle, 'common.footer_text', vars),
      footer_pref_link: bundle['common.footer_pref_link'] ?? 'Manage preferences',
      hint_link_intro: bundle['common.hint_link_intro'] ?? '',
      copyright: this.t(bundle, 'common.copyright', { ...vars, year: new Date().getFullYear() }),
      prefsUrl,
    };
  }

  // ─── Send pipeline ───────────────────────────────────────────────────────────

  /**
   * Helper privado que centraliza o pipeline de envio:
   *  1. Lê EmailConfig (enabled + fromEmail + fromName) da BD
   *  2. Verifica transporter
   *  3. Renderiza HTML + plain text do template React
   *  4. Envia via nodemailer
   *  5. Logs success/failure (nunca throws — caller é fire-and-forget).
   */
  private async renderAndSend(input: {
    to: string;
    subject: string;
    element: React.ReactElement;
    kind: string;
    locale: string;
  }): Promise<void> {
    try {
      const config = await this.prisma.emailConfig.findUnique({
        where: { id: 1 },
        select: { enabled: true, fromEmail: true, fromName: true },
      });

      if (!config?.enabled) {
        this.logger.debug(`${input.kind} skipped: EmailConfig.enabled=false`);
        return;
      }
      if (!config.fromEmail) {
        this.logger.warn(`${input.kind} skipped: EmailConfig.fromEmail not set`);
        return;
      }

      const transporter = this.getTransporter();
      if (!transporter) {
        this.logger.warn(
          `${input.kind} skipped: SMTP env vars missing (${this.missingEnv.join(', ')})`,
        );
        return;
      }

      const html = await render(input.element);
      const text = await render(input.element, { plainText: true });

      const from = config.fromName
        ? `"${config.fromName}" <${config.fromEmail}>`
        : config.fromEmail;

      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html,
        text,
      });

      this.logger.log(
        `${input.kind} email sent to ${input.to} [${input.locale}] (messageId=${info.messageId})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`${input.kind} send failed: ${msg}`);
    }
  }

  // ─── 1. MENTION ──────────────────────────────────────────────────────────────

  async sendMentionEmail(input: {
    recipientEmail: string;
    recipientName: string;
    actorName: string;
    projectName: string;
    contextName: string;
    excerpt: string;
    commentUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.actorName,
      projectName: input.projectName,
      contextName: input.contextName,
    };
    const subject = this.t(bundle, 'mention.subject', vars);

    const props: CommentMentionEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'mention.body_p1', vars),
      cta_label: bundle['mention.cta'] ?? 'View comment',
      excerpt: input.excerpt,
      commentUrl: input.commentUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(CommentMentionEmail, props),
      kind: 'MENTION',
      locale: localeUsed,
    });
  }

  // ─── 2. TASK_ASSIGNED ────────────────────────────────────────────────────────

  async sendTaskAssignedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    actorName: string;
    projectName: string;
    taskName: string;
    taskUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.actorName,
      projectName: input.projectName,
      taskName: input.taskName,
    };
    const subject = this.t(bundle, 'task_assigned.subject', vars);

    const props: TaskAssignedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'task_assigned.body_p1', vars),
      cta_label: bundle['task_assigned.cta'] ?? 'View task',
      taskUrl: input.taskUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(TaskAssignedEmail, props),
      kind: 'TASK_ASSIGNED',
      locale: localeUsed,
    });
  }

  // ─── 3. INVITATION_RECEIVED ──────────────────────────────────────────────────

  async sendInvitationReceivedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    inviterName: string;
    projectName: string;
    inviteUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.inviterName,
      projectName: input.projectName,
    };
    const subject = this.t(bundle, 'invitation_received.subject', vars);

    const props: InvitationReceivedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'invitation_received.body_p1', vars),
      body_p2: this.t(bundle, 'invitation_received.body_p2', vars),
      cta_label: bundle['invitation_received.cta'] ?? 'View invitation',
      inviteUrl: input.inviteUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(InvitationReceivedEmail, props),
      kind: 'INVITATION_RECEIVED',
      locale: localeUsed,
    });
  }

  // ─── 4. INVITATION_ACCEPTED ──────────────────────────────────────────────────

  async sendInvitationAcceptedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    inviteeName: string;
    projectName: string;
    projectUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.inviteeName,
      projectName: input.projectName,
    };
    const subject = this.t(bundle, 'invitation_accepted.subject', vars);

    const props: InvitationAcceptedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'invitation_accepted.body_p1', vars),
      cta_label: bundle['invitation_accepted.cta'] ?? 'View project',
      projectUrl: input.projectUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(InvitationAcceptedEmail, props),
      kind: 'INVITATION_ACCEPTED',
      locale: localeUsed,
    });
  }

  // ─── 5. INVITATION_DECLINED ──────────────────────────────────────────────────

  async sendInvitationDeclinedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    inviteeName: string;
    projectName: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.inviteeName,
      projectName: input.projectName,
    };
    const subject = this.t(bundle, 'invitation_declined.subject', vars);

    const props: InvitationDeclinedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'invitation_declined.body_p1', vars),
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(InvitationDeclinedEmail, props),
      kind: 'INVITATION_DECLINED',
      locale: localeUsed,
    });
  }

  // ─── 6. COMMENT_REACTION ─────────────────────────────────────────────────────

  async sendCommentReactionEmail(input: {
    recipientEmail: string;
    recipientName: string;
    actorName: string;
    emoji: string;
    projectName: string;
    contextName: string;
    commentUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.actorName,
      emoji: input.emoji,
      projectName: input.projectName,
      contextName: input.contextName,
    };
    const subject = this.t(bundle, 'comment_reaction.subject', vars);

    const props: CommentReactionEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'comment_reaction.body_p1', vars),
      cta_label: bundle['comment_reaction.cta'] ?? 'View comment',
      commentUrl: input.commentUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(CommentReactionEmail, props),
      kind: 'COMMENT_REACTION',
      locale: localeUsed,
    });
  }

  // ─── 7. TIMESHEET_SUBMITTED ──────────────────────────────────────────────────

  async sendTimesheetSubmittedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    submitterName: string;
    projectName: string;
    weekStart: string;
    timesheetUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.submitterName,
      projectName: input.projectName,
      weekStart: input.weekStart,
    };
    const subject = this.t(bundle, 'timesheet_submitted.subject', vars);

    const props: TimesheetSubmittedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'timesheet_submitted.body_p1', vars),
      cta_label: bundle['timesheet_submitted.cta'] ?? 'Review timesheet',
      timesheetUrl: input.timesheetUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(TimesheetSubmittedEmail, props),
      kind: 'TIMESHEET_SUBMITTED',
      locale: localeUsed,
    });
  }

  // ─── 8. TIMESHEET_APPROVED ───────────────────────────────────────────────────

  async sendTimesheetApprovedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    approverName: string;
    projectName: string;
    weekStart: string;
    timesheetUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.approverName,
      projectName: input.projectName,
      weekStart: input.weekStart,
    };
    const subject = this.t(bundle, 'timesheet_approved.subject', vars);

    const props: TimesheetApprovedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'timesheet_approved.body_p1', vars),
      cta_label: bundle['timesheet_approved.cta'] ?? 'View timesheet',
      timesheetUrl: input.timesheetUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(TimesheetApprovedEmail, props),
      kind: 'TIMESHEET_APPROVED',
      locale: localeUsed,
    });
  }

  // ─── 9. TIMESHEET_PARTIALLY_APPROVED ─────────────────────────────────────────

  async sendTimesheetPartiallyApprovedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    approverName: string;
    projectName: string;
    weekStart: string;
    timesheetUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.approverName,
      projectName: input.projectName,
      weekStart: input.weekStart,
    };
    const subject = this.t(bundle, 'timesheet_partially_approved.subject', vars);

    const props: TimesheetPartiallyApprovedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'timesheet_partially_approved.body_p1', vars),
      body_p2: this.t(bundle, 'timesheet_partially_approved.body_p2', vars),
      cta_label: bundle['timesheet_partially_approved.cta'] ?? 'View timesheet',
      timesheetUrl: input.timesheetUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(TimesheetPartiallyApprovedEmail, props),
      kind: 'TIMESHEET_PARTIALLY_APPROVED',
      locale: localeUsed,
    });
  }

  // ─── 10. TIMESHEET_REJECTED ──────────────────────────────────────────────────

  async sendTimesheetRejectedEmail(input: {
    recipientEmail: string;
    recipientName: string;
    approverName: string;
    projectName: string;
    scopeDate: string;
    reason: string;
    timesheetUrl: string;
    locale: string | null;
  }): Promise<void> {
    const bundle = await this.loadEmailBundle(input.locale);
    const localeUsed = input.locale ?? FALLBACK_LOCALE;
    const vars = {
      recipientName: input.recipientName,
      actorName: input.approverName,
      projectName: input.projectName,
      scopeDate: input.scopeDate,
    };
    const subject = this.t(bundle, 'timesheet_rejected.subject', vars);

    const props: TimesheetRejectedEmailProps = {
      common: this.buildCommon(bundle, vars),
      preview: subject,
      body_p1: this.t(bundle, 'timesheet_rejected.body_p1', vars),
      quote_intro: this.t(bundle, 'timesheet_rejected.quote_intro', vars),
      cta_label: bundle['timesheet_rejected.cta'] ?? 'Review timesheet',
      reason: input.reason,
      timesheetUrl: input.timesheetUrl,
      appUrl: this.appUrl,
    };
    return this.renderAndSend({
      to: input.recipientEmail,
      subject,
      element: React.createElement(TimesheetRejectedEmail, props),
      kind: 'TIMESHEET_REJECTED',
      locale: localeUsed,
    });
  }
}
