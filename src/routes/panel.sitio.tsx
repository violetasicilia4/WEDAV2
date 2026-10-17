import { useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Eye, Plus, X } from 'lucide-react';
import { PhotoPicker } from '@/components/panel/couple-form';
import { Field, Locked, PreviewFrame, useToast } from '@/components/panel/ui';
import { readImage } from '@/lib/weda/images';
import { dateLabel, hasEventDetails, isSafeMapsUrl, mapsLink, sitePath, uid, validateOnboarding } from '@/lib/weda/logic';
import { can, planFor } from '@/lib/weda/plans';
import { update, useAppState } from '@/lib/weda/store';
import type { SiteConfig, SiteEvent } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/sitio')({ component: SiteEditor });

const MAX_PHOTOS = 6;

/** Cada cambio del editor se guarda al instante en el estado local; la vista previa lo toma sin recargar. */
const patchSite = (fn: (s: SiteConfig) => SiteConfig) => update(x => ({ ...x, site: fn(x.site) }));

type SectionId = 'portada' | 'ceremonia' | 'recepcion' | 'fiesta' | 'civil' | 'brunch' | 'rsvp' | 'dress' | 'fotos' | 'mensaje' | 'musica';
/** Dónde está cada sección en la página pública (para llevar la vista previa hasta ahí). */
const ANCHOR: Record<string, string> = { portada: '', ceremonia: 'dia', recepcion: 'dia', fiesta: 'dia', civil: 'dia', brunch: 'dia', rsvp: 'confirmar', dress: 'dresscode', fotos: 'fotos', mensaje: 'iv-close-title', musica: 'musica' };
type Tone = 'ok' | 'todo' | 'off';

type BlockProps = {
  id: SectionId; title: string; help: string; status: string; tone: Tone;
  enabled?: boolean | undefined; onToggle?: ((v: boolean) => void) | undefined;
  active: SectionId | null; onActive: (id: SectionId | null) => void; onSeeResult: (id: SectionId) => void;
  children: React.ReactNode;
};

/** Una sección de la página: qué ve el invitado, en qué estado está, mostrar/ocultar y, abierta, sus campos. Una sola abierta a la vez. */
function Block({ id, title, help, status, tone, enabled, onToggle, active, onActive, onSeeResult, children }: BlockProps) {
  const open = active === id;
  const hidden = enabled === false;
  return (
    <section className={`pn-sec${open ? ' is-open' : ''}${hidden ? ' is-off' : ''}`} aria-labelledby={`sec-${id}`}>
      <div className="pn-sec-head">
        <button type="button" className="pn-sec-main" aria-expanded={open} aria-controls={`sec-body-${id}`} onClick={() => onActive(open ? null : id)}>
          <span className="pn-sec-text">
            <strong id={`sec-${id}`}>{title}</strong>
          </span>
          <span className={`pn-sec-status is-${tone}`}>{status}</span>
          <ChevronDown size={18} aria-hidden="true" className="pn-sec-chev" />
        </button>
        {onToggle && (
          <label className="pn-sec-toggle"><input type="checkbox" checked={!!enabled} onChange={e => { onToggle(e.target.checked); if (e.target.checked) onActive(id); }} /><span>Mostrar</span></label>
        )}
      </div>
      {open && (
        <div className="pn-block-body" id={`sec-body-${id}`}>
          {hidden
            ? <p className="pn-note">Esta sección está oculta y tus invitados no la ven. Lo que ya cargaste se conserva: activá «Mostrar» para volver a usarla.</p>
            : <><p className="pn-muted">{help}</p>{children}<div className="pn-actions is-tight"><button type="button" className="pn-link" onClick={() => onSeeResult(id)}><Eye size={14} aria-hidden="true" />Ver cómo queda</button></div></>}
        </div>
      )}
    </section>
  );
}

/* Portada: foto, nombres, fecha y el texto sobre los nombres (puede quedar vacío). Todo se guarda al instante. */
function CoverFields() {
  const s = useAppState();
  const [first, setFirst] = useState(s.couple.first);
  const [second, setSecond] = useState(s.couple.second);
  const [noDate, setNoDate] = useState(!s.date);
  const [errors, setErrors] = useState<ReturnType<typeof validateOnboarding>>({});
  const commitNames = () => {
    const found = validateOnboarding({ first, second, date: '', noDate: true });
    setErrors({ ...(found.first ? { first: found.first } : {}), ...(found.second ? { second: found.second } : {}) });
    if (!found.first && !found.second) update(x => ({ ...x, couple: { first: first.trim(), second: second.trim() } }));
  };
  return (
    <>
      <PhotoPicker value={s.photo} onChange={p => update(x => ({ ...x, photo: p }))} />
      <div className="pn-two">
        <Field label="Tu nombre" error={errors.first}>{a => <input type="text" id={a.id} value={first} onChange={e => setFirst(e.target.value)} onBlur={commitNames} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
        <Field label="Nombre de tu pareja" error={errors.second}>{a => <input type="text" id={a.id} value={second} onChange={e => setSecond(e.target.value)} onBlur={commitNames} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
      </div>
      <Field label="Fecha del casamiento">{a => <input type="date" id={a.id} value={noDate ? '' : s.date ?? ''} disabled={noDate} onChange={e => update(x => ({ ...x, date: e.target.value || null }))} />}</Field>
      <label className="pn-check"><input type="checkbox" checked={noDate} onChange={e => { setNoDate(e.target.checked); if (e.target.checked) update(x => ({ ...x, date: null })); }} /><span>Todavía no tenemos fecha</span></label>
      <Field label="Texto sobre los nombres" optional hint="Por ejemplo «Nos casamos». Podés dejarlo vacío.">{a => <input id={a.id} type="text" value={s.site.coverText} placeholder="Nos casamos" onChange={e => patchSite(x => ({ ...x, coverText: e.target.value }))} />}</Field>
    </>
  );
}

type Shared = { active: SectionId | null; onActive: (id: SectionId | null) => void; onSeeResult: (id: SectionId) => void };

const SLOT: Record<string, number> = { ceremonia: 1, recepcion: 2, fiesta: 3, civil: 4, brunch: 5 };

function EventBlock({ ev, shared }: { ev: SiteEvent; shared: Shared }) {
  const set = (patch: Partial<SiteEvent>) => patchSite(s => ({ ...s, events: s.events.map(e => (e.key === ev.key ? { ...e, ...patch } : e)) }));
  const url = ev.mapsUrl.trim();
  const urlError = url && !isSafeMapsUrl(url) ? 'Usá un enlace de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…).' : undefined;
  const link = mapsLink(ev);
  const complete = ev.title.trim() !== '' && (ev.name.trim() !== '' || ev.address.trim() !== '');
  const status = !ev.enabled ? 'Oculta' : complete ? 'Completa' : hasEventDetails(ev) ? 'Falta completar' : 'Sin cargar';
  return (
    <Block id={ev.key as SectionId} title={ev.title.trim() || `Evento ${SLOT[ev.key]}`} help="Un momento del día, con el nombre que quieras: ceremonia, brindis, fiesta…" status={status} tone={!ev.enabled ? 'off' : complete ? 'ok' : 'todo'} enabled={ev.enabled} onToggle={v => set({ enabled: v })} {...shared}>
      <Field label="Nombre del evento">{a => <input id={a.id} type="text" value={ev.title} placeholder="Ceremonia, brindis, after beach…" onChange={e => set({ title: e.target.value })} />}</Field>
      <Field label="Nombre del lugar">{a => <input id={a.id} type="text" value={ev.name} placeholder="Parroquia San Isidro Labrador" onChange={e => set({ name: e.target.value })} />}</Field>
      <Field label="Dirección">{a => <input id={a.id} type="text" value={ev.address} placeholder="Calle 123, Ciudad" onChange={e => set({ address: e.target.value })} />}</Field>
      <Field label="Horario">{a => <input id={a.id} type="time" value={ev.time} onChange={e => set({ time: e.target.value })} />}</Field>
      <Field label="Nota para los invitados" optional>{a => <textarea id={a.id} rows={2} value={ev.note} onChange={e => set({ note: e.target.value })} />}</Field>
      <Field label="Enlace propio a Google Maps" optional error={urlError} hint="Si lo dejás vacío, armamos el enlace con la dirección.">
        {a => <input id={a.id} type="url" value={ev.mapsUrl} placeholder="https://maps.app.goo.gl/…" onChange={e => set({ mapsUrl: e.target.value })} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
      </Field>
      {link ? <a className="pn-link" href={link} target="_blank" rel="noopener noreferrer">Probar el enlace de «Cómo llegar» <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a> : <p className="pn-hint">Cargá el nombre o la dirección para que aparezca «Cómo llegar».</p>}
    </Block>
  );
}

function SiteEditor() {
  const s = useAppState();
  const toast = useToast();
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [active, setActive] = useState<SectionId | null>('portada');
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const [track, setTrack] = useState({ title: '', artist: '' });
  const [trackError, setTrackError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  if (!can(s.planId, 'site')) return <Locked feature="site" />;
  const site = s.site;
  const path = sitePath(s);
  const premium = can(s.planId, 'playlist');

  // Al abrir una sección, la vista previa (si está al lado) se lleva hasta ahí.
  const onActive = (id: SectionId | null) => { setActive(id); if (id) setAnchor(ANCHOR[id]); };
  const seeResult = (id: SectionId) => { setAnchor(ANCHOR[id]); setView('preview'); };
  const shared: Shared = { active, onActive, onSeeResult: seeResult };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - site.gallery.photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Entran hasta ${MAX_PHOTOS} fotos. Sumamos ${room}.`);
    for (const f of list) {
      try { const img = await readImage(f, 1100); patchSite(x => ({ ...x, gallery: { ...x.gallery, photos: [...x.gallery.photos, { id: uid('foto'), src: img.src, alt: '' }] } })); }
      catch (e) { toast(e instanceof Error ? e.message : 'No pudimos cargar la foto.', 'error'); }
    }
    if (photoRef.current) photoRef.current.value = '';
  };
  const movePhoto = (i: number, d: -1 | 1) => patchSite(x => { const p = [...x.gallery.photos]; const j = i + d; if (j < 0 || j >= p.length) return x; [p[i], p[j]] = [p[j]!, p[i]!]; return { ...x, gallery: { ...x.gallery, photos: p } }; });
  const addTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (track.title.trim().length < 2) { setTrackError('Escribí el nombre de la canción.'); return; }
    setTrackError('');
    patchSite(x => ({ ...x, playlist: { ...x.playlist, tracks: [...x.playlist.tracks, { title: track.title.trim(), artist: track.artist.trim() || 'Artista a confirmar' }] } }));
    setTrack({ title: '', artist: '' });
  };
  // Lo que falta, de forma discreta y con acceso directo a cada sección.
  const missing: { id: SectionId; label: string }[] = [
    ...(s.date ? [] : [{ id: 'portada' as SectionId, label: 'la fecha' }]),
    ...site.events.filter(e => e.enabled && !(e.title.trim() && (e.name.trim() || e.address.trim()))).map(e => ({ id: e.key as SectionId, label: e.title.trim() || `el evento ${SLOT[e.key]}` })),
    ...(site.dressCode.enabled && !site.dressCode.title.trim() ? [{ id: 'dress' as SectionId, label: 'el dress code' }] : []),
  ];
  const visibleCount = 1 + site.events.filter(e => e.enabled).length + [site.rsvp.enabled, site.dressCode.enabled, site.gallery.enabled, site.message.enabled, premium && site.playlist.enabled].filter(Boolean).length;

  return (
    <div className="pn-page pn-editor">
      <header className="pn-page-head">
        <div>
          <h1>Tu página web</h1>
          <p className="pn-sub">Tus invitados ven {visibleCount} {visibleCount === 1 ? 'sección' : 'secciones'}.</p>
        </div>
      </header>

      <div className="pn-switch pn-editor-switch" role="group" aria-label="Qué querés ver">
        <button type="button" className={view === 'edit' ? 'on' : ''} aria-pressed={view === 'edit'} onClick={() => setView('edit')}>Editar</button>
        <button type="button" className={view === 'preview' ? 'on' : ''} aria-pressed={view === 'preview'} onClick={() => setView('preview')}>Ver como invitado</button>
      </div>

      <div className="pn-editor-grid">
        <div className={`pn-editor-pane${view === 'preview' ? ' is-hidden' : ''}`}>
          {missing.length > 0 && (
            <p className="pn-missing">Falta completar:{' '}
              {missing.map((m, i) => <span key={m.id}>{i > 0 && ', '}<button type="button" className="pn-link" onClick={() => onActive(m.id)}>{m.label}</button></span>)}
            </p>
          )}
          <Block id="portada" title="Portada" help="Lo primero que ven tus invitados: tu foto, los nombres y la fecha." status={s.date ? 'Completa' : 'Falta la fecha'} tone={s.date ? 'ok' : 'todo'} {...shared}>
            <CoverFields />
            <label className="pn-check"><input type="checkbox" checked={site.countdown} onChange={e => patchSite(x => ({ ...x, countdown: e.target.checked }))} /><span>Mostrar la cuenta regresiva</span></label>
            {!s.date && <p className="pn-hint">La cuenta regresiva aparece cuando definas la fecha.</p>}
          </Block>

          {site.events.map(ev => <EventBlock key={ev.key} ev={ev} shared={shared} />)}

          <Block id="rsvp" title="Confirmación de asistencia" help="Tus invitados te avisan si van, desde la página." status={site.rsvp.enabled ? 'Visible' : 'Oculta'} tone={site.rsvp.enabled ? 'ok' : 'off'} enabled={site.rsvp.enabled} onToggle={v => patchSite(x => ({ ...x, rsvp: { ...x.rsvp, enabled: v } }))} {...shared}>
            <p className="pn-muted">Tus invitados confirman desde la página y las respuestas se suman solas a la solapa Invitados. No hace falta cargar nada.</p>
          </Block>

          <Block id="dress" title="Dress code" help="Cómo sugerís que se vistan." status={!site.dressCode.enabled ? 'Oculta' : site.dressCode.title.trim() ? 'Completa' : 'Falta el título'} tone={!site.dressCode.enabled ? 'off' : site.dressCode.title.trim() ? 'ok' : 'todo'} enabled={site.dressCode.enabled} onToggle={v => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, enabled: v } }))} {...shared}>
            <Field label="Título">{a => <input id={a.id} type="text" value={site.dressCode.title} placeholder="Elegante sport" onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, title: e.target.value } }))} />}</Field>
            <Field label="Texto" optional>{a => <textarea id={a.id} rows={3} value={site.dressCode.text} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, text: e.target.value } }))} />}</Field>
          </Block>

          <Block id="fotos" title="Fotos" help="Una galería con las fotos que quieran compartir." status={!site.gallery.enabled ? 'Oculta' : site.gallery.photos.length ? `${site.gallery.photos.length} ${site.gallery.photos.length === 1 ? 'foto' : 'fotos'}` : 'Sin fotos'} tone={!site.gallery.enabled ? 'off' : site.gallery.photos.length ? 'ok' : 'todo'} enabled={site.gallery.enabled} onToggle={v => patchSite(x => ({ ...x, gallery: { ...x.gallery, enabled: v } }))} {...shared}>
            {site.gallery.photos.length === 0 && <p className="pn-hint">Todavía no cargaste fotos. Con una alcanza para empezar.</p>}
            {site.gallery.photos.length > 0 && (
              <ul className="pn-photos">
                {site.gallery.photos.map((p, i) => (
                  <li key={p.id}>
                    <img src={p.src} alt="" />
                    <div className="pn-gactions">
                      <button type="button" className="pn-icon" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label={`Mover la foto ${i + 1} antes`}><ArrowUp size={15} aria-hidden="true" /></button>
                      <button type="button" className="pn-icon" onClick={() => movePhoto(i, 1)} disabled={i === site.gallery.photos.length - 1} aria-label={`Mover la foto ${i + 1} después`}><ArrowDown size={15} aria-hidden="true" /></button>
                      <button type="button" className="pn-icon" onClick={() => patchSite(x => ({ ...x, gallery: { ...x.gallery, photos: x.gallery.photos.filter(q => q.id !== p.id) } }))} aria-label={`Quitar la foto ${i + 1}`}><X size={15} aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <input ref={photoRef} className="pn-sr" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Elegir fotos" onChange={e => void addPhotos(e.target.files)} />
            <div className="pn-actions is-tight"><button type="button" className="pn-btn is-ghost is-small" disabled={site.gallery.photos.length >= MAX_PHOTOS} onClick={() => photoRef.current?.click()}><Plus size={15} aria-hidden="true" />Agregar fotos</button><span className="pn-hint">{site.gallery.photos.length} de {MAX_PHOTOS}. Se guardan en este dispositivo.</span></div>
            <Field label="Hashtag" optional>{a => <input id={a.id} type="text" value={site.gallery.hashtag} placeholder="#TomasYMartina2027" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, hashtag: e.target.value } }))} />}</Field>
            <Field label="Usuario de Instagram" optional>{a => <input id={a.id} type="text" value={site.gallery.handle} placeholder="@tomasymartina" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, handle: e.target.value } }))} />}</Field>
          </Block>

          <Block id="mensaje" title="Mensaje final" help="Unas palabras de cierre para tus invitados." status={site.message.enabled ? 'Visible' : 'Oculta'} tone={site.message.enabled ? 'ok' : 'off'} enabled={site.message.enabled} onToggle={v => patchSite(x => ({ ...x, message: { ...x.message, enabled: v } }))} {...shared}>
            <Field label="Frase">{a => <input id={a.id} type="text" value={site.message.title} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, title: e.target.value } }))} />}</Field>
            <Field label="Mensaje" optional hint="Si lo dejás vacío, usamos «Con todo cariño, …» con sus nombres.">{a => <textarea id={a.id} rows={3} value={site.message.text} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, text: e.target.value } }))} aria-describedby={a.describedBy} />}</Field>
          </Block>

          {premium ? (
            <Block id="musica" title="Música de la fiesta" help="Tus invitados suman las canciones que no pueden faltar." status={site.playlist.enabled ? `${site.playlist.tracks.length} temas` : 'Oculta'} tone={site.playlist.enabled ? 'ok' : 'off'} enabled={site.playlist.enabled} onToggle={v => patchSite(x => ({ ...x, playlist: { ...x.playlist, enabled: v } }))} {...shared}>
              <p className="pn-note">Es una lista armada acá, solo para la vista previa: no está conectada a Spotify ni a otro servicio de música.</p>
              <Field label="Nombre de la playlist" optional>{a => <input id={a.id} type="text" value={site.playlist.name} placeholder="Nuestra fiesta" onChange={e => patchSite(x => ({ ...x, playlist: { ...x.playlist, name: e.target.value } }))} />}</Field>
              <form onSubmit={addTrack} noValidate className="pn-inline-form is-tracks">
                <Field label="Canción" error={trackError || undefined}>{a => <input id={a.id} type="text" value={track.title} onChange={e => { setTrack(t => ({ ...t, title: e.target.value })); setTrackError(''); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
                <Field label="Artista" optional>{a => <input id={a.id} type="text" value={track.artist} onChange={e => setTrack(t => ({ ...t, artist: e.target.value }))} />}</Field>
                <button type="submit" className="pn-btn is-small">Agregar</button>
              </form>
              {site.playlist.tracks.length > 0 && (
                <ol className="pn-tracks">
                  {site.playlist.tracks.map((t, i) => (
                    <li key={`${t.title}-${i}`}><span><strong>{t.title}</strong> · {t.artist}</span><button type="button" className="pn-icon" aria-label={`Quitar ${t.title}`} onClick={() => patchSite(x => ({ ...x, playlist: { ...x.playlist, tracks: x.playlist.tracks.filter((_, k) => k !== i) } }))}><X size={15} aria-hidden="true" /></button></li>
                  ))}
                </ol>
              )}
            </Block>
          ) : (
            <section className="pn-sec is-locked" aria-labelledby="sec-musica">
              <div className="pn-sec-head"><div className="pn-sec-main is-static"><span className="pn-sec-text"><strong id="sec-musica">Música de la fiesta</strong><span className="pn-muted">No está en tu plan. Está disponible desde el plan {planFor('playlist')?.name}. <Link to="/crear/plan" className="pn-link">Ver los planes</Link></span></span></div></div>
            </section>
          )}
        </div>

        <div className={`pn-preview-pane${view === 'edit' ? ' is-hidden' : ''}`}>
          <div className="pn-preview-bar">
            <button type="button" className="pn-btn is-ghost is-small pn-back-edit" onClick={() => setView('edit')}>Volver a editar</button>
            <a className="pn-btn is-ghost is-small" href={path} target="_blank" rel="noopener noreferrer">Ver como invitado en otra pestaña <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
          <PreviewFrame path={path} device="mobile" anchor={anchor} />
        </div>
      </div>

    </div>
  );
}
