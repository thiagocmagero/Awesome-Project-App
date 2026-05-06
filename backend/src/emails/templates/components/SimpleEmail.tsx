import * as React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout, type CommonEmailTexts } from './EmailLayout';
import { EmailButton } from './EmailButton';

/**
 * Componente reutilizável para emails simples no estilo "transactional update".
 * Os templates específicos (TaskAssigned, InvitationReceived, ...) configuram
 * apenas o conteúdo (greeting + parágrafos + CTA + opcional quote), deixando
 * todo o styling consistente.
 *
 * Todos os textos chegam **já em locale e já interpolados** (preparados pelo
 * `EmailService`). Este componente só posiciona — não conhece i18n.
 */
export interface SimpleEmailProps {
  previewText: string;
  appUrl: string;
  common: CommonEmailTexts;
  /** Parágrafos do corpo (cada item vira um <Text> separado). */
  paragraphs: string[];
  /** Bloco "quote" destacado (excerpt de comentário, motivo de rejeição, etc.). */
  quote?: { content: string; tone?: 'neutral' | 'danger' };
  /** Botão CTA (label + URL). Omitir = sem botão (ex.: invitation_declined). */
  cta?: { label: string; url: string };
}

export function SimpleEmail({
  previewText,
  appUrl,
  common,
  paragraphs,
  quote,
  cta,
}: SimpleEmailProps) {
  const quoteStyle =
    quote?.tone === 'danger' ? quoteDangerStyle : quoteNeutralStyle;

  return (
    <EmailLayout previewText={previewText} appUrl={appUrl} common={common}>
      <Heading as="h2" style={headingStyle}>
        {common.greeting}
      </Heading>
      {paragraphs.map((p, i) => (
        <Text key={i} style={paragraphStyle}>
          {p}
        </Text>
      ))}
      {quote && (
        <Section style={quoteStyle}>
          <Text style={quoteTextStyle}>{quote.content}</Text>
        </Section>
      )}
      {cta && (
        <>
          <Section style={ctaSectionStyle}>
            <EmailButton href={cta.url}>{cta.label}</EmailButton>
          </Section>
          <Text style={hintStyle}>
            {common.hint_link_intro}
            <br />
            <span style={linkStyle}>{cta.url}</span>
          </Text>
        </>
      )}
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
  margin: '0 0 12px 0',
};

const quoteNeutralStyle: React.CSSProperties = {
  backgroundColor: '#f8f9fb',
  borderLeft: '3px solid #845adf',
  borderRadius: '4px',
  margin: '16px 0',
  padding: '12px 16px',
};

const quoteDangerStyle: React.CSSProperties = {
  backgroundColor: '#fef3f2',
  borderLeft: '3px solid #e6533c',
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
