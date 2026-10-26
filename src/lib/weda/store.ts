// Almacén local del estado de Weda. Es una DEMO sin backend: el estado se guarda en localStorage de este navegador.
// - Hidrata después de montar (seguro con SSR).
// - Se sincroniza entre pestañas y iframes (evento "storage"): así la vista previa del editor se actualiza sola.
// - Tolera datos ausentes, corruptos o de una versión anterior: en ese caso arranca vacío, sin errores.
import { useRef, useSyncExternalStore } from 'react';
import { defaultColors, defaultGroup, EVENT_ICON_IDS, defaultSite, emptyState, isHexColor, normalizeOrder } from './logic';
import { isPlanId } from './plans';
import type { AppState, EventIconId, Guest, GuestStatus, ListGift, PhotoChoice, PlanId, SiteConfig } from './types';

export const STORAGE_KEY = 'weda-app';
export const STORAGE_VERSION = 2;
/** Versión 1 llamaba «completo» a lo que hoy es «invitacion» y «premium» a lo que hoy es «completo». */
const planOf = (v: unknown, from: number): PlanId | null => {
  const id = from === 1 ? (v === 'completo' ? 'invitacion' : v === 'premium' ? 'completo' : v) : v;
  return isPlanId(id) ? id : null;
};

/* ------------------------------------------------------------------ saneado de datos guardados */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Datos guardados antes de que los momentos tuvieran nombre propio. */
const OLD_TITLE: Record<string, string> = { ceremonia: 'Ceremonia', recepcion: 'Recepción', fiesta: 'Fiesta' };
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function photo(v: unknown): PhotoChoice {
  if (isObj(v)) {
    if (v['kind'] === 'upload' && typeof v['src'] === 'string') return { kind: 'upload', src: v['src'], name: str(v['name'], 'foto') };
    if (v['kind'] === 'weda' && typeof v['id'] === 'string') return { kind: 'weda', id: v['id'] };
  }
  return { kind: 'none' };
}

function listGift(v: unknown): ListGift | null {
  if (!isObj(v) || typeof v['id'] !== 'string' || typeof v['name'] !== 'string' || typeof v['amount'] !== 'number') return null;
  return {
    id: v['id'], catalogId: typeof v['catalogId'] === 'string' ? v['catalogId'] : undefined, fromSet: typeof v['fromSet'] === 'string' ? v['fromSet'] : undefined,
    name: v['name'], text: str(v['text']), amount: v['amount'], category: (str(v['category'], 'Proyectos futuros') as ListGift['category']),
    icon: (str(v['icon'], 'compass') as ListGift['icon']), image: typeof v['image'] === 'string' ? v['image'] : undefined,
    pos: typeof v['pos'] === 'string' ? v['pos'] : undefined, fit: (v['fit'] === 'contain' || v['fit'] === 'white') ? v['fit'] : undefined,
    zoom: isObj(v['zoom']) && typeof v['zoom']['scale'] === 'number' && typeof v['zoom']['origin'] === 'string' ? { scale: v['zoom']['scale'], origin: v['zoom']['origin'] } : undefined,
    custom: v['custom'] === true ? true : undefined,
  };
}

function guest(v: unknown): Guest | null {
  if (!isObj(v) || typeof v['id'] !== 'string' || typeof v['first'] !== 'string') return null;
  const status = (['confirmed', 'declined', 'pending'] as const).includes(v['status'] as GuestStatus) ? (v['status'] as GuestStatus) : 'pending';
  return { id: v['id'], first: v['first'], last: str(v['last']), status, menu: str(v['menu']), groupId: typeof v['groupId'] === 'string' ? v['groupId'] : null, source: v['source'] === 'rsvp' ? 'rsvp' : 'manual' };
}

/** Colores del dress code: de 1 a 6, cada uno con un color hexadecimal válido y un nombre corto; si no hay datos válidos, los cuatro de fábrica. */
function swatches(v: unknown): { name: string; color: string }[] {
  const list = arr(v).filter(isObj).filter(c => isHexColor(c['color'])).slice(0, 6).map(c => ({ name: str(c['name']).slice(0, 24), color: str(c['color']).toLowerCase() }));
  return list.length ? list : defaultColors();
}

function site(v: unknown): SiteConfig {
  const d = defaultSite();
  if (!isObj(v)) return d;
  const evs = arr(v['events']).filter(isObj);
  const events = d.events.map(e => {
    const f = evs.find(x => x['key'] === e.key);
    return f ? { key: e.key, icon: EVENT_ICON_IDS.includes(f['icon'] as never) ? (f['icon'] as EventIconId) : e.icon, enabled: bool(f['enabled'], e.enabled), title: typeof f['title'] === 'string' ? f['title'] : OLD_TITLE[e.key] ?? '', name: str(f['name']), address: str(f['address']), time: str(f['time']), note: str(f['note']), mapsUrl: str(f['mapsUrl']) } : e;
  });
  const r = isObj(v['rsvp']) ? v['rsvp'] : {}, dc = isObj(v['dressCode']) ? v['dressCode'] : {}, ga = isObj(v['gallery']) ? v['gallery'] : {};
  const pl = isObj(v['playlist']) ? v['playlist'] : {}, ms = isObj(v['message']) ? v['message'] : {};
  const gs = isObj(v['giftsSection']) ? v['giftsSection'] : {}, nt = isObj(v['note']) ? v['note'] : {};
  return {
    order: normalizeOrder(v['order']),
    coverText: str(v['coverText'], d.coverText), events, countdown: bool(v['countdown'], d.countdown),
    rsvp: { enabled: bool(r['enabled'], d.rsvp.enabled), deadline: str(r['deadline']), menus: bool(r['menus'], d.rsvp.menus) },
    dressCode: { enabled: bool(dc['enabled'], false), title: str(dc['title']), text: str(dc['text']), showColors: bool(dc['showColors'], true), colors: swatches(dc['colors']) },
    giftsSection: { enabled: bool(gs['enabled'], d.giftsSection.enabled), title: str(gs['title'], d.giftsSection.title), text: str(gs['text'], d.giftsSection.text), button: str(gs['button'], d.giftsSection.button) },
    note: { enabled: bool(nt['enabled'], false), title: str(nt['title']), text: str(nt['text']) },
    gallery: {
      enabled: bool(ga['enabled'], false), hashtag: str(ga['hashtag']), handle: str(ga['handle']),
      photos: arr(ga['photos']).filter(isObj).filter(p => typeof p['src'] === 'string').map(p => ({ id: str(p['id'], str(p['src']).slice(-12)), src: str(p['src']), alt: str(p['alt']) })),
    },
    playlist: {
      enabled: bool(pl['enabled'], false), name: str(pl['name']),
      tracks: arr(pl['tracks']).filter(isObj).filter(t => typeof t['title'] === 'string').map(t => ({ title: str(t['title']), artist: str(t['artist']) })),
    },
    message: { enabled: bool(ms['enabled'], d.message.enabled), title: str(ms['title'], d.message.title), text: str(ms['text']) },
  };
}

/** Convierte cualquier cosa leída del almacenamiento en un AppState válido. Si no se puede, devuelve el estado vacío. */
export function sanitize(raw: unknown): AppState {
  const e = emptyState();
  if (!isObj(raw) || (raw['version'] !== STORAGE_VERSION && raw['version'] !== 1)) return e;
  const from = raw['version'] as number;
  return withDefaultTable(build(raw, from));
}

const isoOf = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
/** Lee la publicación guardada; cualquier dato inválido la descarta (vuelve a «sin publicar»). */
function publication(v: unknown): AppState['publication'] {
  if (!isObj(v)) return null;
  const plan = planOf(v['planId'], 2), at = isoOf(v['publishedAt']), until = isoOf(v['expiresAt']);
  if (!plan || !at || !until) return null;
  const payments = arr(v['payments']).filter(isObj).map(x => {
    const p = planOf(x['planId'], 2), when = isoOf(x['at']);
    return p && when && (x['kind'] === 'publish' || x['kind'] === 'upgrade') && typeof x['amount'] === 'number' && Number.isFinite(x['amount']) && x['amount'] >= 0 ? { kind: x['kind'] as 'publish' | 'upgrade', planId: p, amount: x['amount'], at: when } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x);
  return { planId: plan, live: bool(v['live'], false), publishedAt: at, expiresAt: until, payments };
}

function build(raw: Record<string, unknown>, from: number): AppState {
  const c = isObj(raw['couple']) ? raw['couple'] : {}, g = isObj(raw['gifts']) ? raw['gifts'] : {};
  return {
    version: 2, onboarded: bool(raw['onboarded'], false), email: str(raw['email']),
    couple: { first: str(c['first']), second: str(c['second']), ...(str(c['firstLast']) ? { firstLast: str(c['firstLast']) } : {}), ...(str(c['secondLast']) ? { secondLast: str(c['secondLast']) } : {}) },
    date: typeof raw['date'] === 'string' ? raw['date'] : null,
    photo: photo(raw['photo']),
    preferredPlan: planOf(raw['preferredPlan'], from),
    planId: planOf(raw['planId'], from),
    gifts: {
      cover: typeof g['cover'] === 'string' ? g['cover'] : null, alias: str(g['alias']), bank: str(g['bank']), cbu: str(g['cbu']), acceptCard: bool(g['acceptCard'], false),
      items: arr(g['items']).map(listGift).filter((x): x is ListGift => !!x),
      given: arr(g['given']).filter(isObj).filter(x => typeof x['id'] === 'string').map(x => ({
        id: str(x['id']), name: str(x['name']), message: str(x['message']),
        giftName: typeof x['giftName'] === 'string' ? x['giftName'] : undefined,
        amount: typeof x['amount'] === 'number' && Number.isFinite(x['amount']) ? x['amount'] : undefined,
        how: x['how'] === 'alias' || x['how'] === 'tarjeta' ? x['how'] : undefined,
        at: typeof x['at'] === 'number' && Number.isFinite(x['at']) ? x['at'] : undefined,
      })),
    },
    guests: arr(raw['guests']).map(guest).filter((x): x is Guest => !!x),
    groups: arr(raw['groups']).filter(isObj).filter(x => typeof x['id'] === 'string' && typeof x['name'] === 'string').map(x => ({ id: str(x['id']), name: str(x['name']), ...(typeof x['capacity'] === 'number' && x['capacity'] > 0 ? { capacity: Math.floor(x['capacity']) } : {}), ...(str(x['note']) ? { note: str(x['note']) } : {}) })),
    site: site(raw['site']),
    seeded: bool(raw['seeded'], false),
    publication: publication(raw['publication']),
    ...(str(raw['slug']) ? { slug: str(raw['slug']) } : {}),
  };
}

function withDefaultTable(s: AppState): AppState {
  return s.groups.length ? s : { ...s, groups: [defaultGroup()] };
}

/** Lee y sanea el valor guardado. Nunca lanza. */
export function parseStored(text: string | null): AppState {
  if (!text) return emptyState();
  try { return sanitize(JSON.parse(text)); } catch { return emptyState(); }
}

/* ------------------------------------------------------------------ almacén */

const SERVER_STATE = emptyState();
let state: AppState = SERVER_STATE;
let loaded = false;
let storageFull = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function read(): AppState {
  try { return parseStored(window.localStorage.getItem(STORAGE_KEY)); } catch { return emptyState(); }
}

function ensureLoaded() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  state = read();
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPersist(); });
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    state = read(); emit();
  });
}

/* Guardado diferido: cada tecla cambia el estado en memoria al instante, pero serializar todo (con las fotos en base64) en cada cambio
   trababa la escritura. Los cambios seguidos se juntan en un solo guardado (150 ms) y se fuerza al ocultar o cerrar la pestaña. */
const PERSIST_DELAY = 150;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let persistPending = false;

function writeNow() {
  persistPending = false;
  const wasFull = storageFull;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageFull = false;
  } catch {
    // Sin lugar (suele pasar con muchas fotos) o sin almacenamiento: la demo sigue en memoria, pero avisamos.
    storageFull = true;
  }
  if (wasFull !== storageFull) emit();
}

function flushPersist() {
  if (persistTimer !== undefined) { clearTimeout(persistTimer); persistTimer = undefined; }
  if (persistPending) writeNow();
}

function persist() {
  persistPending = true;
  if (persistTimer !== undefined) return;
  persistTimer = setTimeout(() => { persistTimer = undefined; if (persistPending) writeNow(); }, PERSIST_DELAY);
}

export const getState = (): AppState => { ensureLoaded(); return state; };
/** Fuerza el guardado pendiente (útil antes de leer el almacenamiento desde otra pantalla o en pruebas). */
export const flushStorage = flushPersist;
export const isStorageFull = () => storageFull;

/** Cambia el estado, lo guarda y avisa a los componentes. */
export function update(fn: (s: AppState) => AppState) {
  ensureLoaded();
  const next = fn(state);
  if (next === state) return;
  state = next;
  persist();
  emit();
}

export function replace(next: AppState) { update(() => next); }
export function reset() {
  ensureLoaded();
  state = emptyState();
  if (persistTimer !== undefined) { clearTimeout(persistTimer); persistTimer = undefined; }
  persistPending = false;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nada que borrar */ }
  storageFull = false;
  emit();
}

/** Avisa cada vez que cambia el estado (lo usa la sincronización con el servidor). */
export const subscribeState = (l: () => void) => { ensureLoaded(); listeners.add(l); return () => { listeners.delete(l); }; };

const subscribe = (l: () => void) => { ensureLoaded(); listeners.add(l); return () => { listeners.delete(l); }; };

/** Estado de la aplicación. En el servidor (y durante la hidratación) devuelve el estado vacío. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

/** Como useAppState, pero el componente solo se vuelve a renderizar si cambia lo que elige (por defecto, por identidad). */
export function useAppSelector<T>(select: (s: AppState) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const last = useRef<{ s: AppState; v: T } | null>(null);
  const server = useRef<{ v: T } | null>(null);
  const getSnapshot = () => {
    const s = getState();
    const prev = last.current;
    if (prev && prev.s === s) return prev.v;
    const v = select(s);
    if (prev && equal(prev.v, v)) { last.current = { s, v: prev.v }; return prev.v; }
    last.current = { s, v };
    return v;
  };
  const getServerSnapshot = () => (server.current ??= { v: select(SERVER_STATE) }).v;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** false en el servidor y en el primer render del cliente; true una vez que el estado local ya se leyó. */
export function useHydrated(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function useStorageFull(): boolean {
  return useSyncExternalStore(subscribe, isStorageFull, () => false);
}
