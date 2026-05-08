import * as React from 'react';
import { SimpleEmail } from './components/SimpleEmail';
import type { CommonEmailTexts } from './components/EmailLayout';

export interface FileInfectedEmailProps {
  common: CommonEmailTexts;
  preview: string;
  body_p1: string;
  body_p2: string;
  /** Nome original do ficheiro (em quote para destaque). */
  fileName: string;
  appUrl: string;
}

/**
 * Email enviado ao uploader quando o AWS GuardDuty Malware Protection detecta
 * uma ameaça num ficheiro carregado. Bytes já foram removidos do bucket; o
 * registo File mantém-se em INFECTED para audit. Sem CTA — não há acção do
 * user a tomar; é informativo de segurança.
 */
export function FileInfectedEmail(props: FileInfectedEmailProps) {
  return (
    <SimpleEmail
      previewText={props.preview}
      appUrl={props.appUrl}
      common={props.common}
      paragraphs={[props.body_p1, props.body_p2]}
      quote={{ content: props.fileName, tone: 'danger' }}
    />
  );
}
