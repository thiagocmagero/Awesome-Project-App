import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface InvitationAcceptedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  projectUrl: string;
  appUrl: string;
}

/** Email enviado ao convidante quando o convidado aceita o convite. */
export function InvitationAcceptedEmail(props: InvitationAcceptedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.projectUrl }}
    />
  );
}
