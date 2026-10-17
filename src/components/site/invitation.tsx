// Invitación editorial. Orden pensado para el invitado: quién y cuándo (portada) → dónde y a qué hora (el día) → confirmar →
// qué ponerse → fotos → música → cierre. Cada sección tiene una composición propia y aparece solo si está habilitada.
// Es la MISMA página para /ejemplo y para el sitio de cada pareja: todo viene de useSite().
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarPlus, Plus } from 'lucide-react';
import { ClinkIcon, HallIcon, RingsIcon } from '@/components/hand-icons';
import { useRsvp } from '@/components/rsvp-dialog';
import { SiteCover } from './site-cover';
import { buildIcs, downloadIcs, parseTime } from '@/lib/ics';
import { getCountdown, type Countdown } from '@/lib/countdown';
import { useSessionState } from '@/lib/demo-session';
import { monthName, slugify } from '@/lib/weda/logic';
import { useSite } from '@/lib/weda/site-model';

/* Cuenta regresiva: solo en el cliente (evita desajustes de hidratación) y nunca muestra valores negativos. */
function CountdownRow({ start }: { start: string }) {
  const [c, setC] = useState<Countdown | null>(null);
  useEffect(() => {
    const tick = () => setC(getCountdown(start, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [start]);
  if (!c || c.past) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const items: [string, string][] = [[String(c.days), 'días'], [pad(c.hours), 'hs'], [pad(c.minutes), 'min'], [pad(c.seconds), 'seg']];
  return (
    <div className="iv-count" role="timer" aria-label={`Faltan ${c.days} días y ${c.hours} horas`}>
      {items.map(([n, l]) => (
        <p key={l} aria-hidden="true"><span className="iv-count-n">{n}</span><span className="iv-count-l">{l}</span></p>
      ))}
    </div>
  );
}

/* Bienvenida: va justo después de la foto. */
function Welcome() {
  const site = useSite();
  const canSave = !!site.eventDate && site.events.some(e => parseTime(e.time));
  // Sin fecha, la portada ya dice «Fecha a confirmar»: no se repite. El marcador (#nos-casamos) activa la tipografía de la invitación.
  if (!site.eventDate) return <span id="nos-casamos" hidden />;
  const save = () => {
    if (!site.eventDate) return;
    const file = site.kind === 'demo' ? 'casamiento-ignacio-y-martina.ics' : `casamiento-${slugify(site.names.split('&')[0] ?? '', site.names.split('&')[1] ?? '')}.ics`;
    downloadIcs(buildIcs({ events: site.events, date: site.eventDate, offset: site.eventOffset, title: site.calendarTitle }), file);
  };
  return (
    <section className="iv-welcome" id="nos-casamos" aria-labelledby="iv-welcome-title">
      <div className="iv-wrap">
        <h2 id="iv-welcome-title" className="iv-welcome-title">Save the date</h2>
        <p className="iv-welcome-date">{site.dateLabel ?? 'Fecha a confirmar'}</p>
        {site.blocks.countdown && site.weddingStart && <CountdownRow start={site.weddingStart} />}
        {canSave && (
          <button type="button" className="iv-link iv-welcome-btn" onClick={save}>
            <CalendarPlus size={16} aria-hidden="true" /><span>Guardar la fecha</span>
          </button>
        )}
      </div>
    </section>
  );
}

const eventIcons: Record<string, typeof RingsIcon> = { ceremonia: RingsIcon, recepcion: ClinkIcon, fiesta: HallIcon };

/* El día: lista editorial de momentos. La composición se adapta a 1..N eventos sin tarjetas ni huecos. */
function TheDay() {
  const site = useSite();
  const { events } = site;
  const day = site.eventDate ? String(Number(site.eventDate.slice(8, 10))) : '—';
  const month = site.eventDate ? monthName(Number(site.eventDate.slice(5, 7))) : 'a confirmar';
  return (
    <section className="iv-section iv-day" id="dia" aria-label="Horarios y lugares">
      <div className="iv-wrap">
        <div className="iv-day-grid">
        <div className="iv-card">
          <ul className="iv-card-tabs" aria-label="Ir a un momento del día">
            {events.map(ev => {
              const Icon = eventIcons[ev.key] ?? RingsIcon;
              return (
                <li key={ev.key}>
                  <a href={`#ev-${ev.key}`} aria-label={ev.label}><Icon size={26} strokeWidth={1.4} aria-hidden="true" /></a>
                </li>
              );
            })}
          </ul>
          <ol className="iv-card-events" data-n={events.length} style={{ ["--n" as string]: events.length } as React.CSSProperties}>
            {events.map(ev => {
              const Icon = eventIcons[ev.key] ?? RingsIcon;
              const time = ev.time.replace(/\s*hs\.?$/i, '');
              return (
                <li key={ev.key} id={`ev-${ev.key}`}>
                  <span className="iv-card-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.4} /></span>
                  <div className="iv-card-body">
                    <h3>{ev.label}</h3>
                    <div className="iv-when">
                      <p className="iv-when-cell"><span className="iv-when-n">{day}</span><span className="iv-when-l">{month}</span></p>
                      <p className="iv-when-cell"><span className="iv-when-n">{time || '—'}</span><span className="iv-when-l">{time ? 'Horas' : 'a confirmar'}</span></p>
                    </div>
                    <p className="iv-card-place">{ev.name}</p>
                    {ev.address && <p className="iv-card-addr">{ev.address}</p>}
                    {events.length <= 2 && ev.note && <p className="iv-card-note">{ev.note}</p>}
                    {ev.maps && (
                      <a className="iv-card-map" href={ev.maps} target="_blank" rel="noopener noreferrer">
                        <span>Cómo llegar</span><span className="dm-sr"> a {ev.name} (se abre en una pestaña nueva)</span>
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        </div>
      </div>
    </section>
  );
}

/* Confirmar asistencia: bloque a ancho completo, con la fecha límite visible. */
function RsvpBand() {
  const rsvp = useRsvp();
  const site = useSite();
  return (
    <section className="iv-band iv-rsvp" id="confirmar" aria-labelledby="iv-rsvp-title">
      <div className="iv-wrap iv-rsvp-grid">
        <div>
          <h2 id="iv-rsvp-title" className="iv-h2">Confirmá tu asistencia</h2>
          {site.rsvp.deadline && <p className="iv-rsvp-deadline">Respondé antes del {site.rsvp.deadline}.</p>}
        </div>
        <div className="iv-rsvp-action">
          <button type="button" className="iv-btn" onClick={rsvp.open}>Confirmar asistencia</button>
          {rsvp.sentCount > 0 && <p className="iv-status" role="status">Ya cargaste una confirmación en esta demostración.</p>}
        </div>
      </div>
    </section>
  );
}

/* Fotos: retratos con el mismo tratamiento que las historias de la landing; el hashtag es un detalle al pie. */
function Photos() {
  const { gallery } = useSite();
  return (
    <section className="iv-section iv-photos" id="fotos" aria-label="Fotos">
      <div className="iv-wrap">
        <div className="iv-mosaic">
          {gallery.photos.map((g, i) => (
            <figure key={`${g.src.slice(-24)}-${i}`} className="iv-shot">
              <img src={g.src} alt={g.alt} style={g.pos ? { objectPosition: g.pos } : undefined} loading="lazy" />
            </figure>
          ))}
        </div>
        {(gallery.hashtag || gallery.handle) && (
          <p className="iv-hashtag">
            {gallery.hashtag && <strong>{gallery.hashtag}</strong>}
            {gallery.handle && <span>Subí tus fotos y etiquetanos en {gallery.handle}.</span>}
          </p>
        )}
      </div>
    </section>
  );
}

/* Dress code: una sola sección, centrada y con su paleta. */
function Practical() {
  const { dressCode } = useSite();
  const note = dressCode.title && dressCode.text.startsWith(`${dressCode.title}. `) ? dressCode.text.slice(dressCode.title.length + 2) : dressCode.text;
  return (
    <section className="iv-section iv-practical" id="dresscode" aria-labelledby="iv-dress-title">
      <div className="iv-wrap iv-dress">
        <p className="iv-eyebrow">Dress code</p>
        <h2 id="iv-dress-title" className="iv-dress-title">{dressCode.title || 'Dress code'}</h2>
        {note && <p className="iv-dress-text">{note}</p>}
        <ul className="iv-swatches" aria-label="Colores sugeridos">
          {dressCode.palette.map(c => <li key={c.name}><i style={{ background: c.color }} aria-hidden="true" /><span>{c.name}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

/* Playlist: un bloque propio a ancho completo (cinco temas visibles; el resto, plegado). */
function PlaylistBlock() {
  const { playlist } = useSite();
  const [added, setAdded] = useSessionState<{ title: string; artist: string }[]>('playlist', []);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [err, setErr] = useState('');
  const [more, setMore] = useState(false);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (song.trim().length < 2) { setErr('Escribí el nombre de la canción.'); return; }
    setErr('');
    setAdded(l => [{ title: song.trim(), artist: artist.trim() || 'Artista a confirmar' }, ...l]);
    setSong(''); setArtist('');
  };
  const all = [...added.map(t => ({ ...t, mine: true })), ...playlist.tracks.map(t => ({ ...t, mine: false }))];
  const shown = more ? all : all.slice(0, 5);
  return (
    <div id="musica" className="iv-playlist">
      <h2 className="iv-playlist-title">Tu música, nuestra playlist.</h2>
      <p className="iv-playlist-text">Sumá los temas que no pueden faltar en la pista.</p>
      <form onSubmit={add} noValidate className="iv-form is-inline">
        <label htmlFor="iv-song" className="dm-sr">Canción</label>
        <input id="iv-song" type="text" value={song} onChange={e => { setSong(e.target.value); if (err) setErr(''); }} placeholder="Canción" aria-invalid={!!err} autoComplete="off" />
        <label htmlFor="iv-artist" className="dm-sr">Artista</label>
        <input id="iv-artist" type="text" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artista (opcional)" autoComplete="off" />
        <button type="submit" className="iv-btn"><Plus size={16} aria-hidden="true" />Agregar</button>
        {err && <p className="iv-error" role="alert">{err}</p>}
      </form>
      <ol className="iv-tracks" aria-label="Canciones de la playlist">
        {shown.map((t, n) => (
          <li key={`${t.title}-${n}`}><span className="iv-track-n">{n + 1}</span><span><strong>{t.title}</strong><small>{t.artist}{t.mine ? ' · agregada por vos' : ''}</small></span></li>
        ))}
      </ol>
      {all.length > 5 && (
        <button type="button" className="iv-link" aria-expanded={more} onClick={() => setMore(m => !m)}>
          <span>{more ? 'Ver menos' : `Ver las ${all.length} canciones`}</span>
        </button>
      )}
    </div>
  );
}

/* Cierre: fotografía, una frase y las dos acciones. */
function Closing() {
  const rsvp = useRsvp();
  const site = useSite();
  return (
    <section className="iv-closing" style={{ backgroundImage: 'url(/fondo-ramo.jpg)' }} aria-labelledby="iv-close-title">
      <div className="iv-closing-copy">
        <h2 id="iv-close-title" className="iv-h2">{site.message.title}</h2>
        <p>{site.message.text || `Con todo cariño, ${site.names}.`}</p>
        <div className="iv-closing-actions">
          {site.blocks.rsvp && <button type="button" className="iv-btn is-paper" onClick={rsvp.open}>Confirmar asistencia</button>}
          {site.gifts.length > 0 && <Link to={site.giftsPath as never} className="iv-closing-link"><span>Ver lista de regalos</span></Link>}
        </div>
      </div>
    </section>
  );
}

export function Invitation() {
  const { blocks } = useSite();
  return <>
    <SiteCover variant="home" next="#nos-casamos" />
    <Welcome />
    {blocks.day && <TheDay />}
    {blocks.rsvp && <RsvpBand />}
    {blocks.dress && <Practical />}
    {blocks.photos && <Photos />}
    {blocks.playlist && (
      <section className="iv-section iv-participate" aria-label="Playlist">
        <div className="iv-wrap"><PlaylistBlock /></div>
      </section>
    )}
    {blocks.message && <Closing />}
  </>;
}
