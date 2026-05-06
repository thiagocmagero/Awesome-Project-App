import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface PasswordResetEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  resetUrl: string;
  appUrl: string;
}

/** Email enviado ao utilizador para redefinir a password. Token expira em 15 min. */
export function PasswordResetEmail(props: PasswordResetEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.resetUrl }}
    />
  );
}
