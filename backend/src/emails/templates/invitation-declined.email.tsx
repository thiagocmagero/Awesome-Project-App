import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface InvitationDeclinedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  appUrl: string;
}

/**
 * Email enviado ao convidante quando o convidado recusa o convite.
 * Sem CTA — é apenas informativo.
 */
export function InvitationDeclinedEmail(props: InvitationDeclinedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
    />
  );
}
