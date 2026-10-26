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

/** Ceremonia religiosa: una iglesia con su cruz. */
export function ChurchIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M12.2 41.2L12 24.8C16.2 22.2 20.2 19.8 24 17.4C27.8 19.8 31.8 22.2 36 24.6L35.8 41.4" />
      <path d="M20.4 41.2V34C20.4 31.6 21.9 30 24 30C26.1 30 27.6 31.6 27.6 34V41.2" />
      <path d="M24 17.4L23.8 8.4M20.6 11.8C22.4 11.5 25.6 11.6 27.4 11.9" />
      <path d="M7 41.4C14 40.9 34 40.9 41.2 41.5" />
    </Base>
  );
}

/** Un corazón. */
export function HeartIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M24 38.6C14.2 31.6 9.7 25.8 10 19.6C10.3 14.4 14.3 11 18.8 11.4C21.3 11.6 23.2 13.1 24 15.2C24.8 13.1 26.7 11.6 29.2 11.4C33.7 11 37.8 14.4 38.1 19.6C38.4 25.8 33.9 31.6 24 38.6Z" />
    </Base>
  );
}

/** Cena: tenedor y cuchillo. */
export function DinnerIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M13.4 8.6V19.4C13.4 22.4 15.2 23.9 18 24.3V39.6" />
      <path d="M22.6 8.6V19.4C22.6 22.4 20.8 23.9 18 24.3" />
      <path d="M18 8.8V19.2" />
      <path d="M32.4 39.6L32.2 8.8C28.6 12 27.2 18 28.2 25.2H32.3" />
    </Base>
  );
}

/** Torta. */
export function CakeIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M9.8 38.6C16.4 38.2 31.6 38.2 38.4 38.7" />
      <path d="M12 38.4V28.6C12 26.6 13.2 25.6 15 25.6C20.4 25.3 27.6 25.3 33 25.6C34.8 25.6 36 26.6 36 28.6V38.4" />
      <path d="M12.2 31.4C15 33.6 17.8 33.6 20.4 31.4C23 33.6 25.8 33.6 28.4 31.4C30.8 33.4 33.4 33.4 35.8 31.6" />
      <path d="M24 25.4V18.6" />
      <path d="M24 13.8C22.5 15.5 22.5 17.7 24 18.6C25.5 17.7 25.5 15.5 24 13.8Z" />
    </Base>
  );
}

/** Música y baile: una nota. */
export function MusicIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M19.2 34.6V12.8L35.8 9.6V31.6" />
      <path d="M19.2 20.2L35.8 17" />
      <path d="M19.2 34.6C19.4 37.4 16.8 39.4 13.8 38.8C11 38.2 10.4 35.2 12.4 33.6C14.4 32 17.6 32.2 19.2 34.6Z" />
      <path d="M35.8 31.6C36 34.4 33.4 36.4 30.4 35.8C27.6 35.2 27 32.2 29 30.6C31 29 34.2 29.2 35.8 31.6Z" />
    </Base>
  );
}

/** Atardecer / after beach: medio sol sobre el agua. */
export function SunIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 30.6C12.4 24.8 17.4 20.4 24 20.6C30.6 20.8 35.6 25.2 36 30.8" />
      <path d="M24 11.6V15M13 16.4L15.4 18.8M35 16.4L32.6 18.8M7.6 26.4H11M37 26.4H40.4" />
      <path d="M8.4 35.4C11 34 13.6 34 16.2 35.4C18.8 36.8 21.4 36.8 24 35.4C26.6 34 29.2 34 31.8 35.4C34.4 36.8 37 36.8 39.6 35.4" />
      <path d="M12.6 40.4C15 39.4 17.4 39.4 19.8 40.4C22.2 41.4 24.6 41.4 27 40.4C29.4 39.4 31.8 39.4 34.2 40.4" />
    </Base>
  );
}

/** Fotos: una cámara. */
export function CameraIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M9.4 18.8C9.4 16.9 10.6 15.7 12.5 15.7H16.8L19.2 12H28.8L31.2 15.7H35.5C37.4 15.7 38.6 16.9 38.6 18.8V33.4C38.6 35.3 37.4 36.5 35.5 36.5H12.5C10.6 36.5 9.4 35.3 9.4 33.4Z" />
      <path d="M24 31.4C20.8 31.4 18.4 29 18.4 26C18.4 23 20.8 20.6 24 20.6C27.2 20.6 29.6 23 29.6 26C29.6 29 27.2 31.4 24 31.4Z" />
    </Base>
  );
}

/** Brillos: una estrella de cuatro puntas y dos chicas. */
export function SparkleIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M22 11.6C23 20.2 25.6 24.6 34.6 27.2C25.6 29.8 23 34.4 22 42.8C21 34.4 18.4 29.8 9.4 27.2C18.4 24.6 21 20.2 22 11.6Z" />
      <path d="M37.6 8.6V14.4M34.7 11.5H40.5" />
      <path d="M38.4 33.2V37.4M36.3 35.3H40.5" />
    </Base>
  );
}

/** Una copa de vino. */
export function WineIcon(props: Props) {
  return (
    <Base {...props}>
      <path d="M16.6 9.4H31.4C32.2 18.4 30.4 24.8 24 26.6C17.6 24.8 15.8 18.4 16.6 9.4Z" />
      <path d="M16.8 16.6C20.6 18.2 27.4 18.2 31.2 16.6" />
      <path d="M24 26.6V38.6M17.6 39.4C19.8 38.6 28.2 38.6 30.4 39.4" />
    </Base>
  );
}
