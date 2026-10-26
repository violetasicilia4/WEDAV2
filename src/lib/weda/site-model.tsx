// Datos que necesita la página pública de un casamiento (invitación + lista de regalos + confirmación).
// /ejemplo usa los datos de la demo (src/lib/demo-wedding.ts); /sitio/$slug y la vista previa usan los de la pareja.
// Los componentes públicos leen siempre de acá, así son los MISMOS componentes en los dos casos.
import { createContext, useContext, type ReactNode } from 'react';
import {
  alias as demoAlias, calendar, categories as demoCategories, dressCode as demoDress, eventDate as demoEventDate, eventOffset as demoOffset,
  events as demoEvents, gallery as demoGallery, gifts as demoGifts, menus as demoMenus, playlist as demoPlaylist, rsvpDeadline as demoDeadline,
  social as demoSocial, wedding as demoWedding, weddingStart as demoStart,
  type Category, type Gift, type WeddingEvent,
} from '@/lib/demo-wedding';
import { can } from './plans';
import { cleanBgs, DEFAULT_GIFTS_BUTTON, DEFAULT_GIFTS_TEXT, DEFAULT_GIFTS_TITLE, DEFAULT_ORDER, normalizeOrder, shortAddress, coupleLabel, dateLabel, dateShort, dayMonth, hasEventDetails, isSamplePhoto, mapsLink, parseDate, photoPosition, resolvePhoto, sitePath } from './logic';
import type { AppState, BlockId, GivenGift } from './types';

export type SiteData = {
  kind: 'demo' | 'app';
  homePath: string;
  giftsPath: string;
  exit: { href: string; label: string };
  /** «Tomás & Martina» */
  names: string;
  coverPhoto: string | null;
  photoAlt: string;
  /** Imagen de muestra de Weda (no es una foto de la pareja): decorativa y con encuadre propio. */
  coverSample?: string | undefined;
  coverText: string;
  /** AAAA-MM-DD o null (todavía sin fecha). */
  eventDate: string | null;
  eventOffset: string;
  weddingStart: string | null;
  dateLabel: string | null;
  dateShort: string | null;
  calendarTitle: string;
  events: WeddingEvent[];
  /** Orden de las secciones reordenables (ver `BlockId`). */
  order: BlockId[];
  /** Fondo elegido por la pareja para cada sección (sin entrada = el de Weda). */
  bgs: Partial<Record<BlockId, string>>;
  /** `gifts`: hay lista de regalos; `giftsSection`: se muestra el acceso a la lista dentro de la invitación; `note`: se muestra la caja de texto libre. */
  blocks: { invitation: boolean; save: boolean; countdown: boolean; day: boolean; rsvp: boolean; dress: boolean; photos: boolean; playlist: boolean; message: boolean; gifts: boolean; giftsSection: boolean; note: boolean };
  giftsSection: { title: string; text: string; button: string };
  note: { title: string; text: string };
  rsvp: { deadline: string | null; menus: readonly { id: string; name: string }[] | null };
  dressCode: { title: string; text: string; palette: { name: string; color: string }[] };
  gallery: { photos: { src: string; alt: string; pos?: string | undefined }[]; hashtag: string; handle: string };
  playlist: { name: string; tracks: { title: string; artist: string }[] };
  message: { title: string; text: string };
  gifts: Gift[];
  giftCategories: Category[];
  giftsCover: string | null;
  alias: string;
  bank: string;
  cbu: string;
  acceptCard: boolean;
};

export type RsvpEntry = { first: string; last: string; attending: boolean; menu: string };
/** Lo necesario para enviar un aporte de verdad: el comprobante y una clave de reintento (la misma en cada reintento: evita duplicados). */
export type GiftSubmission = { proof: File | null; attempt: { key: string; token: string } };
export type SiteActions = {
  /** Regalos ya elegidos por invitados. */
  given: GivenGift[];
  /** Si el sitio es real, devuelve una promesa que falla (con un mensaje para la persona) cuando el servidor no confirma. */
  recordGift: (gifts: Gift[], giver: { name: string; message: string; how: 'alias' | 'tarjeta' }, extra?: GiftSubmission) => void | Promise<void>;
  /** true cuando el sitio es el publicado en el servidor: ahí los envíos son reales (estado «pendiente de revisión»), no una demostración. */
  remote?: boolean;
  /** Respuestas de asistencia enviadas desde el formulario público. */
  recordRsvp: (people: RsvpEntry[]) => void | Promise<void>;
};

const SLOT: Record<string, number> = { ceremonia: 1, recepcion: 2, fiesta: 3, civil: 4, brunch: 5 };

/** Datos de la demo /ejemplo (Ignacio & Martina): exactamente lo que ya se mostraba. */
export const demoSiteData: SiteData = {
  kind: 'demo',
  homePath: '/ejemplo',
  giftsPath: '/ejemplo/regalos',
  exit: { href: '/', label: 'Volver a Weda' },
  names: demoWedding.couple,
  coverPhoto: demoWedding.photo,
  photoAlt: 'Ignacio y Martina abrazándose entre sus invitados, en blanco y negro',
  coverText: '¡Nos casamos!',
  eventDate: demoEventDate,
  eventOffset: demoOffset,
  weddingStart: demoStart,
  dateLabel: demoWedding.dateLabel,
  dateShort: demoWedding.dateShort,
  calendarTitle: calendar.title,
  events: demoEvents,
  order: DEFAULT_ORDER,
  bgs: {},
  blocks: { invitation: true, save: true, countdown: true, day: true, rsvp: true, dress: true, photos: true, playlist: true, message: true, gifts: false, giftsSection: false, note: false },
  giftsSection: { title: DEFAULT_GIFTS_TITLE, text: DEFAULT_GIFTS_TEXT, button: DEFAULT_GIFTS_BUTTON },
  note: { title: '', text: '' },
  rsvp: { deadline: demoDeadline, menus: demoMenus },
  dressCode: demoDress,
  gallery: { photos: [demoGallery[0], demoGallery[2], demoGallery[3]].filter((g): g is (typeof demoGallery)[number] => !!g), hashtag: demoSocial.hashtag, handle: demoSocial.handle },
  playlist: demoPlaylist,
  message: { title: 'Que vengas ya es un regalo.', text: '' },
  gifts: demoGifts,
  giftCategories: demoCategories,
  giftsCover: null,
  alias: demoAlias,
  bank: '',
  cbu: '',
  acceptCard: true,
};

/** Arma los datos de la página pública a partir de lo que cargó la pareja. */
export function siteFromState(s: AppState): SiteData {
  const base = sitePath(s);
  const names = coupleLabel(s.couple);
  const date = s.date && parseDate(s.date) ? s.date : null;
  const premiumMusic = can(s.planId, 'playlist') && s.site.playlist.enabled && s.site.playlist.tracks.length > 0;
  const events: WeddingEvent[] = can(s.planId, 'site')
    ? s.site.events.filter(hasEventDetails).map(e => ({
        key: e.key, label: e.title.trim() || `Evento ${SLOT[e.key]}`, time: e.time ? `${e.time} hs` : '', name: e.name || e.title.trim() || `Evento ${SLOT[e.key]}`, address: shortAddress(e.address),
        note: e.note, maps: mapsLink(e),
      }))
    : [];
  const first = events.find(e => /^\d{2}:\d{2}/.test(e.time));
  const start = date && first ? `${date}T${first.time.slice(0, 5)}:00${demoOffset}` : date ? `${date}T00:00:00${demoOffset}` : null;
  const photo = resolvePhoto(s.photo);
  const gifts: Gift[] = s.gifts.items.map(g => ({
    id: g.id, name: g.name, text: g.text, amount: g.amount, category: g.category, icon: g.icon, image: g.image, pos: g.pos, fit: g.fit, zoom: g.zoom,
  }));
  const present = demoCategories.filter(c => gifts.some(g => g.category === c));
  const hasPhotos = can(s.planId, 'gallery') && s.site.gallery.enabled && s.site.gallery.photos.length > 0;
  const dressOn = s.site.dressCode.enabled && (s.site.dressCode.title.trim() !== '' || s.site.dressCode.text.trim() !== '');
  return {
    kind: 'app',
    homePath: base,
    giftsPath: `${base}/regalos`,
    exit: { href: '/panel', label: 'Volver al panel' },
    names,
    coverPhoto: photo,
    photoAlt: isSamplePhoto(s.photo) ? '' : `${s.couple.first} y ${s.couple.second}`,
    coverSample: isSamplePhoto(s.photo) ? photoPosition(s.photo) : undefined,
    coverText: s.site.coverText.trim(),
    eventDate: date,
    eventOffset: demoOffset,
    weddingStart: start,
    dateLabel: date ? dateLabel(date) : null,
    dateShort: date ? dateShort(date) : null,
    calendarTitle: `Casamiento de ${names}`,
    events,
    order: normalizeOrder(s.site.order),
    bgs: cleanBgs(s.site.bgs),
    blocks: {
      invitation: can(s.planId, 'site'),
      save: true,
      countdown: s.site.countdown && !!date,
      day: events.length > 0,
      rsvp: can(s.planId, 'rsvp') && s.site.rsvp.enabled,
      dress: dressOn,
      photos: hasPhotos,
      playlist: premiumMusic,
      message: can(s.planId, 'message') && s.site.message.enabled,
      // La lista de regalos que incluye el plan se ve también en la invitación (una muestra y el acceso a la lista completa).
      gifts: can(s.planId, 'gifts') && gifts.length > 0,
      giftsSection: can(s.planId, 'gifts') && gifts.length > 0 && s.site.giftsSection.enabled,
      note: can(s.planId, 'site') && s.site.note.enabled && (s.site.note.title.trim() !== '' || s.site.note.text.trim() !== ''),
    },
    giftsSection: { title: s.site.giftsSection.title.trim() || DEFAULT_GIFTS_TITLE, text: s.site.giftsSection.text.trim() || DEFAULT_GIFTS_TEXT, button: s.site.giftsSection.button.trim() || DEFAULT_GIFTS_BUTTON },
    note: { title: s.site.note.title.trim(), text: s.site.note.text.trim() },
    rsvp: { deadline: s.site.rsvp.deadline && parseDate(s.site.rsvp.deadline) ? dayMonth(s.site.rsvp.deadline) : null, menus: s.site.rsvp.menus ? demoMenus : null },
    dressCode: { title: s.site.dressCode.title.trim(), text: s.site.dressCode.text.trim(), palette: s.site.dressCode.showColors ? s.site.dressCode.colors : [] },
    gallery: { photos: s.site.gallery.photos.map(p => ({ src: p.src, alt: p.alt || `${s.couple.first} y ${s.couple.second}` })), hashtag: s.site.gallery.hashtag.trim(), handle: s.site.gallery.handle.trim() },
    playlist: { name: s.site.playlist.name.trim() || `Nuestra fiesta · ${names}`, tracks: s.site.playlist.tracks },
    message: { title: s.site.message.title.trim() || 'Que vengas ya es un regalo.', text: s.site.message.text.trim() },
    gifts,
    giftCategories: present,
    giftsCover: s.gifts.cover,
    alias: s.gifts.alias.trim(),
    bank: s.gifts.bank.trim(),
    cbu: s.gifts.cbu.trim(),
    acceptCard: s.gifts.acceptCard,
  };
}

const SiteContext = createContext<SiteData>(demoSiteData);
export const useSite = () => useContext(SiteContext);

const noop: SiteActions = { given: [], recordGift: () => {}, recordRsvp: () => {} };
const ActionsContext = createContext<SiteActions>(noop);
export const useSiteActions = () => useContext(ActionsContext);

export function SiteProvider({ data, actions, children }: { data: SiteData; actions?: SiteActions; children: ReactNode }) {
  return <SiteContext.Provider value={data}><ActionsContext.Provider value={actions ?? noop}>{children}</ActionsContext.Provider></SiteContext.Provider>;
}
