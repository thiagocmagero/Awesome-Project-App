import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface TimesheetRejectedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  /** Label antes do quote (ex.: "Motivo da rejeição:" / "Reason for rejection:"). */
  quote_intro: string;
  cta_label: string;
  /** Motivo dado pelo aprovador — input do utilizador, não traduzido. */
  reason: string;
  timesheetUrl: string;
  appUrl: string;
}

/**
 * Email enviado ao submetente quando ≥1 dia/semana é rejeitado. Inclui o
 * motivo (REQ-N04) num bloco destacado em tom "danger". O label antes do
 * quote (`quote_intro`) é injectado como segundo parágrafo para preceder o
 * bloco — mantém o styling do `SimpleEmail`.
 */
export function TimesheetRejectedEmail(props: TimesheetRejectedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1, props.quote_intro]}
      quote={{ content: props.reason, tone: 'danger' }}
      cta={{ label: props.cta_label, url: props.timesheetUrl }}
    />
  );
}
