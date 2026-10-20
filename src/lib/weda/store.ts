// Almacén local del estado de Weda. Es una DEMO sin backend: el estado se guarda en localStorage de este navegador.
// - Hidrata después de montar (seguro con SSR).
// - Se sincroniza entre pestañas y iframes (evento "storage"): así la vista previa del editor se actualiza sola.
// - Tolera datos ausentes, corruptos o de una versión anterior: en ese caso arranca vacío, sin errores.
import { useSyncExternalStore } from 'react';
import { defaultSite, emptyState } from './logic';
import { isPlanId } from './plans';
import type { AppState, Guest, GuestStatus, ListGift, PhotoChoice, PlanId, SiteConfig } from './types';

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

function site(v: unknown): SiteConfig {
  const d = defaultSite();
  if (!isObj(v)) return d;
  const evs = arr(v['events']).filter(isObj);
  const events = d.events.map(e => {
    const f = evs.find(x => x['key'] === e.key);
    return f ? { key: e.key, enabled: bool(f['enabled'], e.enabled), title: typeof f['title'] === 'string' ? f['title'] : OLD_TITLE[e.key] ?? '', name: str(f['name']), address: str(f['address']), time: str(f['time']), note: str(f['note']), mapsUrl: str(f['mapsUrl']) } : e;
  });
  const r = isObj(v['rsvp']) ? v['rsvp'] : {}, dc = isObj(v['dressCode']) ? v['dressCode'] : {}, ga = isObj(v['gallery']) ? v['gallery'] : {};
  const pl = isObj(v['playlist']) ? v['playlist'] : {}, ms = isObj(v['message']) ? v['message'] : {};
  return {
    coverText: str(v['coverText'], d.coverText), events, countdown: bool(v['countdown'], d.countdown),
    rsvp: { enabled: bool(r['enabled'], d.rsvp.enabled), deadline: str(r['deadline']), menus: bool(r['menus'], d.rsvp.menus) },
    dressCode: { enabled: bool(dc['enabled'], false), title: str(dc['title']), text: str(dc['text']) },
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
  const c = isObj(raw['couple']) ? raw['couple'] : {}, g = isObj(raw['gifts']) ? raw['gifts'] : {};
  return {
    version: 2, onboarded: bool(raw['onboarded'], false),
    couple: { first: str(c['first']), second: str(c['second']), ...(str(c['firstLast']) ? { firstLast: str(c['firstLast']) } : {}), ...(str(c['secondLast']) ? { secondLast: str(c['secondLast']) } : {}) },
    date: typeof raw['date'] === 'string' ? raw['date'] : null,
    photo: photo(raw['photo']),
    preferredPlan: planOf(raw['preferredPlan'], from),
    planId: planOf(raw['planId'], from),
    gifts: {
      cover: typeof g['cover'] === 'string' ? g['cover'] : null, alias: str(g['alias']), acceptCard: bool(g['acceptCard'], false),
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
    groups: arr(raw['groups']).filter(isObj).filter(x => typeof x['id'] === 'string' && typeof x['name'] === 'string').map(x => ({ id: str(x['id']), name: str(x['name']) })),
    site: site(raw['site']),
    seeded: bool(raw['seeded'], false),
  };
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
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    state = read(); emit();
  });
}

function persist(next: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (storageFull) { storageFull = false; }
  } catch {
    // Sin lugar (suele pasar con muchas fotos) o sin almacenamiento: la demo sigue en memoria, pero avisamos.
    storageFull = true;
  }
}

export const getState = (): AppState => { ensureLoaded(); return state; };
export const isStorageFull = () => storageFull;

/** Cambia el estado, lo guarda y avisa a los componentes. */
export function update(fn: (s: AppState) => AppState) {
  ensureLoaded();
  const next = fn(state);
  if (next === state) return;
  state = next;
  persist(state);
  emit();
}

export function replace(next: AppState) { update(() => next); }
export function reset() {
  ensureLoaded();
  state = emptyState();
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nada que borrar */ }
  storageFull = false;
  emit();
}

const subscribe = (l: () => void) => { ensureLoaded(); listeners.add(l); return () => { listeners.delete(l); }; };

/** Estado de la aplicación. En el servidor (y durante la hidratación) devuelve el estado vacío. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

/** false en el servidor y en el primer render del cliente; true una vez que el estado local ya se leyó. */
export function useHydrated(): boolean {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function useStorageFull(): boolean {
  return useSyncExternalStore(subscribe, isStorageFull, () => false);
}
