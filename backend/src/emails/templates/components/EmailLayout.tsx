import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/**
 * Textos comuns reutilizados pelo wrapper visual e por todos os templates.
 * O `EmailService.buildCommon(bundle, vars)` constrói este objecto a partir
 * do namespace `email` (`common.*` chaves) já interpolado.
 */
export interface CommonEmailTexts {
  /** "Olá {{recipientName}}," — já interpolado. */
  greeting: string;
  /** Frase de aviso no footer ("Recebeste este email porque..."). */
  footer_text: string;
  /** Texto do link "Gerir preferências" (aponta para `prefsUrl`). */
  footer_pref_link: string;
  /** Intro do hint "Se o botão não funcionar, copia este link..." (sem URL). */
  hint_link_intro: string;
  /** Linha de copyright já com {{year}} substituído. */
  copyright: string;
  /** URL absoluta para o utilizador gerir preferências de notificação. */
  prefsUrl: string;
}

interface Props {
  /** Texto curto que aparece nas previews dos clientes (Gmail, Outlook, ...). */
  previewText: string;
  /** APP_URL usada para construir links no footer. */
  appUrl: string;
  /** Strings comuns já em locale + interpoladas. */
  common: CommonEmailTexts;
  children: React.ReactNode;
}

/**
 * Wrapper visual partilhado por todos os templates transacionais.
 *
 * Mantém intencionalmente o styling inline (regras de email clients que
 * descartam `<style>` global). A paleta acompanha o template Zynix da app.
 *
 * Locale-agnostic: todas as strings vêm em `common`. O brand "Awesome
 * Project App" é nome próprio — não traduz.
 */
export function EmailLayout({ previewText, common, children }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={brandStyle}>Awesome Project App</Text>
          </Section>
          <Section style={contentStyle}>{children}</Section>
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              {common.footer_text}{' '}
              <a href={common.prefsUrl} style={footerLinkStyle}>
                {common.footer_pref_link}
              </a>
              .
            </Text>
            <Text style={footerSmallStyle}>{common.copyright}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: '32px 0',
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: 0,
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid #eaeaea',
  padding: '20px 32px',
};

const brandStyle: React.CSSProperties = {
  color: '#845adf',
  fontSize: '18px',
  fontWeight: 600,
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  color: '#1f2937',
  fontSize: '14px',
  lineHeight: '1.6',
  padding: '24px 32px',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#eaeaea',
  margin: 0,
};

const footerStyle: React.CSSProperties = {
  padding: '20px 32px',
};

const footerTextStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
};

const footerSmallStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: '12px 0 0 0',
};

const footerLinkStyle: React.CSSProperties = {
  color: '#845adf',
  textDecoration: 'underline',
};
