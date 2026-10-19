import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ExternalLink, Eye, Lock, Plus, X } from 'lucide-react';
import { PhotoPicker } from '@/components/panel/couple-form';
import { Field, Locked, PreviewFrame, useToast, usePlans } from '@/components/panel/ui';
import { readImage } from '@/lib/weda/images';
import { dateLabel, hasEventDetails, isSafeMapsUrl, mapsLink, sitePath, uid, validateOnboarding } from '@/lib/weda/logic';
import { eventComplete, sectionGaps } from '@/lib/weda/journey';
import { can, planFor, type Feature } from '@/lib/weda/plans';
import { update, useAppState } from '@/lib/weda/store';
import type { AppState, SiteConfig, SiteEvent } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/sitio')({ component: SiteEditor });

const MAX_PHOTOS = 6;

/** «Incluido en Completo»: solo para funciones que NO están en el plan base del sitio (lo que realmente diferencia los planes). */
const tagFor = (f: Feature): string | undefined => {
  const p = planFor(f), base = planFor('site');
  return p && base && p.id !== base.id ? `Incluido en ${p.name}` : undefined;
};

/** Cada cambio del editor se guarda al instante en el estado local; la vista previa lo toma sin recargar. */
const patchSite = (fn: (s: SiteConfig) => SiteConfig) => update(x => ({ ...x, site: fn(x.site) }));

/** Secciones del editor. «Eventos» agrupa los momentos del día (ceremonia, recepción…): cada uno se prende y edita por separado. */
type SectionId = 'portada' | 'eventos' | 'rsvp' | 'dress' | 'fotos' | 'mensaje' | 'musica';
type Tone = 'ok' | 'todo' | 'off';
type Sec = { id: SectionId; label: string; title: string; status: string; tone: Tone; locked?: Feature };
/** Dónde está cada sección en la página pública (para llevar la vista previa hasta ahí). */
const ANCHOR: Record<SectionId, string> = { portada: '', eventos: 'dia', rsvp: 'confirmar', dress: 'dresscode', fotos: 'fotos', mensaje: 'iv-close-title', musica: 'musica' };
const photoWord = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`;

/** Estado de cada sección, derivado de los datos reales (misma regla que el Inicio: eventComplete/sectionGaps). */
function sectionsOf(s: AppState): Sec[] {
  const site = s.site;
  const on = site.events.filter(e => e.enabled);
  const done = site.events.filter(eventComplete);
  const gaps = on.filter(e => !eventComplete(e));
  const dressOk = site.dressCode.title.trim() !== '' || site.dressCode.text.trim() !== '';
  const list: Sec[] = [
    { id: 'portada', label: 'Portada', title: 'Portada', status: s.date ? 'Completa' : 'Falta la fecha', tone: s.date ? 'ok' : 'todo' },
    { id: 'eventos', label: 'Eventos', title: 'Eventos', status: on.length === 0 ? 'Sin eventos' : gaps.length > 0 ? 'Falta completar' : `${done.length} ${done.length === 1 ? 'listo' : 'listos'}`, tone: on.length === 0 ? 'off' : gaps.length > 0 ? 'todo' : 'ok' },
    { id: 'rsvp', label: 'Confirmación', title: 'Confirmación de asistencia', status: site.rsvp.enabled ? 'Visible' : 'Oculta', tone: site.rsvp.enabled ? 'ok' : 'off' },
    { id: 'dress', label: 'Dress code', title: 'Dress code', status: !site.dressCode.enabled ? 'Oculta' : dressOk ? 'Completa' : 'Falta completar', tone: !site.dressCode.enabled ? 'off' : dressOk ? 'ok' : 'todo' },
  ];
  list.push(can(s.planId, 'gallery')
    ? { id: 'fotos', label: 'Fotos', title: 'Fotos', status: !site.gallery.enabled ? 'Oculta' : site.gallery.photos.length ? photoWord(site.gallery.photos.length) : 'Sin fotos', tone: !site.gallery.enabled ? 'off' : site.gallery.photos.length ? 'ok' : 'todo' }
    : { id: 'fotos', label: 'Fotos', title: 'Fotos', status: `Plan ${planFor('gallery')?.name}`, tone: 'off', locked: 'gallery' });
  list.push(can(s.planId, 'message')
    ? { id: 'mensaje', label: 'Mensaje final', title: 'Mensaje final', status: site.message.enabled ? 'Visible' : 'Oculta', tone: site.message.enabled ? 'ok' : 'off' }
    : { id: 'mensaje', label: 'Mensaje final', title: 'Mensaje final', status: `Plan ${planFor('message')?.name}`, tone: 'off', locked: 'message' });
  list.push(can(s.planId, 'playlist')
    ? { id: 'musica', label: 'Música', title: 'Música de la fiesta', status: site.playlist.enabled ? `${site.playlist.tracks.length} temas` : 'Oculta', tone: site.playlist.enabled ? 'ok' : 'off' }
    : { id: 'musica', label: 'Música', title: 'Música de la fiesta', status: `Plan ${planFor('playlist')?.name}`, tone: 'off', locked: 'playlist' });
  return list;
}

const useWide = () => useSyncExternalStore(
  cb => { const m = window.matchMedia('(min-width: 1100px)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
  () => window.matchMedia('(min-width: 1100px)').matches,
  () => false,
);

/** La sección elegida: título, estado, «Mostrar» (si se puede ocultar) y solo sus campos. */
function Panel({ sec, planTag, enabled, onToggle, onSee, children }: { sec: Sec; planTag?: string | undefined; enabled?: boolean | undefined; onToggle?: ((v: boolean) => void) | undefined; onSee: () => void; children: React.ReactNode }) {
  const plans = usePlans();
  if (sec.locked) {
    return (
      <section className="pn-spanel is-locked" aria-labelledby={`panel-${sec.id}`}>
        <header className="pn-spanel-head"><div><h2 id={`panel-${sec.id}`}>{sec.title}</h2></div></header>
        <p className="pn-note"><Lock size={14} aria-hidden="true" /> No está en tu plan: está en el plan {planFor(sec.locked)?.name}. Lo que cargaste se conserva como borrador. <button type="button" className="pn-link" onClick={plans.open}>Ver los planes</button></p>
      </section>
    );
  }
  return (
    <section className="pn-spanel" aria-labelledby={`panel-${sec.id}`}>
      <header className="pn-spanel-head">
        <div>
          <h2 id={`panel-${sec.id}`}>{sec.title}{planTag && <em className="pn-plantag">{planTag}</em>}</h2>
          <p className={`pn-sec-status is-${sec.tone}`}>{sec.status}</p>
        </div>
        {onToggle && <label className="pn-sec-toggle"><input type="checkbox" checked={!!enabled} onChange={e => onToggle(e.target.checked)} /><span>Mostrar</span></label>}
      </header>
      {enabled === false
        ? <p className="pn-note">Esta sección está oculta y tus invitados no la ven. Lo que ya cargaste se conserva: activá «Mostrar» para volver a usarla.</p>
        : <>{children}<div className="pn-spanel-foot"><button type="button" className="pn-link" onClick={onSee}><Eye size={14} aria-hidden="true" />Ver en la vista previa</button></div></>}
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


const SLOT: Record<string, number> = { ceremonia: 1, recepcion: 2, fiesta: 3, civil: 4, brunch: 5 };

/** Un momento del día: fila compacta con estado y «Mostrar»; abierta, muestra solo sus campos. */
function EventRow({ ev, open, onOpen }: { ev: SiteEvent; open: boolean; onOpen: (k: SiteEvent['key'] | null) => void }) {
  const set = (patch: Partial<SiteEvent>) => patchSite(s => ({ ...s, events: s.events.map(e => (e.key === ev.key ? { ...e, ...patch } : e)) }));
  const url = ev.mapsUrl.trim();
  const urlError = url && !isSafeMapsUrl(url) ? 'Usá un enlace de Google Maps (https://maps.app.goo.gl/… o https://www.google.com/maps/…).' : undefined;
  const link = mapsLink(ev);
  const complete = eventComplete(ev);
  const status = !ev.enabled ? 'Oculta' : complete ? 'Completa' : hasEventDetails(ev) ? 'Falta completar' : 'Sin cargar';
  const title = ev.title.trim() || `Evento ${SLOT[ev.key]}`;
  const tone: Tone = !ev.enabled ? 'off' : complete ? 'ok' : 'todo';
  return (
    <li className={`pn-ev${open ? ' is-open' : ''}${ev.enabled ? '' : ' is-off'}`}>
      <div className="pn-ev-head">
        <button type="button" className="pn-ev-main" id={`sec-${ev.key}`} aria-expanded={open} aria-controls={`ev-body-${ev.key}`} onClick={() => onOpen(open ? null : ev.key)}>
          <span className="pn-ev-title">{title}</span>
          <span className={`pn-sec-status is-${tone}`}>{status}</span>
          <ChevronDown size={18} aria-hidden="true" className="pn-sec-chev" />
        </button>
        <label className="pn-sec-toggle"><input type="checkbox" checked={ev.enabled} onChange={e => { set({ enabled: e.target.checked }); if (e.target.checked) onOpen(ev.key); }} aria-label={`Mostrar ${title}`} /><span>Mostrar</span></label>
      </div>
      {open && (
        <div className="pn-ev-body" id={`ev-body-${ev.key}`}>
          {!ev.enabled ? <p className="pn-note">Este evento está oculto y tus invitados no lo ven. Lo que cargaste se conserva: activá «Mostrar» para volver a usarlo.</p> : <>
      <Field label="Nombre del evento">{a => <input id={a.id} type="text" value={ev.title} placeholder="Ceremonia, brindis, after beach…" onChange={e => set({ title: e.target.value })} />}</Field>
      <Field label="Nombre del lugar">{a => <input id={a.id} type="text" value={ev.name} placeholder="Parroquia San Isidro Labrador" onChange={e => set({ name: e.target.value })} />}</Field>
      <Field label="Dirección">{a => <input id={a.id} type="text" value={ev.address} placeholder="Calle 123, Ciudad" onChange={e => set({ address: e.target.value })} />}</Field>
      <Field label="Horario">{a => <input id={a.id} type="time" value={ev.time} onChange={e => set({ time: e.target.value })} />}</Field>
      <details className="pn-more" open={!!(ev.note || ev.mapsUrl)}>
        <summary>Más opciones: nota y enlace de Maps</summary>
        <div className="pn-more-body">
          <Field label="Nota para los invitados" optional>{a => <textarea id={a.id} rows={2} value={ev.note} onChange={e => set({ note: e.target.value })} />}</Field>
          <Field label="Enlace propio a Google Maps" optional error={urlError} hint="Si lo dejás vacío, armamos el enlace con la dirección.">
            {a => <input id={a.id} type="url" value={ev.mapsUrl} placeholder="https://maps.app.goo.gl/…" onChange={e => set({ mapsUrl: e.target.value })} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
        </div>
      </details>
      {link ? <a className="pn-link" href={link} target="_blank" rel="noopener noreferrer">Probar el enlace de «Cómo llegar» <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a> : <p className="pn-hint">Cargá el nombre o la dirección para que aparezca «Cómo llegar».</p>}
          </>}
        </div>
      )}
    </li>
  );
}

function SiteEditor() {
  const s = useAppState();
  const toast = useToast();
  const wide = useWide();
  const [active, setActive] = useState<SectionId>('portada');
  const [openEv, setOpenEv] = useState<SiteEvent['key'] | null>(() => s.site.events.find(e => e.enabled)?.key ?? null);
  const [anchor, setAnchor] = useState<string | undefined>(undefined);
  const [jump, setJump] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [track, setTrack] = useState({ title: '', artist: '' });
  const [trackError, setTrackError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!can(s.planId, 'site')) return <Locked feature="site" />;
  const site = s.site;
  const path = sitePath(s);
  const sections = sectionsOf(s);
  const sec = sections.find(x => x.id === active)!;
  const visibleCount = 1 + site.events.filter(e => e.enabled).length + [site.rsvp.enabled, site.dressCode.enabled, can(s.planId, 'gallery') && site.gallery.enabled, can(s.planId, 'message') && site.message.enabled, can(s.planId, 'playlist') && site.playlist.enabled].filter(Boolean).length;

  // Elegir una sección lleva la vista previa (si está al lado) hasta ahí y deja el formulario a la vista.
  const pick = (id: SectionId) => {
    setActive(id); setAnchor(ANCHOR[id]);
    if (!wide) window.setTimeout(() => panelRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 0);
  };
  // «Ver en la vista previa»: al lado en pantallas grandes; en el celular se abre a pantalla completa.
  const see = (id: SectionId) => { setAnchor(ANCHOR[id]); setJump(n => n + 1); if (!wide) setPreviewing(true); };

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
  const flag = (k: 'rsvp' | 'dressCode' | 'gallery' | 'message' | 'playlist') => (v: boolean) => patchSite(x => ({ ...x, [k]: { ...x[k], enabled: v } }));

  return (
    <div className="pn-page pn-editor">
      <header className="pn-page-head is-compact">
        <div>
          <h1>Tu página</h1>
          <p className="pn-sub">Tus invitados ven {visibleCount} {visibleCount === 1 ? 'sección' : 'secciones'}.</p>
        </div>
        {!wide && <button type="button" className="pn-btn" onClick={() => { setAnchor(ANCHOR[active]); setPreviewing(true); }}><Eye size={16} aria-hidden="true" />Vista previa</button>}
      </header>

      <div className="pn-editor-grid">
        <nav className="pn-snav" aria-label="Secciones de tu página">
          <ul>
            {sections.map(x => (
              <li key={x.id}>
                <button type="button" id={`sec-${x.id}`} className={`pn-snav-btn${active === x.id ? ' on' : ''}`} aria-current={active === x.id ? 'true' : undefined} onClick={() => pick(x.id)}>
                  <i className={`pn-sdot is-${x.tone}`} aria-hidden="true" />{x.label}<span className="pn-sr"> · {x.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pn-editor-pane" ref={panelRef}>
          {active === 'portada' && (
            <Panel sec={sec} onSee={() => see('portada')}>
              <CoverFields />
              <label className="pn-check"><input type="checkbox" checked={site.countdown} onChange={e => patchSite(x => ({ ...x, countdown: e.target.checked }))} /><span>Mostrar la cuenta regresiva</span></label>
              {!s.date && <p className="pn-hint">La cuenta regresiva aparece cuando definas la fecha.</p>}
            </Panel>
          )}
          {active === 'eventos' && (
            <Panel sec={sec} onSee={() => see('eventos')}>
              <ul className="pn-evlist">{site.events.map(ev => <EventRow key={ev.key} ev={ev} open={openEv === ev.key} onOpen={k => { setOpenEv(k); if (k) setAnchor('dia'); }} />)}</ul>
            </Panel>
          )}
          {active === 'rsvp' && (
            <Panel sec={sec} enabled={site.rsvp.enabled} onToggle={flag('rsvp')} onSee={() => see('rsvp')}>
            <p className="pn-muted">Tus invitados confirman desde la página y las respuestas se suman solas a la solapa Invitados. No hace falta cargar nada.</p>
            </Panel>
          )}
          {active === 'dress' && (
            <Panel sec={sec} enabled={site.dressCode.enabled} onToggle={flag('dressCode')} onSee={() => see('dress')}>
            <Field label="Título">{a => <input id={a.id} type="text" value={site.dressCode.title} placeholder="Elegante sport" onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, title: e.target.value } }))} />}</Field>
            <Field label="Texto" optional>{a => <textarea id={a.id} rows={3} value={site.dressCode.text} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, text: e.target.value } }))} />}</Field>
            </Panel>
          )}
          {active === 'fotos' && (
            <Panel sec={sec} planTag={tagFor('gallery')} enabled={site.gallery.enabled} onToggle={flag('gallery')} onSee={() => see('fotos')}>
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
            <div className="pn-actions is-tight"><button type="button" className="pn-btn is-ghost is-small" disabled={site.gallery.photos.length >= MAX_PHOTOS} onClick={() => photoRef.current?.click()}><Plus size={15} aria-hidden="true" />Agregar fotos</button><span className="pn-hint">{site.gallery.photos.length >= MAX_PHOTOS ? `Llegaste al máximo de ${MAX_PHOTOS} fotos. Quitá alguna para sumar otra.` : `${site.gallery.photos.length} de ${MAX_PHOTOS}. Se guardan en este dispositivo.`}</span></div>
            <Field label="Hashtag" optional>{a => <input id={a.id} type="text" value={site.gallery.hashtag} placeholder="#TomasYMartina2027" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, hashtag: e.target.value } }))} />}</Field>
            <Field label="Usuario de Instagram" optional>{a => <input id={a.id} type="text" value={site.gallery.handle} placeholder="@tomasymartina" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, handle: e.target.value } }))} />}</Field>
            </Panel>
          )}
          {active === 'mensaje' && (
            <Panel sec={sec} planTag={tagFor('message')} enabled={site.message.enabled} onToggle={flag('message')} onSee={() => see('mensaje')}>
            <Field label="Frase">{a => <input id={a.id} type="text" value={site.message.title} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, title: e.target.value } }))} />}</Field>
            <Field label="Mensaje" optional hint="Si lo dejás vacío, usamos «Con todo cariño, …» con sus nombres.">{a => <textarea id={a.id} rows={3} value={site.message.text} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, text: e.target.value } }))} aria-describedby={a.describedBy} />}</Field>
            </Panel>
          )}
          {active === 'musica' && (
            <Panel sec={sec} planTag={tagFor('playlist')} enabled={site.playlist.enabled} onToggle={flag('playlist')} onSee={() => see('musica')}>
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
            </Panel>
          )}
        </div>

        {wide && (
          <div className="pn-preview-pane">
            <div className="pn-preview-bar">
              <p className="pn-edit-label">Vista previa</p>
              <a className="pn-link" href={path} target="_blank" rel="noopener noreferrer">Abrir vista limpia <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a>
            </div>
            <PreviewFrame path={path} device="mobile" anchor={anchor} jump={jump} />
          </div>
        )}
      </div>

      {!wide && previewing && <PreviewSheet path={path} anchor={anchor} jump={jump} onClose={() => setPreviewing(false)} />}
    </div>
  );
}

/** Vista previa a pantalla completa (celular): la misma página pública, con una salida clara de vuelta a la edición. */
function PreviewSheet({ path, anchor, jump, onClose }: { path: string; anchor: string | undefined; jump: number; onClose: () => void }) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    back.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); opener?.focus?.(); };
  }, [onClose]);
  return (
    <div className="pn-pvfull" role="dialog" aria-modal="true" aria-label="Vista previa de tu página">
      <div className="pn-pvfull-bar">
        <button type="button" ref={back} className="pn-btn is-ghost" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />Volver a editar</button>
        <a className="pn-link" href={path} target="_blank" rel="noopener noreferrer">Abrir vista limpia <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a>
      </div>
      <PreviewFrame path={path} device="mobile" anchor={anchor} jump={jump} />
    </div>
  );
}
