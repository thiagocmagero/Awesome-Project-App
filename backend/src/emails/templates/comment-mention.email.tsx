import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { EmailButton } from './components/EmailButton';

export interface CommentMentionEmailProps {
  recipientName: string;
  actorName: string;
  projectName: string;
  /** Nome da task ou contexto onde o comentário foi feito. */
  contextName: string;
  /** Excerpt do comentário (já trimmed pelo caller). */
  excerpt: string;
  /** URL absoluta para o comentário/task. */
  commentUrl: string;
  /** APP_URL para construir o link do footer. */
  appUrl: string;
}

/**
 * Email enviado a um utilizador mencionado num comentário.
 * Disparado em `comments.service.createComment` se o user tiver
 * `NotificationPreference(MENTION, EMAIL).enabled = true`.
 */
export function CommentMentionEmail({
  recipientName,
  actorName,
  projectName,
  contextName,
  excerpt,
  commentUrl,
  appUrl,
}: CommentMentionEmailProps) {
  return (
    <EmailLayout
      previewText={`${actorName} mencionou-te em ${contextName}`}
      appUrl={appUrl}
    >
      <Heading as="h2" style={headingStyle}>
        Olá {recipientName},
      </Heading>
      <Text style={paragraphStyle}>
        <strong>{actorName}</strong> mencionou-te num comentário em{' '}
        <strong>{contextName}</strong> do projeto{' '}
        <strong>{projectName}</strong>:
      </Text>
      <Section style={quoteStyle}>
        <Text style={quoteTextStyle}>{excerpt}</Text>
      </Section>
      <Section style={ctaSectionStyle}>
        <EmailButton href={commentUrl}>Ver comentário</EmailButton>
      </Section>
      <Text style={hintStyle}>
        Se o botão não funcionar, copia este link para o teu browser:
        <br />
        <span style={linkStyle}>{commentUrl}</span>
      </Text>
    </EmailLayout>
  );
}

const headingStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 600,
  margin: '0 0 16px 0',
};

const paragraphStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const quoteStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fb',
  borderLeft: '3px solid #845adf',
  borderRadius: '4px',
  margin: '16px 0',
  padding: '12px 16px',
};

const quoteTextStyle: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  fontStyle: 'italic',
  lineHeight: '1.6',
  margin: 0,
};

const ctaSectionStyle: React.CSSProperties = {
  margin: '24px 0',
  textAlign: 'center',
};

const hintStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '16px 0 0 0',
};

const linkStyle: React.CSSProperties = {
  color: '#845adf',
  fontSize: '11px',
  wordBreak: 'break-all',
};
