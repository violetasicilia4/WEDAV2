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

/** Recepción (invitación): dos copas chocando, con rayitas de brindis. */
export function ClinkIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M15.4 11.2L25.4 15.8" />
      <path d="M15.6 11.6C14.6 18.6 15.8 23.4 19.8 25.6C23 22.8 24.6 19.8 25.2 16.2" />
      <path d="M19.8 25.8L15.4 38.2M11.6 38.8C13.2 38 17 38.4 18.8 39.6" />
      <path d="M32.6 11.2L22.6 15.8" />
      <path d="M32.4 11.6C33.4 18.6 32.2 23.4 28.2 25.6C25 22.8 23.4 19.8 22.8 16.2" />
      <path d="M28.2 25.8L32.6 38.2M36.4 38.8C34.8 38 31 38.4 29.2 39.6" />
      <path d="M24 5.8V9M19.4 7.6L21 10.2M28.6 7.6L27 10.2" />
    </Base>
  );
}

/** Fiesta: un salón con techo a dos aguas, puerta y ventanas en arco. */
export function HallIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M6.6 20.6C12.8 15.8 18.4 11.6 24.2 7.8C29.8 11.6 35.6 15.8 41.4 20.4" />
      <path d="M9.4 21L9.2 38.6M38.8 21.2L39 38.4" />
      <path d="M6.6 38.8C16 38.4 32 38.6 41.4 38.9" />
      <path d="M20.4 38.6L20.2 29.4C20.2 26.4 22 24.6 24.2 24.6C26.4 24.6 28.2 26.4 28.1 29.4L28 38.6" />
      <path d="M12.8 33.4V29.6C12.8 28 13.9 27.2 15 27.2C16.1 27.2 17.2 28 17.2 29.6V33.4" />
      <path d="M31.4 33.4V29.6C31.4 28 32.5 27.2 33.6 27.2C34.7 27.2 35.8 28 35.8 29.6V33.4" />
    </Base>
  );
}
