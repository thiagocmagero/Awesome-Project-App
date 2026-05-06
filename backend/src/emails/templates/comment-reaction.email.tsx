import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface CommentReactionEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  commentUrl: string;
  appUrl: string;
}

/** Email enviado ao autor de um comentário quando alguém reage com emoji. */
export function CommentReactionEmail(props: CommentReactionEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.commentUrl }}
    />
  );
}
