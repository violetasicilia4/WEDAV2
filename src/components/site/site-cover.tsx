import { ChevronDown } from 'lucide-react';
import { useSite } from '@/lib/weda/site-model';

type Props = {
  /** 'home': portada completa. 'gifts': portada baja con el título de la lista. */
  variant?: 'home' | 'gifts';
  /** Ancla a la que baja la flecha. */
  next?: string;
};

/** Fecha corta con puntos, p. ej. «20 . 03 . 27». */
const spaced = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d} . ${m} . ${(y ?? '').slice(-2)}`; };

/** Portada compartida: fotografía protagonista, nombres, fecha y flecha para seguir bajando.
    Si la pareja no cargó foto, usa una imagen de muestra de Weda (decorativa): nunca un hueco ni una imagen rota. La portada lisa con iniciales queda solo como respaldo. */
export function SiteCover({ variant = 'home', next }: Props) {
  const site = useSite();
  const gifts = variant === 'gifts';
  const photo = gifts ? (site.giftsCover ?? site.coverPhoto) : site.coverPhoto;
  const initials = site.names.split('&').map(n => n.trim().charAt(0).toUpperCase()).filter(Boolean).join(' & ');
  return (
    <section className={`iv-cover${gifts ? ' is-gifts' : ''}${photo ? '' : ' is-plain'}${site.coverSample && !gifts ? ' is-sample' : ''}`} id="top">
      {photo
        ? <img className="iv-cover-img" src={photo} alt={gifts && site.giftsCover ? `Portada de la lista de regalos de ${site.names}` : site.photoAlt} style={site.coverSample && !(gifts && site.giftsCover) ? { objectPosition: site.coverSample } : undefined} />
        : <span className="iv-cover-mono" aria-hidden="true">{initials}</span>}
      <div className="iv-cover-copy">
        {gifts ? (
          <>
            <p className="iv-cover-names">{site.names}</p>
            <h1 className="iv-cover-title">Lista de regalos</h1>
          </>
        ) : (
          <div className="iv-cover-group">
            {site.coverText && <p className="iv-cover-eyebrow">{site.coverText}</p>}
            <h1 className="iv-cover-title iv-cover-top">{site.names.split(/\s*&\s*/).map((n, i) => (i === 0 ? n : <span key={i}> <span className="iv-amp">&amp;</span> {n}</span>))}</h1>
            {site.eventDate
              ? <p className="iv-cover-date" aria-label={site.dateShort ?? undefined}>{spaced(site.eventDate)}</p>
              : <p className="iv-cover-date">Fecha a confirmar</p>}
          </div>
        )}
      </div>
      {next && <a className="iv-cover-down" href={next} aria-label="Seguir bajando"><ChevronDown size={22} strokeWidth={1.4} aria-hidden="true" /></a>}
    </section>
  );
}
