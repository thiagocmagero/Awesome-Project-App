import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface InvitationReceivedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  body_p2: string;
  cta_label: string;
  inviteUrl: string;
  appUrl: string;
}

/** Email enviado a um utilizador convidado para um projecto. */
export function InvitationReceivedEmail(props: InvitationReceivedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1, props.body_p2]}
      cta={{ label: props.cta_label, url: props.inviteUrl }}
    />
  );
}
