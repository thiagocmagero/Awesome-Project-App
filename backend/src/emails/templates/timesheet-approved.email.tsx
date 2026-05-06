import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface TimesheetApprovedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  cta_label: string;
  timesheetUrl: string;
  appUrl: string;
}

/** Email enviado ao submetente quando a sua semana fica totalmente APPROVED. */
export function TimesheetApprovedEmail(props: TimesheetApprovedEmailProps) {
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
