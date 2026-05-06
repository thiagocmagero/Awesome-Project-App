import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface TimesheetPartiallyApprovedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  body_p2: string;
  cta_label: string;
  timesheetUrl: string;
  appUrl: string;
}

/** Email enviado ao submetente quando a sua semana fica em PARTIAL. */
export function TimesheetPartiallyApprovedEmail(
  props: TimesheetPartiallyApprovedEmailProps,
) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1, props.body_p2]}
      cta={{ label: props.cta_label, url: props.timesheetUrl }}
    />
  );
}
