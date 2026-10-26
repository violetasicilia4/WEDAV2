// Íconos que la pareja puede elegir para cada momento del día (ceremonia, recepción, fiesta…): un set chico y consistente, dibujado a mano alzada.
import type { ComponentType, SVGProps } from 'react';
import type { EventIconId } from '@/lib/weda/types';
import { ChurchIcon, ClinkIcon, DinnerIcon, HallIcon, HeartIcon, MusicIcon, RingsIcon, SparkleIcon, SunIcon, WineIcon } from './hand-icons';

type IconProps = { size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

export const EVENT_ICONS: { id: EventIconId; label: string; Icon: ComponentType<IconProps> }[] = [
  { id: 'rings', label: 'Alianzas', Icon: RingsIcon },
  { id: 'church', label: 'Iglesia', Icon: ChurchIcon },
  { id: 'heart', label: 'Corazón', Icon: HeartIcon },
  { id: 'clink', label: 'Brindis', Icon: ClinkIcon },
  { id: 'wine', label: 'Copa de vino', Icon: WineIcon },
  { id: 'dinner', label: 'Cena', Icon: DinnerIcon },
  { id: 'hall', label: 'Salón', Icon: HallIcon },
  { id: 'music', label: 'Música y baile', Icon: MusicIcon },
  { id: 'sparkle', label: 'Brillos', Icon: SparkleIcon },
  { id: 'sun', label: 'Atardecer', Icon: SunIcon },
];

const BY_ID = new Map(EVENT_ICONS.map(i => [i.id, i.Icon]));

/** El ícono de un evento: el que eligió la pareja o, si no eligió (o el valor es viejo), el de fábrica de ese momento. */
export const eventIcon = (icon: string | undefined, fallback: EventIconId): ComponentType<IconProps> => BY_ID.get(icon as EventIconId) ?? BY_ID.get(fallback) ?? RingsIcon;
