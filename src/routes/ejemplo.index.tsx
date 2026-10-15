import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, CalendarPlus, Plus } from 'lucide-react';
import { CakeIcon, RingsIcon, ToastIcon } from '@/components/hand-icons';
import { useRsvp } from '@/components/rsvp-dialog';
import { EjemploCover } from '@/components/ejemplo-cover';
import {
  alias, calendar, directionsUrl, dressCode, eventDate, eventOffset, events, gallery, greetings, lodgingUrl, playlist,
  rsvpDeadline, social, wedding, weddingStart,
} from '@/lib/demo-wedding';
import { buildIcs, downloadIcs } from '@/lib/ics';
import { getCountdown, type Countdown } from '@/lib/countdown';
import { useSessionState } from '@/lib/demo-session';

export const Route = createFileRoute('/ejemplo/')({
  head: () => ({
    meta: [
      { title: `${wedding.couple} • Casamiento` },
      { name: 'description', content: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda: sitio, lista de regalos y confirmación de asistencia.' },
      { property: 'og:title', content: `${wedding.couple} • Casamiento` },
      { property: 'og:description', content: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda.' },
      { property: 'og:image', content: wedding.photo },
    ],
  }),
  component: Invitation,
});

/* ------------------------------------------------------------------------------------------------
   Invitación editorial. Orden pensado para el invitado: quién y cuándo (portada) → dónde y a qué hora
   (el día) → confirmar → qué ponerse → fotos → información práctica → mensajes → música → cierre.
   Cada sección tiene una composición propia; no hay tarjetas ni paneles repetidos.
   ------------------------------------------------------------------------------------------------ */

const saveTheDate = () => downloadIcs(buildIcs({ events, date: eventDate, offset: eventOffset, title: calendar.title }));

/* Cuenta regresiva: solo en el cliente (evita desajustes de hidratación) y nunca muestra valores negativos. */
function CountdownRow() {
  const [c, setC] = useState<Countdown | null>(null);
  useEffect(() => {
    const tick = () => setC(getCountdown(weddingStart, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
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
  return (
    <section className="iv-welcome" id="nos-casamos" aria-labelledby="iv-welcome-title">
      <div className="iv-wrap">
        <h2 id="iv-welcome-title" className="iv-welcome-title">Save the date</h2>
        <p className="iv-welcome-date">{wedding.dateLabel}</p>
        <CountdownRow />
        <button type="button" className="iv-link iv-welcome-btn" onClick={saveTheDate}>
          <CalendarPlus size={16} aria-hidden="true" /><span>Guardar la fecha</span>
        </button>
      </div>
    </section>
  );
}

/* El día: lista editorial de momentos. La composición se adapta a 1..N eventos sin tarjetas ni huecos. */
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const eventDay = String(Number(eventDate.slice(8, 10)));
const eventMonth = MONTHS[Number(eventDate.slice(5, 7)) - 1] ?? '';

const eventIcons: Record<string, typeof RingsIcon> = { ceremonia: RingsIcon, recepcion: ToastIcon, fiesta: CakeIcon };

function TheDay() {
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
              return (
                <li key={ev.key} id={`ev-${ev.key}`}>
                  <span className="iv-card-icon" aria-hidden="true"><Icon size={34} strokeWidth={1.4} /></span>
                  <div className="iv-card-body">
                    <h3>{ev.label}</h3>
                    <div className="iv-when">
                      <p className="iv-when-cell"><span className="iv-when-n">{eventDay}</span><span className="iv-when-l">{eventMonth}</span></p>
                      <p className="iv-when-cell"><span className="iv-when-n">{ev.time.replace(/\s*hs\.?$/i, '')}</span><span className="iv-when-l">Horas</span></p>
                    </div>
                    <p className="iv-card-place">{ev.name}</p>
                    <p className="iv-card-addr">{ev.address}</p>
                    {events.length <= 2 && <p className="iv-card-note">{ev.note}</p>}
                    <a className="iv-card-map" href={ev.maps} target="_blank" rel="noopener noreferrer">
                      <span>Cómo llegar</span><span className="dm-sr"> a {ev.name} (se abre en una pestaña nueva)</span>
                    </a>
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
  return (
    <section className="iv-band iv-rsvp" id="confirmar" aria-labelledby="iv-rsvp-title">
      <div className="iv-wrap iv-rsvp-grid">
        <div>
          <h2 id="iv-rsvp-title" className="iv-h2">¿Venís?</h2>
        </div>
        <div className="iv-rsvp-action">
          <button type="button" className="iv-btn" onClick={rsvp.open}>Confirmar asistencia</button>
        </div>
      </div>
    </section>
  );
}

/* Fotos: tres retratos con el mismo tratamiento que las historias de la landing; el hashtag es un detalle al pie. */
function Photos() {
  const shots = [gallery[0], gallery[2], gallery[3]].filter((g): g is (typeof gallery)[number] => !!g);
  return (
    <section className="iv-section iv-photos" id="fotos" aria-label="Fotos">
      <div className="iv-wrap">
        <div className="iv-mosaic">
          {shots.map(g => (
            <figure key={g.src} className="iv-shot">
              <img src={g.src} alt={g.alt} style={{ objectPosition: g.pos }} loading="lazy" />
            </figure>
          ))}
        </div>
        <p className="iv-hashtag"><strong>{social.hashtag}</strong><span>Subí tus fotos y etiquetanos en {social.handle}.</span></p>
      </div>
    </section>
  );
}

/* Información práctica: dress code, cómo llegar y alojamiento en una fila; preguntas frecuentes debajo. Solo usa datos existentes. */
function Practical() {
  // Lugares únicos (la recepción y la fiesta comparten dirección).
  const places = events.filter((ev, i) => events.findIndex(e => e.address === ev.address) === i);
  const last = events[events.length - 1]!;
  const note = dressCode.text.replace(`${dressCode.title}. `, '');
  const faq: { q: string; a: React.ReactNode }[] = [
    { q: '¿Cuándo y dónde es?', a: `${wedding.dateLabel}. ${events.map(e => `${e.label}: ${e.time}, ${e.name}.`).join(' ')}` },
    { q: '¿Qué me pongo?', a: dressCode.text },
    { q: '¿Hasta cuándo puedo confirmar?', a: `Hasta el ${rsvpDeadline}.` },
    { q: '¿Cómo hago un regalo?', a: <>Elegí uno en la <Link to="/ejemplo/regalos" className="iv-inline">lista de regalos</Link> y transferí al alias {alias}.</> },
    { q: '¿Cómo comparto mis fotos?', a: `Con el hashtag ${social.hashtag}, etiquetando a ${social.handle}.` },
    { q: '¿Puedo sumar canciones?', a: 'Sí, en la playlist de esta página.' },
  ];
  return (
    <section className="iv-section iv-practical" id="info" aria-label="Información práctica">
      <div className="iv-wrap">
        <div className="iv-info-grid">
          <div id="dresscode">
            <h2 className="iv-h3">Dress code</h2>
            <p className="iv-strong">{dressCode.title}</p>
            <p className="iv-text">{note}</p>
            <ul className="iv-swatches" aria-label="Colores sugeridos">
              {dressCode.palette.map(c => <li key={c.name}><i style={{ background: c.color }} aria-hidden="true" /><span>{c.name}</span></li>)}
            </ul>
          </div>
          <div>
            <h2 className="iv-h3">Cómo llegar</h2>
            <ul className="iv-routes">
              {places.map(p => (
                <li key={p.address}>
                  <p className="iv-strong">{p.name}</p>
                  <p className="iv-text">{p.address}</p>
                  <a className="iv-link" href={directionsUrl(p.address)} target="_blank" rel="noopener noreferrer">
                    <span>Ver cómo llegar</span><ArrowUpRight size={14} aria-hidden="true" /><span className="dm-sr"> a {p.name} (se abre en una pestaña nueva)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="iv-h3">Alojamiento</h2>
            <p className="iv-text">Buscá alojamiento cerca de {last.address}.</p>
            <a className="iv-link" href={lodgingUrl(last.address)} target="_blank" rel="noopener noreferrer">
              <span>Ver alojamientos cerca</span><ArrowUpRight size={14} aria-hidden="true" /><span className="dm-sr"> (se abre en una pestaña nueva)</span>
            </a>
          </div>
        </div>
        <div className="iv-faq-wrap">
          <h2 className="iv-h3">Preguntas frecuentes</h2>
          <div className="iv-faq">
            {faq.map(f => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Mensajes para la pareja: se guardan solo en la sesión del navegador. */
type Msg = { who: string; text: string; mine?: boolean };
function Messages() {
  const [mine, setMine] = useSessionState<Msg[]>('messages', []);
  const [who, setWho] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (who.trim().length < 2 || text.trim().length < 2) { setErr('Completá tu nombre y tu mensaje.'); return; }
    setErr('');
    setMine(m => [{ who: who.trim(), text: text.trim(), mine: true }, ...m]);
    setWho(''); setText('');
  };
  const all: Msg[] = [...mine, ...greetings];
  return (
        <div id="mensajes" className="iv-part">
          <h2 className="iv-h3">Mensajes para Ignacio y Martina</h2>
          <form onSubmit={submit} noValidate className="iv-form">
            <label htmlFor="iv-msg-who">Tu nombre</label>
            <input id="iv-msg-who" type="text" value={who} onChange={e => { setWho(e.target.value); if (err) setErr(''); }} autoComplete="name" />
            <label htmlFor="iv-msg-text">Tu mensaje</label>
            <textarea id="iv-msg-text" rows={3} value={text} onChange={e => { setText(e.target.value); if (err) setErr(''); }} />
            {err && <p className="iv-error" role="alert">{err}</p>}
            <button type="submit" className="iv-btn">Enviar mensaje</button>
            <p className="iv-demo-note">Es una demostración: los mensajes quedan solo en tu navegador.</p>
          </form>
          <ul className="iv-msg-list" aria-label="Mensajes">
            {all.map((m, n) => (
              <li key={`${m.who}-${n}`}>
                <blockquote>{m.text}</blockquote>
                <p>{m.who}</p>
              </li>
            ))}
          </ul>
        </div>
  );
}

/* Playlist: secundaria y compacta (cinco temas visibles; el resto, plegado). */
function PlaylistBlock() {
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
        <div id="musica" className="iv-part">
          <h2 className="iv-h3">Tu música, nuestra playlist.</h2>
          <p className="iv-text">Sumá los temas que no pueden faltar en la pista.</p>
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

/* Participá: mensajes y playlist comparten una sola sección, en dos columnas. */
function Participate() {
  return (
    <section className="iv-section iv-participate" aria-label="Mensajes y playlist">
      <div className="iv-wrap iv-part-grid">
        <Messages />
        <PlaylistBlock />
      </div>
    </section>
  );
}

/* Cierre: fotografía, una frase y las dos acciones. */
function Closing() {
  const rsvp = useRsvp();
  return (
    <section className="iv-closing" style={{ backgroundImage: `url(${gallery[4]?.src ?? wedding.photo})` }} aria-labelledby="iv-close-title">
      <div className="iv-closing-copy">
        <h2 id="iv-close-title" className="iv-h2">Que vengas ya es un regalo.</h2>
        <p>Con todo cariño, Ignacio &amp; Martina.</p>
        <div className="iv-closing-actions">
          <button type="button" className="iv-btn is-paper" onClick={rsvp.open}>Confirmar asistencia</button>
          <Link to="/ejemplo/regalos" className="iv-closing-link"><span>Ver lista de regalos</span></Link>
        </div>
      </div>
    </section>
  );
}

function Invitation() {
  return <>
    <EjemploCover variant="home" next="#nos-casamos" />
    <Welcome />
    <TheDay />
    <RsvpBand />
    <Photos />
    <Practical />
    <Participate />
    <Closing />
  </>;
}
