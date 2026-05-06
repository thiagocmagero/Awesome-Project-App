import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface TaskAssignedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  taskUrl: string;
  appUrl: string;
}

/** Email enviado a um utilizador a quem foi atribuída uma tarefa. */
export function TaskAssignedEmail(props: TaskAssignedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.taskUrl }}
    />
  );
}
