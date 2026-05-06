import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface TimesheetSubmittedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  timesheetUrl: string;
  appUrl: string;
}

/**
 * Email enviado a cada utilizador com `TIMESHEET_APPROVE` no projecto quando
 * outro membro submete a sua semana de horas.
 */
export function TimesheetSubmittedEmail(props: TimesheetSubmittedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1]}
      cta={{ label: props.cta_label, url: props.timesheetUrl }}
    />
  );
}
