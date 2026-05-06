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

interface Props {
  previewText: string;
  appUrl?: string;
  children: React.ReactNode;
}

/**
 * Wrapper visual partilhado por todos os templates transacionais.
 *
 * Mantém intencionalmente o styling inline (regras de email clients que
 * descartam `<style>` global). A paleta acompanha o template Zynix da app.
 */
export function EmailLayout({ previewText, appUrl, children }: Props) {
  const baseUrl = appUrl ?? 'http://localhost:5173';
  const prefsUrl = `${baseUrl}/settings/notifications`;

  return (
    <Html lang="pt">
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
              Recebeste este email porque tens notificações por email activadas
              na tua conta.{' '}
              <a href={prefsUrl} style={footerLinkStyle}>
                Gerir preferências
              </a>
              .
            </Text>
            <Text style={footerSmallStyle}>
              © {new Date().getFullYear()} Awesome Project App
            </Text>
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
