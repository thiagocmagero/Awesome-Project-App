import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface EmailConfirmationEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  confirmUrl: string;
  appUrl: string;
}

/** Email enviado ao utilizador para confirmar o endereço de email no registo. */
export function EmailConfirmationEmail(props: EmailConfirmationEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.confirmUrl }}
    />
  );
}
