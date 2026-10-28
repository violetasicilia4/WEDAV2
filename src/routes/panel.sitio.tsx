import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, Type, ArrowUp, CalendarClock, CalendarDays, Check, ChevronDown, CircleAlert, ExternalLink, EyeOff, Gift as GiftIcon, MapPin, Image as ImageIcon, Images, Lock, MessageSquareText, Music, Plus, Shirt, UserCheck, X, type LucideIcon } from 'lucide-react';
import { EVENT_ICONS } from '@/components/event-icons';
import { PhotoPicker } from '@/components/panel/couple-form';
import { PlaceSearch } from '@/components/panel/place-search';
import { LiveCard, useKeyboardState } from '@/components/panel/live-card';
import { SitePreview, type Device, type PreviewSection } from '@/components/panel/site-preview';
import { Field, Locked, useToast, usePlans } from '@/components/panel/ui';
import { placesEnabled } from '@/lib/weda/google-places';
import { readImage } from '@/lib/weda/images';
import { DEFAULT_GIFTS_BUTTON, DEFAULT_GIFTS_TEXT, DEFAULT_GIFTS_TITLE, defaultColors, hasEventDetails, isHexColor, isSafeMapsUrl, mapsLink, moveBlock, sitePath, spotifyEmbed, uid, validateOnboarding } from '@/lib/weda/logic';
import { eventBlank, eventComplete } from '@/lib/weda/journey';
import { can, planFor, type Feature } from '@/lib/weda/plans';
import { openPreview } from '@/lib/weda/preview-event';
import { update, useAppState } from '@/lib/weda/store';
import type { AppState, BlockId, SiteConfig, SiteEvent } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/sitio')({ component: SiteEditor });

/** Horarios cada 15 minutos (siempre en punto: 20:00, no 20:01). */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
const MAX_PHOTOS = 6;

/** «Incluido en Celebración Plus»: solo para funciones que NO están en el plan base del sitio (lo que realmente diferencia los planes). */
const tagFor = (f: Feature): string | undefined => {
  const p = planFor(f), base = planFor('site');
  return p && base && p.id !== base.id ? `Incluido en ${p.name}` : undefined;
};

/** Cada cambio del editor se guarda al instante en el estado local; la vista previa lo toma sin recargar. */
const patchSite = (fn: (s: SiteConfig) => SiteConfig) => update(x => ({ ...x, site: fn(x.site) }));

/** Secciones del editor. «Eventos» agrupa los momentos del día (ceremonia, recepción…): cada uno se prende y edita por separado. */
type SectionId = 'portada' | 'fecha' | 'eventos' | 'regalos' | 'rsvp' | 'dress' | 'texto' | 'fotos' | 'mensaje' | 'musica';
type Tone = 'ok' | 'todo' | 'off';
type Sec = { id: SectionId; label: string; title: string; status: string; tone: Tone; locked?: Feature };
const ICON: Record<SectionId, LucideIcon> = { portada: ImageIcon, fecha: CalendarClock, eventos: CalendarDays, regalos: GiftIcon, rsvp: UserCheck, dress: Shirt, texto: Type, fotos: Images, mensaje: MessageSquareText, musica: Music };
/** Dónde está cada sección en la página pública (para llevar la vista previa hasta ahí). */
const ANCHOR: Record<SectionId, string> = { portada: '', fecha: 'save-the-date', eventos: 'dia', regalos: 'regalos', rsvp: 'confirmar', dress: 'dresscode', texto: 'texto', fotos: 'fotos', mensaje: 'iv-close-title', musica: 'musica' };
/** Estado de la sección con forma además de color: tilde = lista, aviso = falta algo, ojo tachado = oculta o fuera del plan. */
const STATUS_ICON: Record<Tone, LucideIcon> = { ok: Check, todo: CircleAlert, off: EyeOff };
/** Para qué sirve cada sección, en una línea (se muestra en «Para agregar»). */
const PURPOSE: Record<SectionId, string> = {
  portada: 'Foto, nombres y fecha', fecha: 'Fecha y cuenta regresiva', eventos: 'Horarios y lugares', regalos: 'Acceso a tu lista', texto: 'Un mensaje propio', rsvp: 'Respuestas de tus invitados', dress: 'Cómo vestirse',
  fotos: 'Galería y hashtag', mensaje: 'Palabras de cierre', musica: 'Tu playlist en la invitación',
};
/** Las secciones que se pueden reordenar y su id en el orden guardado. */
const BLOCK_SECTION: Record<BlockId, SectionId> = { fecha: 'fecha', eventos: 'eventos', regalos: 'regalos', rsvp: 'rsvp', dress: 'dress', texto: 'texto', fotos: 'fotos', musica: 'musica', mensaje: 'mensaje' };
const photoWord = (n: number) => `${n} ${n === 1 ? 'foto' : 'fotos'}`;

/** Estado de cada sección, derivado de los datos reales (misma regla que el Inicio: eventComplete/sectionGaps). */
function sectionsOf(s: AppState): Sec[] {
  const site = s.site;
  const on = site.events.filter(e => e.enabled);
  const done = site.events.filter(eventComplete);
  const gaps = on.filter(e => !eventComplete(e) && !eventBlank(e));
  const dressOk = site.dressCode.title.trim() !== '' || site.dressCode.text.trim() !== '';
  const list: Sec[] = [
    { id: 'portada', label: 'Portada', title: 'Portada', status: s.date ? 'Completa' : 'Falta la fecha', tone: s.date ? 'ok' : 'todo' },
    { id: 'fecha', label: 'Save the date', title: 'Save the date y cuenta regresiva', status: s.date ? (site.countdown ? 'Con cuenta regresiva' : 'Sin cuenta regresiva') : 'Aparece al definir la fecha', tone: s.date ? 'ok' : 'off' },
    { id: 'eventos', label: 'Eventos', title: 'Eventos', status: on.length === 0 ? 'Sin eventos' : gaps.length > 0 ? 'Falta completar' : done.length === 0 ? 'Sin cargar' : `${done.length} ${done.length === 1 ? 'listo' : 'listos'}`, tone: on.length === 0 ? 'off' : gaps.length > 0 || done.length === 0 ? 'todo' : 'ok' },
    { id: 'rsvp', label: 'Confirmación', title: 'Confirmación de asistencia', status: site.rsvp.enabled ? 'Visible' : 'Oculta', tone: site.rsvp.enabled ? 'ok' : 'off' },
    { id: 'dress', label: 'Dress code', title: 'Dress code', status: !site.dressCode.enabled ? 'Oculta' : dressOk ? 'Completa' : 'Falta completar', tone: !site.dressCode.enabled ? 'off' : dressOk ? 'ok' : 'todo' },
  ];
  const gifts = s.gifts.items.length;
  list.push(can(s.planId, 'gifts')
    ? { id: 'regalos', label: 'Regalos', title: 'Regalos', status: !site.giftsSection.enabled ? 'Oculta' : gifts === 0 ? 'Todavía sin regalos' : `${gifts} ${gifts === 1 ? 'regalo' : 'regalos'}`, tone: !site.giftsSection.enabled ? 'off' : gifts === 0 ? 'todo' : 'ok' }
    : { id: 'regalos', label: 'Regalos', title: 'Regalos', status: `Plan ${planFor('gifts')?.name}`, tone: 'off', locked: 'gifts' });
  const noteOk = site.note.title.trim() !== '' || site.note.text.trim() !== '';
  list.push({ id: 'texto', label: 'Texto libre', title: 'Texto libre', status: !site.note.enabled ? 'Oculta' : noteOk ? 'Completa' : 'Falta completar', tone: !site.note.enabled ? 'off' : noteOk ? 'ok' : 'todo' });
  list.push(can(s.planId, 'gallery')
    ? { id: 'fotos', label: 'Fotos', title: 'Fotos', status: !site.gallery.enabled ? 'Oculta' : site.gallery.photos.length ? photoWord(site.gallery.photos.length) : 'Sin fotos', tone: !site.gallery.enabled ? 'off' : site.gallery.photos.length ? 'ok' : 'todo' }
    : { id: 'fotos', label: 'Fotos', title: 'Fotos', status: `Plan ${planFor('gallery')?.name}`, tone: 'off', locked: 'gallery' });
  list.push(can(s.planId, 'message')
    ? { id: 'mensaje', label: 'Mensaje final', title: 'Mensaje final', status: site.message.enabled ? 'Visible' : 'Oculta', tone: site.message.enabled ? 'ok' : 'off' }
    : { id: 'mensaje', label: 'Mensaje final', title: 'Mensaje final', status: `Plan ${planFor('message')?.name}`, tone: 'off', locked: 'message' });
  list.push(can(s.planId, 'playlist')
    ? (() => {
        const linked = !!spotifyEmbed(site.playlist.spotify), n = site.playlist.tracks.length;
        return { id: 'musica' as const, label: 'Playlist de Spotify', title: 'Playlist de Spotify', status: !site.playlist.enabled ? 'Oculta' : linked ? 'Conectada' : n ? `${n} temas` : 'Falta el link', tone: (!site.playlist.enabled ? 'off' : linked || n ? 'ok' : 'todo') as Tone };
      })()
    : { id: 'musica', label: 'Playlist de Spotify', title: 'Playlist de Spotify', status: `Plan ${planFor('playlist')?.name}`, tone: 'off', locked: 'playlist' });
  // Mismo orden de fábrica que la página: así «Para agregar» las muestra donde van.
  const rank: SectionId[] = ['portada', 'fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica', 'mensaje'];
  return list.sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id));
}

/** La sección elegida: título, estado y solo sus campos. Agregar, quitar y ordenar viven en la estructura de la invitación. */
function Panel({ sec, planTag, children }: { sec: Sec; planTag?: string | undefined; children: React.ReactNode }) {
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
      </header>
      {children}
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
      <Field label="Texto sobre los nombres" optional>{a => <input id={a.id} type="text" value={s.site.coverText} placeholder="Nos casamos" onChange={e => patchSite(x => ({ ...x, coverText: e.target.value }))} />}</Field>
    </>
  );
}


const SLOT: Record<string, number> = { ceremonia: 1, recepcion: 2, fiesta: 3, civil: 4, brunch: 5 };

/** Un momento del día: fila compacta con estado y «Mostrar»; abierta, muestra solo sus campos. */
function EventRow({ ev, open, onOpen }: { ev: SiteEvent; open: boolean; onOpen: (k: SiteEvent['key'] | null) => void }) {
  const set = (patch: Partial<SiteEvent>) => patchSite(s => ({ ...s, events: s.events.map(e => (e.key === ev.key ? { ...e, ...patch } : e)) }));
  const link = mapsLink(ev);
  const complete = eventComplete(ev);
  const status = !ev.enabled ? 'Oculta' : complete ? 'Completa' : hasEventDetails(ev) || ev.title.trim() ? 'Falta completar' : 'Sin cargar';
  const title = ev.title.trim() || `Evento ${SLOT[ev.key]}`;
  const tone: Tone = !ev.enabled || eventBlank(ev) ? 'off' : complete ? 'ok' : 'todo';
  return (
    <li className={`pn-ev${open ? ' is-open' : ''}${ev.enabled ? '' : ' is-off'}`}>
      <div className="pn-ev-head">
        <button type="button" className="pn-ev-main" id={`sec-${ev.key}`} aria-expanded={open} aria-controls={`ev-body-${ev.key}`} onClick={() => onOpen(open ? null : ev.key)}>
          <span className="pn-ev-title">{title}</span>
          <span className={`pn-sec-status is-${tone}`}>{status}</span>
          <ChevronDown size={18} aria-hidden="true" className="pn-sec-chev" />
        </button>
        <label className="pn-sec-toggle"><input type="checkbox" checked={ev.enabled} onChange={e => set({ enabled: e.target.checked })} aria-label={`Mostrar ${title}`} /><span>Mostrar</span></label>
      </div>
      {open && (
        <div className="pn-ev-body" id={`ev-body-${ev.key}`}>
          {!ev.enabled ? <p className="pn-note">Activá «Mostrar» para editarlo.</p> : <>
      <Field label="Nombre del evento">{a => <input id={a.id} type="text" value={ev.title} placeholder="Ceremonia, brindis, after beach…" onChange={e => set({ title: e.target.value })} />}</Field>
      <fieldset className="ed-icons">
        <legend>Ícono</legend>
        <div className="ed-icons-grid" role="radiogroup" aria-label={`Ícono de ${title}`}>
          {EVENT_ICONS.map(i => (
            <label key={i.id} className={`ed-ico-opt${ev.icon === i.id ? ' on' : ''}`} title={i.label}>
              <input type="radio" name={`ico-${ev.key}`} className="pn-sr" checked={ev.icon === i.id} onChange={() => set({ icon: i.id })} aria-label={i.label} />
              <i.Icon size={30} strokeWidth={1.5} />
            </label>
          ))}
        </div>
      </fieldset>
      {placesEnabled() && (
        <PlaceSearch
          confirmed={ev.mapsUrl.trim() && isSafeMapsUrl(ev.mapsUrl) ? { name: ev.name, address: ev.address, mapsUrl: ev.mapsUrl.trim() } : null}
          onPick={p => set({ name: p.name, address: p.address, mapsUrl: p.mapsUrl })}
        />
      )}
      <Field label="Nombre del lugar">{a => <input id={a.id} type="text" value={ev.name} placeholder="Parroquia San Isidro Labrador" onChange={e => set({ name: e.target.value })} />}</Field>
      {!placesEnabled() && <Field label="Dirección">{a => <input id={a.id} type="text" value={ev.address} placeholder="Calle 123, Ciudad" onChange={e => set({ address: e.target.value, mapsUrl: '' })} />}</Field>}
      <Field label="Horario" optional>{a => (
        <select id={a.id} value={ev.time} onChange={e => set({ time: e.target.value })}>
          <option value="">Sin horario</option>
          {(ev.time && !TIME_OPTIONS.includes(ev.time) ? [ev.time, ...TIME_OPTIONS].sort() : TIME_OPTIONS).map(t => <option key={t} value={t}>{t} hs</option>)}
        </select>
      )}</Field>
      <details className="pn-more" open={!!ev.note}>
        <summary>Más opciones: nota para los invitados</summary>
        <div className="pn-more-body">
          <Field label="Nota para los invitados" optional>{a => <textarea id={a.id} rows={2} value={ev.note} onChange={e => set({ note: e.target.value })} />}</Field>
        </div>
      </details>
      {!placesEnabled() && (link ? <a className="pn-link" href={link} target="_blank" rel="noopener noreferrer">Probar el enlace de «Cómo llegar» <ExternalLink size={13} aria-hidden="true" /><span className="pn-sr"> (se abre en una pestaña nueva)</span></a> : <p className="pn-hint">Cargá el nombre o la dirección para que aparezca «Cómo llegar».</p>)}
          </>}
        </div>
      )}
    </li>
  );
}


/** ¿La sección está en la invitación? (Una sección fuera del plan nunca está.) */
function isOn(s: AppState, id: SectionId): boolean {
  const site = s.site;
  switch (id) {
    case 'portada': return true;
    case 'fecha': return site.saveDate;            // sin fecha, el bloque espera: «Aparece al definir la fecha»
    case 'eventos': return site.events.some(e => e.enabled);
    case 'regalos': return site.giftsSection.enabled && can(s.planId, 'gifts');
    case 'texto': return site.note.enabled;
    case 'rsvp': return site.rsvp.enabled;
    case 'dress': return site.dressCode.enabled;
    case 'fotos': return site.gallery.enabled && can(s.planId, 'gallery');
    case 'mensaje': return site.message.enabled && can(s.planId, 'message');
    case 'musica': return site.playlist.enabled && can(s.planId, 'playlist');
  }
}
/** Agregar o quitar una sección: solo cambia si se muestra; todo lo que cargó la pareja se conserva. */
function setOn(id: SectionId, v: boolean) {
  patchSite(x => {
    switch (id) {
      case 'regalos': return { ...x, giftsSection: { ...x.giftsSection, enabled: v } };
      case 'texto': return { ...x, note: { ...x.note, enabled: v } };
      case 'rsvp': return { ...x, rsvp: { ...x.rsvp, enabled: v } };
      case 'dress': return { ...x, dressCode: { ...x.dressCode, enabled: v } };
      case 'fotos': return { ...x, gallery: { ...x.gallery, enabled: v } };
      case 'mensaje': return { ...x, message: { ...x.message, enabled: v } };
      case 'musica': return { ...x, playlist: { ...x.playlist, enabled: v } };
      case 'fecha': return { ...x, saveDate: v };
      case 'eventos': return !v ? { ...x, events: x.events.map(e => ({ ...e, enabled: false })) } : !x.events.some(e => e.enabled) ? { ...x, events: x.events.map((e, i) => (i === 0 ? { ...e, enabled: true } : e)) } : x;
      default: return x;
    }
  });
}
/** Solo la portada es obligatoria: todo lo demás se puede quitar (y volver a agregar con lo que se había cargado). */
const REMOVABLE: SectionId[] = ['fecha', 'eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica', 'mensaje'];

type Row = { id: SectionId; sec?: Sec; label: string; status: string; tone: Tone; movable: boolean; removable: boolean; fixed?: string };

function SiteEditor() {
  const s = useAppState();
  const toast = useToast();
  const plans = usePlans();
  // `null` = la estructura de la invitación; una sección = su edición.
  const [sel, setSel] = useState<SectionId | null>(null);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<Device>(() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches ? 'desktop' : 'mobile'));
  const [jump, setJump] = useState(0);
  const [announce, setAnnounce] = useState('');
  // Los eventos arrancan cerrados: se abre el que la pareja toque.
  const [openEv, setOpenEv] = useState<SiteEvent['key'] | null>(null);
  const [track, setTrack] = useState({ title: '', artist: '' });
  const [trackError, setTrackError] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const kb = useKeyboardState();
  const topRef = useRef<HTMLDivElement>(null);

  if (!can(s.planId, 'site')) return <Locked feature="site" />;
  const site = s.site;
  const sections = sectionsOf(s);
  const byId = (id: SectionId) => sections.find(x => x.id === id)!;
  const shown = (b: BlockId) => isOn(s, BLOCK_SECTION[b]);

  /* Estructura: lo que hoy ve un invitado, de arriba hacia abajo. */
  const rows: Row[] = [{ id: 'portada', sec: byId('portada'), label: 'Portada', status: byId('portada').status, tone: byId('portada').tone, movable: false, removable: false, fixed: 'Siempre primera' }];
  for (const b of site.order) {
    const id = BLOCK_SECTION[b], sec = byId(id);
    if (isOn(s, id)) rows.push({ id, sec, label: sec.label, status: sec.status, tone: sec.tone, movable: true, removable: REMOVABLE.includes(id) });
  }
  const movableIds = rows.filter(r => r.movable).map(r => r.id);
  const addable = sections.filter(x => x.id !== 'portada' && !isOn(s, x.id));
  const visibleCount = rows.length;
  const sec = sel ? byId(sel) : null;
  const hiddenNow = sel ? !isOn(s, sel) : false;

  const open = (id: SectionId) => {
    setSel(id); setTab('edit'); setJump(j => j + 1);
    window.setTimeout(() => topRef.current?.scrollIntoView({ block: 'nearest' }), 0);
  };
  const back = () => { setSel(null); window.setTimeout(() => topRef.current?.scrollIntoView({ block: 'nearest' }), 0); };
  const remove = (id: SectionId, label: string) => {
    setOn(id, false);
    if (sel === id) back();
    toast(`Quitamos «${label}» de tu invitación. Lo que cargaste se guardó.`, 'ok', { label: 'Deshacer', onClick: () => setOn(id, true) });
  };
  const add = (id: SectionId) => { setOn(id, true); open(id); };
  const move = (id: SectionId, dir: -1 | 1, label: string) => {
    const b = (Object.keys(BLOCK_SECTION) as BlockId[]).find(k => BLOCK_SECTION[k] === id)!;
    const next = moveBlock(site.order, b, dir, shown);
    if (next === site.order) return;
    patchSite(x => ({ ...x, order: next }));
    setJump(j => j + 1);
    const pos = next.filter(shown).indexOf(b) + 2; // la portada es la 1
    setAnnounce(`${label} ahora es la sección ${pos} de ${visibleCount}.`);
    // Al reordenar, la fila cambia de lugar: el foco vuelve al mismo botón para poder seguir moviéndola con el teclado.
    window.requestAnimationFrame(() => {
      const same = document.querySelector<HTMLButtonElement>(`[data-section="${id}"] [data-move="${dir}"]`);
      (same && !same.disabled ? same : document.querySelector<HTMLElement>(`[data-section="${id}"] [data-move="${-dir}"]`))?.focus();
    });
  };
  // Tocar una sección en la vista previa la elige en el editor.
  const fromPreview = (p: PreviewSection) => {
    open(p);
  };
  const anchor = sel ? ANCHOR[sel] : undefined;
  const path = sitePath(s);

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
    <div className="pn-page pn-editor ed-page" data-kb={kb} data-tab={tab} data-sel={sel ?? undefined}>
      <header className="pn-page-head is-compact">
        <div>
          <h1>Tu página</h1>
          <p className="pn-sub">Tus invitados ven {visibleCount} {visibleCount === 1 ? 'sección' : 'secciones'}. Todo se guarda solo.</p>
        </div>
        <div className="pn-switch is-small ed-tabs" role="group" aria-label="Qué ver">
          <button type="button" className={tab === 'edit' ? 'on' : ''} aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>Editar</button>
          <button type="button" className={tab === 'preview' ? 'on' : ''} aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Cómo queda</button>
        </div>
      </header>
      <p className="pn-sr" role="status" aria-live="polite">{announce}</p>

      <div className="ed-grid">
        <div className="ed-side" ref={topRef}>
          {!sec ? (
            <>
              <section className="ed-block is-current" aria-labelledby="ed-structure">
                <h2 id="ed-structure" className="ed-h">Tu invitación<span className="ed-count" aria-label={`${visibleCount} secciones`}>{visibleCount}</span></h2>
                <ol className="ed-rows">
                  {rows.map((r, i) => {
                    const Icon = ICON[r.id];
                    const Status = STATUS_ICON[r.tone];
                    const main = (
                      <>
                        <span className="ed-num" aria-hidden="true">{i + 1}</span>
                        <Icon size={18} strokeWidth={1.6} className="ed-ico" aria-hidden="true" />
                        <span className="ed-text"><strong>{r.label}</strong><small className={`is-${r.tone}`}><Status size={12} strokeWidth={2.4} aria-hidden="true" />{r.status}</small></span>
                      </>
                    );
                    return (
                      <li key={r.id} className="ed-row" data-section={r.id}>
                        <button type="button" className="ed-main" onClick={() => open(r.id)} aria-label={`Editar ${r.label}. ${r.status}`}>{main}</button>
                        <div className="ed-acts">
                          {r.movable
                            ? <>
                                <button type="button" className="pn-icon" data-move="-1" disabled={movableIds[0] === r.id} onClick={() => move(r.id, -1, r.label)} aria-label={`Subir ${r.label}`}><ArrowUp size={16} aria-hidden="true" /></button>
                                <button type="button" className="pn-icon" data-move="1" disabled={movableIds[movableIds.length - 1] === r.id} onClick={() => move(r.id, 1, r.label)} aria-label={`Bajar ${r.label}`}><ArrowDown size={16} aria-hidden="true" /></button>
                              </>
                            : <span className="ed-fixed">{r.fixed}</span>}
                          {r.removable && <button type="button" className="pn-icon" onClick={() => remove(r.id, r.label)} aria-label={`Quitar ${r.label} de la invitación`}><X size={16} aria-hidden="true" /></button>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="ed-block is-extra" aria-labelledby="ed-add">
                <h2 id="ed-add" className="ed-h"><Plus size={16} strokeWidth={2.2} aria-hidden="true" />Para agregar</h2>
                {addable.length === 0
                  ? <p className="ed-help">Ya tenés todas las secciones en tu invitación.</p>
                  : <>
                      <ul className="ed-rows is-add">
                        {addable.map(x => {
                          const Icon = ICON[x.id];
                          const tag = x.locked ? `Plan ${planFor(x.locked)?.name}` : undefined;
                          return (
                            <li key={x.id} className="ed-row">
                              <div className="ed-main is-static">
                                <Icon size={18} strokeWidth={1.6} className="ed-ico" aria-hidden="true" />
                                <span className="ed-text"><strong>{x.label}{tag && <em className="pn-plantag">{tag}</em>}</strong><small>{PURPOSE[x.id]}</small></span>
                              </div>
                              <div className="ed-acts">
                                {x.locked
                                  ? <button type="button" className="pn-btn is-ghost is-small" onClick={plans.open} aria-label={`Ver el plan que incluye ${x.label}`}>Ver plan</button>
                                  : <button type="button" className="pn-btn is-small ed-add-btn" onClick={() => add(x.id)} aria-label={`Agregar ${x.label} a la invitación`}><Plus size={15} aria-hidden="true" />Agregar</button>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>}
              </section>
            </>
          ) : (
            <>
              {/* Barra fija mientras se edita: dónde estoy (la sección), cómo vuelvo (flecha) y «Listo», siempre a la vista aunque el formulario sea largo.
                  En el celular la ventana en vivo va pegada debajo, en el mismo bloque fijo, para que nada del formulario asome por encima. */}
              <div className="ed-stick">
                <div className="ed-bar">
                  <button type="button" className="ed-back" onClick={back} aria-label="Volver a Tu invitación"><ArrowLeft size={18} aria-hidden="true" /><span className="ed-back-txt">Tu invitación</span></button>
                  <p className="ed-now" aria-hidden="true">{(() => { const Icon = ICON[sel!]; return <Icon size={16} strokeWidth={1.7} />; })()}<span>{sec.label}</span></p>
                  <button type="button" className="pn-btn is-small ed-done" onClick={back}>Listo</button>
                </div>
                {!sec.locked && (
                  <div className="pn-live ed-live">
                    <LiveCard s={s} section={sel!} label={sec.title} hidden={hiddenNow} openEvent={openEv} keyboard={kb} onSeeFull={() => setTab('preview')} />
                  </div>
                )}
              </div>
              <div className="ed-form">

      {sel === 'portada' && (
        <Panel sec={sec}>
          <CoverFields />
        </Panel>
      )}
      {sel === 'fecha' && (
        <Panel sec={sec}>
          <p className="pn-hint">La fecha se cambia en Portada.</p>
          <label className="pn-check"><input type="checkbox" checked={site.countdown} onChange={e => patchSite(x => ({ ...x, countdown: e.target.checked }))} /><span>Mostrar la cuenta regresiva</span></label>
        </Panel>
      )}
      {sel === 'eventos' && (
        <Panel sec={sec}>
          <ul className="pn-evlist">{site.events.map(ev => <EventRow key={ev.key} ev={ev} open={openEv === ev.key} onOpen={setOpenEv} />)}</ul>
        </Panel>
      )}
      {sel === 'rsvp' && (
        <Panel sec={sec}>
        <p className="pn-muted">Las respuestas llegan a Invitados.</p>
        </Panel>
      )}
      {sel === 'dress' && (
        <Panel sec={sec}>
        <Field label="Título">{a => <input id={a.id} type="text" value={site.dressCode.title} placeholder="Elegante sport" onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, title: e.target.value } }))} />}</Field>
        <Field label="Texto" optional>{a => <textarea id={a.id} rows={3} value={site.dressCode.text} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, text: e.target.value } }))} />}</Field>
        <label className="pn-check"><input type="checkbox" checked={site.dressCode.showColors} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, showColors: e.target.checked } }))} /><span>Mostrar círculos de colores sugeridos</span></label>
        {site.dressCode.showColors && (
          <div className="ed-colors-box">
            <ul className="ed-colors">
              {site.dressCode.colors.map((c, i) => (
                <li key={i}>
                  <input type="color" value={isHexColor(c.color) ? c.color : '#d9cdb8'} aria-label={`Color del círculo ${i + 1}`} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: x.dressCode.colors.map((k, j) => (j === i ? { ...k, color: e.target.value } : k)) } }))} />
                  <input type="text" value={c.name} maxLength={24} placeholder="Nombre (opcional)" aria-label={`Nombre del círculo ${i + 1}`} onChange={e => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: x.dressCode.colors.map((k, j) => (j === i ? { ...k, name: e.target.value } : k)) } }))} />
                </li>
              ))}
            </ul>
            <button type="button" className="pn-link" onClick={() => patchSite(x => ({ ...x, dressCode: { ...x.dressCode, colors: defaultColors() } }))}>Volver a los colores sugeridos</button>
          </div>
        )}
        </Panel>
      )}
      {sel === 'regalos' && (
        <Panel sec={sec}>
        <Field label="Título">{a => <input id={a.id} type="text" value={site.giftsSection.title} placeholder={DEFAULT_GIFTS_TITLE} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, title: e.target.value } }))} />}</Field>
        <Field label="Texto" optional>{a => <textarea id={a.id} rows={2} value={site.giftsSection.text} placeholder={DEFAULT_GIFTS_TEXT} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, text: e.target.value } }))} />}</Field>
        <Field label="Texto del botón">{a => <input id={a.id} type="text" value={site.giftsSection.button} placeholder={DEFAULT_GIFTS_BUTTON} maxLength={40} onChange={e => patchSite(x => ({ ...x, giftsSection: { ...x.giftsSection, button: e.target.value } }))} />}</Field>
        {s.gifts.items.length === 0
          ? <p className="pn-note">Todavía sin regalos. <Link to="/panel/regalos" className="pn-link">Elegir regalos</Link></p>
          : <Link to="/panel/regalos" className="pn-link">Ir a mi lista de regalos</Link>}
        </Panel>
      )}
      {sel === 'texto' && (
        <Panel sec={sec}>
        <Field label="Título" optional>{a => <input id={a.id} type="text" value={site.note.title} maxLength={80} placeholder="Un aviso importante" onChange={e => patchSite(x => ({ ...x, note: { ...x.note, title: e.target.value } }))} />}</Field>
        <Field label="Mensaje" optional>{a => <textarea id={a.id} rows={5} value={site.note.text} maxLength={1200} onChange={e => patchSite(x => ({ ...x, note: { ...x.note, text: e.target.value } }))} />}</Field>
        </Panel>
      )}
      {sel === 'fotos' && (
        <Panel sec={sec} planTag={tagFor('gallery')}>
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
        <div className="pn-actions is-tight"><button type="button" className="pn-btn is-ghost is-small" disabled={site.gallery.photos.length >= MAX_PHOTOS} onClick={() => photoRef.current?.click()}><Plus size={15} aria-hidden="true" />Agregar fotos</button><span className="pn-hint">{site.gallery.photos.length >= MAX_PHOTOS ? `Llegaste al máximo de ${MAX_PHOTOS} fotos. Quitá alguna para sumar otra.` : `${site.gallery.photos.length} de ${MAX_PHOTOS}.`}</span></div>
        <Field label="Hashtag" optional>{a => <input id={a.id} type="text" value={site.gallery.hashtag} placeholder="#TomasYMartina2027" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, hashtag: e.target.value } }))} />}</Field>
        <Field label="Usuario de Instagram" optional>{a => <input id={a.id} type="text" value={site.gallery.handle} placeholder="@tomasymartina" onChange={e => patchSite(x => ({ ...x, gallery: { ...x.gallery, handle: e.target.value } }))} />}</Field>
        </Panel>
      )}
      {sel === 'mensaje' && (
        <Panel sec={sec} planTag={tagFor('message')}>
        <Field label="Frase">{a => <input id={a.id} type="text" value={site.message.title} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, title: e.target.value } }))} />}</Field>
        <Field label="Mensaje" optional>{a => <textarea id={a.id} rows={3} value={site.message.text} onChange={e => patchSite(x => ({ ...x, message: { ...x.message, text: e.target.value } }))} aria-describedby={a.describedBy} />}</Field>
        </Panel>
      )}
      {sel === 'musica' && (
        <Panel sec={sec} planTag={tagFor('playlist')}>
          <Field label="Link de tu playlist de Spotify" error={site.playlist.spotify.trim() && !spotifyEmbed(site.playlist.spotify) ? 'Pegá el link de una playlist de Spotify (open.spotify.com/playlist/…).' : undefined}>
            {a => <input id={a.id} type="url" inputMode="url" value={site.playlist.spotify} placeholder="https://open.spotify.com/playlist/…" onChange={e => patchSite(x => ({ ...x, playlist: { ...x.playlist, spotify: e.target.value } }))} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
          </Field>
          <p className="pn-hint">En Spotify: Compartir → Copiar enlace de la playlist.</p>
        </Panel>
      )}

                {REMOVABLE.includes(sel!) && !sec.locked && !hiddenNow && (
                  <div className="pn-actions ed-remove-row"><button type="button" className="pn-btn is-ghost is-small" onClick={() => remove(sel!, sec.label)}>Quitar de la invitación</button></div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ed-view">
          <div className="ed-view-bar">
            <div className="pn-switch is-small" role="group" aria-label="Cómo verla">
              <button type="button" className={device === 'mobile' ? 'on' : ''} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Celular</button>
              <button type="button" className={device === 'desktop' ? 'on' : ''} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Compu</button>
            </div>
            {sec && tab === 'preview'
              ? <button type="button" className="ed-resume" onClick={() => { setTab('edit'); setJump(j => j + 1); }}><ArrowLeft size={16} aria-hidden="true" />Seguir editando {sec.label}</button>
              : <p className="ed-hint">Tocá una sección para editarla</p>}
            <button type="button" className="pn-link" onClick={() => openPreview('home', anchor)}>Ver completa</button>
          </div>
          <SitePreview path={path} device={device} anchor={anchor} jump={jump} active={sel && sel !== 'portada' ? sel : sel} onSelect={fromPreview} label="Vista previa de tu invitación, tal como la ven tus invitados" />
        </div>
      </div>
    </div>
  );
}
