import type { SVGProps } from 'react';

/**
 * Íconos de los momentos del día, dibujados a mano alzada: trazo parejo pero con curvas irregulares,
 * sin simetría exacta, para que se sientan de papelería de casamiento y no de librería de íconos.
 */
type Props = { size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

function Base({ size = 32, strokeWidth = 1.6, children, ...rest }: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}
    >
      {children}
    </svg>
  );
}

/** Ceremonia: dos alianzas entrelazadas. */
export function RingsIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M8.6 25.4C8.3 19.8 12.9 15.6 18.2 15.9C23.5 16.2 27.5 20.6 27.2 26C26.9 31.4 22.5 35.4 17.3 35.1C12.2 34.8 8.9 30.8 8.6 25.4Z" />
      <path d="M20.8 25.8C20.6 20.4 25.1 16.3 30.3 16.6C35.5 16.9 39.4 21.2 39.2 26.4C38.9 31.6 34.6 35.6 29.5 35.3C24.5 35 21 31.1 20.8 25.8Z" />
    </Base>
  );
}

/** Recepción: dos copas brindando. */
export function ToastIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M12.2 11.4C12 18.2 13.6 22.8 17.4 24.2C21.1 22.8 21.7 17.6 21.4 11.2" />
      <path d="M17.4 24.4L17.3 36.6M13.4 37C15.4 36.4 19.2 36.6 21.4 37.2" />
      <path d="M35.8 11C36 17.8 34.4 22.6 30.6 24C26.9 22.6 26.3 17.4 26.6 10.8" />
      <path d="M30.6 24.2L30.7 36.4M26.6 37C28.6 36.4 32.4 36.6 34.6 37.2" />
    </Base>
  );
}

/** Fiesta: torta de dos pisos con una vela. */
export function CakeIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M8.4 35.8C8.3 32.4 8.6 30.2 8.7 28.8C15.6 29.6 32 29.2 39.3 28.6C39.4 30.4 39.5 33.4 39.3 36C31.4 36.8 16 36.6 8.4 35.8Z" />
      <path d="M14.2 28.8C14.1 25.8 14.4 24 14.5 22.6C19.8 23.4 28.4 23.1 33.6 22.5C33.7 24.2 33.8 26.6 33.6 28.7" />
      <path d="M24 22.5L24.1 16.4" />
      <path d="M24.1 14.6C22.8 13.2 23.6 11.6 24.2 10.4C25.1 11.8 25.7 13.1 24.1 14.6Z" />
    </Base>
  );
}
