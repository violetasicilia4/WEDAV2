import { ChevronDown } from 'lucide-react';
import { eventDate, wedding } from '@/lib/demo-wedding';

type Props = {
  /** 'home': portada completa. 'gifts': portada baja con el título de la lista. */
  variant?: 'home' | 'gifts';
  /** Ancla a la que baja la flecha. */
  next?: string;
};

/** Portada compartida: fotografía protagonista, nombres, fecha y flecha para seguir bajando. */
const [year, month, day] = eventDate.split('-');
/** Fecha corta con puntos, p. ej. «20 . 03 . 27». */
const spacedDate = `${day} . ${month} . ${year!.slice(-2)}`;

export function EjemploCover({ variant = 'home', next }: Props) {
  const gifts = variant === 'gifts';
  return (
    <section className={`iv-cover${gifts ? ' is-gifts' : ''}`} id="top">
      <img className="iv-cover-img" src={wedding.photo} alt="Ignacio y Martina riéndose juntos en la playa, en blanco y negro" />
      <div className="iv-cover-copy">
        {gifts ? (
          <>
            <p className="iv-cover-names">{wedding.couple}</p>
            <h1 className="iv-cover-title">Lista de regalos</h1>
          </>
        ) : (
          <>
            <div className="iv-cover-group">
              <p className="iv-cover-eyebrow">¡Nos casamos!</p>
              <h1 className="iv-cover-title iv-cover-top">{wedding.couple.replace(/\s*&\s*/, ' y ')}</h1>
              <p className="iv-cover-date" aria-label={wedding.dateShort}>{spacedDate}</p>
            </div>
          </>
        )}
      </div>
      {next && <a className="iv-cover-down" href={next} aria-label="Seguir bajando"><ChevronDown size={22} strokeWidth={1.4} aria-hidden="true" /></a>}
    </section>
  );
}
