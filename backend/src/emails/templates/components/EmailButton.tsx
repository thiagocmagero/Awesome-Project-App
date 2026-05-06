import * as React from 'react';
import { Button } from '@react-email/components';

interface Props {
  href: string;
  children: React.ReactNode;
}

/** Botão CTA primário — paleta Zynix violet. */
export function EmailButton({ href, children }: Props) {
  return (
    <Button href={href} style={buttonStyle}>
      {children}
    </Button>
  );
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#845adf',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 24px',
  textAlign: 'center',
  textDecoration: 'none',
};
