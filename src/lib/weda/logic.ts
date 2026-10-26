// Lógica de negocio del frontend de Weda: funciones puras (sin React ni almacenamiento) para poder probarlas
// y para que, cuando exista una API, se puedan reemplazar por llamadas al servidor sin tocar los componentes.
import { dressCode as demoDress, menus, type Category } from '@/lib/demo-wedding';
import { catalogGift, setGifts, type GiftSet } from './catalog';
import { can, planFor, type Feature } from './plans';
import type {
  AppState, BlockId, Group, Guest, GuestStatus, ListGift, PhotoChoice, PlanId, SiteConfig, SiteEvent, Swatch,
} from './types';

/* ------------------------------------------------------------------ utilidades */

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Normaliza para comparar: sin mayúsculas, acentos ni espacios repetidos. */
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** «Tomás & Martina» → «tomas-y-martina». Es una ruta válida y estable, sin espacios ni acentos. */
export function slugify(first: string, second: string): string {
  const part = (s: string) => norm(s).replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return [part(first), part(second)].filter(Boolean).join('-y-');
}

export const coupleLabel = (c: { first: string; second: string }) => `${c.first.trim()} & ${c.second.trim()}`.trim();

/** Imágenes de muestra de Weda (de las que ya usa el sitio). La primera es la portada mientras la pareja no sube una foto propia. */
export const WEDA_COVERS: { id: string; name: string; src: string; pos: string }[] = [
  { id: 'luz', name: 'Rosas', src: '/fondo-testimonios.jpg', pos: '50% 28%' },
  { id: 'flores', name: 'Ramo', src: '/fondo-ramo.jpg', pos: '50% 50%' },
];

/** Foto de portada. Sin foto propia se usa una imagen de muestra de Weda (nunca queda un hueco). */
export function resolvePhoto(p: PhotoChoice): string {
  if (p.kind === 'upload') return p.src;
  if (p.kind === 'weda') return (WEDA_COVERS.find(c => c.id === p.id) ?? WEDA_COVERS[0]!).src;
  return WEDA_COVERS[0]!.src;
}

/** ¿La portada usa una imagen de muestra (y no una foto de la pareja)? */
export const isSamplePhoto = (p: PhotoChoice) => p.kind !== 'upload';
/** Encuadre de las imágenes de muestra. */
export const photoPosition = (p: PhotoChoice): string | undefined => (p.kind === 'upload' ? undefined : (WEDA_COVERS.find(c => p.kind === 'weda' && c.id === p.id) ?? WEDA_COVERS[0]!).pos);

/* ------------------------------------------------------------------ fechas */

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Valida AAAA-MM-DD y que la fecha exista (no acepta 2027-02-31). */
export function parseDate(s: string): { y: number; m: number; d: number } | null {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!mt) return null;
  const y = Number(mt[1]), m = Number(mt[2]), d = Number(mt[3]);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? { y, m, d } : null;
}

/** «Sábado 20 de marzo de 2027» */
export function dateLabel(s: string): string {
  const p = parseDate(s); if (!p) return '';
  const dow = DAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] ?? '';
  return `${dow.charAt(0).toUpperCase()}${dow.slice(1)} ${p.d} de ${MONTHS[p.m - 1]} de ${p.y}`;
}
/** «20 de marzo de 2027» */
export function dateShort(s: string): string { const p = parseDate(s); return p ? `${p.d} de ${MONTHS[p.m - 1]} de ${p.y}` : ''; }
/** «20 de enero» (sin año) */
export function dayMonth(s: string): string { const p = parseDate(s); return p ? `${p.d} de ${MONTHS[p.m - 1]}` : ''; }
export const monthName = (m: number) => MONTHS[m - 1] ?? '';

export const todayIso = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/* ------------------------------------------------------------------ validaciones */

export type FieldErrors<K extends string> = Partial<Record<K, string | undefined>>;

const NAME_RE = /^[\p{L}][\p{L}\s'’.-]*$/u;
export function validName(v: string, label: string): string | undefined {
  const t = v.trim();
  if (t.length < 2) return `Escribí ${label}.`;
  if (t.length > 40) return 'Es demasiado largo: usá 40 letras como máximo.';
  if (!NAME_RE.test(t)) return 'Usá solo letras, espacios, apóstrofes o guiones.';
  return undefined;
}

export function validateOnboarding(i: { first: string; second: string; date: string; noDate: boolean }, today = todayIso()): FieldErrors<'first' | 'second' | 'date'> {
  const e: FieldErrors<'first' | 'second' | 'date'> = {};
  const f = validName(i.first, 'el nombre de la primera persona'); if (f) e.first = f;
  const s = validName(i.second, 'el nombre de la segunda persona'); if (s) e.second = s;
  if (!i.noDate) {
    if (!i.date) e.date = 'Elegí la fecha o marcá «Todavía no tenemos fecha».';
    else if (!parseDate(i.date)) e.date = 'Esa fecha no existe. Revisala.';
    else if (i.date < today) e.date = 'La fecha ya pasó. Elegí una fecha futura o marcá «Todavía no tenemos fecha».';
  }
  return e;
}

/** «1.500.000», «$ 1500000» → 1500000. Devuelve NaN si no es un entero válido. */
export function parseAmount(v: string): number {
  const digits = v.replace(/[\s$.]/g, '').replace(/,00$/, '');
  return /^\d+$/.test(digits) ? Number(digits) : NaN;
}
export const MIN_AMOUNT = 1000;
export const MAX_AMOUNT = 100_000_000;

export function validateGift(i: { name: string; amount: string; text: string }): FieldErrors<'name' | 'amount' | 'text'> {
  const e: FieldErrors<'name' | 'amount' | 'text'> = {};
  const n = i.name.trim();
  if (n.length < 2) e.name = 'Poné un nombre para el regalo.';
  else if (n.length > 60) e.name = 'El nombre es demasiado largo: 60 letras como máximo.';
  const a = parseAmount(i.amount);
  if (Number.isNaN(a)) e.amount = 'Escribí el monto en pesos, solo con números.';
  else if (a < MIN_AMOUNT) e.amount = 'El monto mínimo es $ 1.000.';
  else if (a > MAX_AMOUNT) e.amount = 'El monto es demasiado alto: el máximo es $ 100.000.000.';
  if (i.text.trim().length > 140) e.text = 'La descripción es demasiado larga: 140 letras como máximo.';
  return e;
}

/** Correo opcional: vacío es válido; si se completa, tiene que tener formato de correo. */
export const isValidOptionalEmail = (v: string) => v.trim() === '' || /^\S+@\S+\.\S+$/.test(v.trim());

export function validateGuest(i: { first: string; last: string }): FieldErrors<'first' | 'last'> {
  const e: FieldErrors<'first' | 'last'> = {};
  const f = validName(i.first, 'el nombre'); if (f) e.first = f;
  const l = validName(i.last, 'el apellido'); if (l) e.last = l;
  return e;
}

export function validateAlias(v: string): string | undefined {
  return /^[a-zA-Z0-9.-]{6,20}$/.test(v.trim()) ? undefined : 'El alias tiene entre 6 y 20 caracteres: letras, números, puntos o guiones.';
}

/** CBU: 22 números (se aceptan espacios y guiones al escribirlo). */
export const cleanCbu = (v: string) => v.replace(/[\s-]/g, '');
export function validateCbu(v: string): string | undefined {
  return /^\d{22}$/.test(cleanCbu(v)) ? undefined : 'El CBU tiene 22 números.';
}

export function validateGroupName(v: string, groups: Group[], ignoreId?: string): string | undefined {
  const t = v.trim();
  if (t.length < 2) return 'Poné un nombre para el grupo o la mesa.';
  if (t.length > 40) return 'El nombre es demasiado largo: 40 letras como máximo.';
  if (groups.some(g => g.id !== ignoreId && norm(g.name) === norm(t))) return 'Ya hay un grupo o una mesa con ese nombre.';
  return undefined;
}

/** Enlaces de Google Maps permitidos. Cualquier otra cosa se descarta (no se abre ni se guarda). */
export function isSafeMapsUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return false; }
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  if (h === 'maps.app.goo.gl') return true;
  if (h === 'goo.gl' || h === 'www.goo.gl') return u.pathname.startsWith('/maps');
  if (h === 'maps.google.com') return true;
  return (h === 'www.google.com' || h === 'google.com') && u.pathname.startsWith('/maps');
}
export const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** Enlace que se muestra en la página pública para un lugar: el propio (si es válido) o uno generado desde la dirección. */
export function mapsLink(ev: Pick<SiteEvent, 'name' | 'address' | 'mapsUrl'>): string {
  if (ev.mapsUrl && isSafeMapsUrl(ev.mapsUrl)) return ev.mapsUrl.trim();
  const q = [ev.name, ev.address].map(s => s.trim()).filter(Boolean).join(', ');
  return q ? mapsSearch(q) : '';
}

/* ------------------------------------------------------------------ estado inicial */

export const DEFAULT_COVER_TEXT = '¡Nos casamos!';
export const DEFAULT_GIFTS_TITLE = '¿Querés regalarnos algo?';
export const DEFAULT_GIFTS_TEXT = 'Si querés sumarte con un regalo, esta es nuestra lista.';
export const DEFAULT_GIFTS_BUTTON = 'Ver lista de regalos';
/** Los cuatro círculos de colores sugeridos de fábrica (los mismos de siempre). Cada pareja puede cambiar el color y el nombre de cada uno. */
export const defaultColors = (): Swatch[] => demoDress.palette.map(c => ({ ...c }));
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

/** Dirección corta para la tarjeta: solo la calle y la altura, sin ciudad, código postal ni país ni coordenadas. «Cómo llegar» sigue usando la dirección completa. */
export function shortAddress(address: string): string {
  const a = address.trim();
  if (!a || /^[-+]?\d{1,3}(\.\d+)?\s*[,;]\s*[-+]?\d{1,3}(\.\d+)?$/.test(a)) return ''; // coordenadas: no se muestran
  const first = (a.split(/[,;]/)[0] ?? a).trim();
  // Sin comas: se corta en el código postal (argentino, tipo C1425 o B1640ABC) y en todo lo que sigue.
  return first.replace(/\s+[A-Za-z]\d{4}[A-Za-z]{0,3}\b.*$/, '').replace(/\s+\(?\d{4}\)?\s+(?=[A-ZÁÉÍÓÚÑ]).*$/, '').trim();
}

/** Orden de fábrica de la invitación. */
export const DEFAULT_ORDER: BlockId[] = ['eventos', 'regalos', 'rsvp', 'dress', 'texto', 'fotos', 'musica'];

/** Orden válido a partir de cualquier valor: sin repetidos ni desconocidos. Las secciones que falten (por ejemplo, las que se agregaron después de guardar el orden)
 *  se ubican donde les corresponde según el orden de fábrica: justo después de la anterior que sí esté. */
export function normalizeOrder(v: unknown): BlockId[] {
  const out: BlockId[] = [];
  if (Array.isArray(v)) for (const x of v) if ((DEFAULT_ORDER as unknown[]).includes(x) && !out.includes(x as BlockId)) out.push(x as BlockId);
  DEFAULT_ORDER.forEach((id, i) => {
    if (out.includes(id)) return;
    const prev = [...DEFAULT_ORDER.slice(0, i)].reverse().find(p => out.includes(p));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, id);
  });
  return out;
}

/** Mueve una sección una posición hacia arriba (-1) o hacia abajo (+1) entre las que se muestran; las ocultas no cuentan, así el movimiento siempre se nota. */
export function moveBlock(order: BlockId[], id: BlockId, dir: -1 | 1, visible: (b: BlockId) => boolean): BlockId[] {
  const shown = order.filter(visible);
  const at = shown.indexOf(id);
  const swap = shown[at + dir];
  if (at < 0 || swap === undefined) return order;
  const next = [...order];
  const i = next.indexOf(id), j = next.indexOf(swap);
  next[i] = swap; next[j] = id;
  return next;
}

export const defaultSite = (): SiteConfig => ({
  order: [...DEFAULT_ORDER],
  coverText: DEFAULT_COVER_TEXT,
  events: [
    { key: 'ceremonia', enabled: true, title: '', name: '', address: '', time: '', note: '', mapsUrl: '' },
    { key: 'recepcion', enabled: false, title: '', name: '', address: '', time: '', note: '', mapsUrl: '' },
    { key: 'fiesta', enabled: false, title: '', name: '', address: '', time: '', note: '', mapsUrl: '' },
  ],
  countdown: true,
  rsvp: { enabled: true, deadline: '', menus: true },
  dressCode: { enabled: false, title: '', text: '', showColors: true, colors: defaultColors() },
  giftsSection: { enabled: true, title: DEFAULT_GIFTS_TITLE, text: DEFAULT_GIFTS_TEXT, button: DEFAULT_GIFTS_BUTTON },
  note: { enabled: false, title: '', text: '' },
  gallery: { enabled: false, photos: [], hashtag: '', handle: '' },
  playlist: { enabled: false, name: '', tracks: [] },
  message: { enabled: true, title: 'Que vengas ya es un regalo.', text: '' },
});

/** Validaciones de la cuenta (las usan el registro y el perfil). */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const strongPassword = (p: string) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

/** Todo evento nuevo arranca con una mesa creada y vacía, para que se entienda cómo funciona; después se renombra, se borra o se suman más. */
export const DEFAULT_GROUP_NAME = 'Mesa 1';
export const defaultGroup = (): Group => ({ id: 'grp-inicial', name: DEFAULT_GROUP_NAME });
/** ¿La pareja ya usó las mesas? Una sola «Mesa 1» vacía y sin datos es la que viene de fábrica y no cuenta como contenido cargado. */
export const tablesInUse = (s: AppState): boolean =>
  s.groups.length > 1 || s.groups.some(g => g.name !== DEFAULT_GROUP_NAME || !!g.capacity || !!g.note?.trim() || s.guests.some(x => x.groupId === g.id));

export const emptyState = (): AppState => ({
  version: 2,
  onboarded: false,
  email: '',
  couple: { first: '', second: '' },
  date: null,
  photo: { kind: 'none' },
  preferredPlan: null,
  planId: null,
  gifts: { cover: null, alias: '', bank: '', cbu: '', acceptCard: false, items: [], given: [] },
  guests: [],
  groups: [defaultGroup()],
  site: defaultSite(),
  seeded: false,
  publication: null,
});

/* ------------------------------------------------------------------ regalos */

export type AddResult = { state: AppState; added: number; skipped: number };

const fromCatalog = (id: string, fromSet?: string): ListGift | null => {
  const g = catalogGift(id); if (!g) return null;
  return {
    id: uid('g'), catalogId: g.id, fromSet, name: g.name, text: g.text, amount: g.amount, category: g.category, icon: g.icon,
    image: g.image, pos: g.pos, fit: g.fit, zoom: g.zoom,
  };
};

export const hasCatalogGift = (s: AppState, catalogId: string) => s.gifts.items.some(g => g.catalogId === catalogId);

/** Agrega un regalo del catálogo si todavía no está en la lista (no duplica). */
export function addCatalogGift(s: AppState, catalogId: string, fromSet?: string): AddResult {
  if (hasCatalogGift(s, catalogId)) return { state: s, added: 0, skipped: 1 };
  const item = fromCatalog(catalogId, fromSet); if (!item) return { state: s, added: 0, skipped: 0 };
  return { state: { ...s, gifts: { ...s.gifts, items: [...s.gifts.items, item] } }, added: 1, skipped: 0 };
}

/** Agrega todos los regalos de una colección que todavía no estén en la lista. */
export function addSet(s: AppState, set: GiftSet): AddResult {
  let added = 0, skipped = 0;
  const items = [...s.gifts.items];
  for (const g of setGifts(set)) {
    if (items.some(x => x.catalogId === g.id)) { skipped++; continue; }
    const it = fromCatalog(g.id, set.id); if (!it) continue;
    items.push(it); added++;
  }
  return { state: { ...s, gifts: { ...s.gifts, items } }, added, skipped };
}

export const removeGift = (s: AppState, id: string): AppState => ({ ...s, gifts: { ...s.gifts, items: s.gifts.items.filter(g => g.id !== id) } });
/** Quita de la lista todos los regalos de un set (vengan de donde vengan). */
export const removeSetGifts = (s: AppState, giftIds: string[]): AppState => ({ ...s, gifts: { ...s.gifts, items: s.gifts.items.filter(g => !g.catalogId || !giftIds.includes(g.catalogId)) } });
export const removeSet = (s: AppState, setId: string): AppState => ({ ...s, gifts: { ...s.gifts, items: s.gifts.items.filter(g => g.fromSet !== setId) } });

export function addCustomGift(s: AppState, i: { name: string; amount: number; text?: string | undefined; category?: Category | undefined; image?: string | undefined }): AppState {
  const g: ListGift = { id: uid('g'), name: i.name.trim(), text: (i.text ?? '').trim(), amount: i.amount, category: i.category ?? 'Proyectos futuros', icon: 'compass', image: i.image, custom: true };
  return { ...s, gifts: { ...s.gifts, items: [...s.gifts.items, g] } };
}

export const updateGift = (s: AppState, id: string, patch: Partial<Pick<ListGift, 'name' | 'text' | 'amount' | 'image' | 'category'>>): AppState => ({
  ...s, gifts: { ...s.gifts, items: s.gifts.items.map(g => (g.id === id ? { ...g, ...patch } : g)) },
});

export function moveGift(s: AppState, id: string, dir: -1 | 1): AppState {
  const items = [...s.gifts.items];
  const i = items.findIndex(g => g.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= items.length) return s;
  [items[i], items[j]] = [items[j]!, items[i]!];
  return { ...s, gifts: { ...s.gifts, items } };
}

/** Mueve un regalo a otra posición de la lista (para ordenar arrastrando). */
export function moveGiftTo(s: AppState, id: string, to: number): AppState {
  const items = [...s.gifts.items];
  const i = items.findIndex(g => g.id === id);
  if (i < 0) return s;
  const j = Math.max(0, Math.min(items.length - 1, to));
  if (i === j) return s;
  const [g] = items.splice(i, 1);
  items.splice(j, 0, g!);
  return { ...s, gifts: { ...s.gifts, items } };
}


/* ------------------------------------------------------------------ invitados */

export const guestName = (g: Pick<Guest, 'first' | 'last'>) => `${g.first} ${g.last}`.trim();

export function addGuest(s: AppState, i: { first: string; last: string; status: GuestStatus; menu: string; groupId: string | null }): AppState {
  const g: Guest = { id: uid('inv'), first: i.first.trim(), last: i.last.trim(), status: i.status, menu: i.status === 'confirmed' ? i.menu : '', groupId: i.groupId, source: 'manual' };
  return { ...s, guests: [...s.guests, g] };
}
/** Suma varias personas de una vez (importar una planilla). */
export function addGuests(s: AppState, list: { first: string; last: string; status: GuestStatus; menu: string }[]): AppState {
  return list.reduce((acc, g) => addGuest(acc, { ...g, groupId: null }), s);
}
export const updateGuest = (s: AppState, id: string, patch: Partial<Pick<Guest, 'first' | 'last' | 'status' | 'menu' | 'groupId'>>): AppState => ({
  ...s,
  guests: s.guests.map(g => {
    if (g.id !== id) return g;
    const next = { ...g, ...patch };
    // Una persona que no asiste o está pendiente no tiene menú cargado.
    return next.status === 'confirmed' ? next : { ...next, menu: '' };
  }),
});
export const removeGuest = (s: AppState, id: string): AppState => ({ ...s, guests: s.guests.filter(g => g.id !== id) });

export type RsvpPerson = { first: string; last: string; attending: boolean; menu: string };

/** Respuesta del formulario público: actualiza a la persona si ya figura (mismo nombre) y, si no, la agrega. Nunca duplica. */
export function applyRsvp(s: AppState, people: RsvpPerson[]): AppState {
  const guests = [...s.guests];
  for (const p of people) {
    const key = norm(`${p.first} ${p.last}`);
    const status: GuestStatus = p.attending ? 'confirmed' : 'declined';
    const menu = p.attending ? p.menu : '';
    const at = guests.findIndex(g => norm(guestName(g)) === key);
    if (at >= 0) guests[at] = { ...guests[at]!, status, menu, source: 'rsvp' };
    else guests.push({ id: uid('inv'), first: p.first.trim(), last: p.last.trim(), status, menu, groupId: null, source: 'rsvp' });
  }
  return { ...s, guests };
}

export function guestStats(s: AppState) {
  const g = s.guests;
  return {
    total: g.length,
    confirmed: g.filter(x => x.status === 'confirmed').length,
    declined: g.filter(x => x.status === 'declined').length,
    pending: g.filter(x => x.status === 'pending').length,
    fromSite: g.filter(x => x.source === 'rsvp').length,
    /** Personas que van o pueden ir y todavía no tienen grupo (los que no asisten no hacen falta en una mesa). */
    withoutGroup: g.filter(x => x.status !== 'declined' && !x.groupId).length,
  };
}

export const STATUS_LABEL: Record<GuestStatus, string> = { confirmed: 'Confirmado', declined: 'No asiste', pending: 'Pendiente' };

export const menuName = (id: string) => menus.find(m => m.id === id)?.name ?? '';

/* ------------------------------------------------------------------ grupos y mesas */

export const nextGroupName = (groups: Group[]) => { let n = groups.length + 1; while (groups.some(g => norm(g.name) === `mesa ${n}`)) n++; return `Mesa ${n}`; };
export type GroupExtras = { capacity?: number | undefined; note?: string | undefined };
const withExtras = (g: Group, e: GroupExtras): Group => {
  const { capacity: _c, note: _n, ...rest } = g;
  return { ...rest, ...(e.capacity && e.capacity > 0 ? { capacity: Math.floor(e.capacity) } : {}), ...(e.note?.trim() ? { note: e.note.trim() } : {}) };
};
export const addGroup = (s: AppState, name: string, extras: GroupExtras = {}): AppState => ({ ...s, groups: [...s.groups, withExtras({ id: uid('grp'), name: name.trim() }, extras)] });
/** Cambia nombre, descripción y lugares de una mesa (vacío = sin dato). */
export const updateGroup = (s: AppState, id: string, name: string, extras: GroupExtras): AppState => ({ ...s, groups: s.groups.map(g => (g.id === id ? withExtras({ ...g, name: name.trim() }, extras) : g)) });
/** Lugares de una mesa: número entero positivo o vacío. */
export function validateCapacity(v: string): string | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  return /^\d{1,3}$/.test(t) && Number(t) > 0 ? undefined : 'Poné un número de lugares entre 1 y 999.';
}
/** Al eliminar un grupo, sus invitados quedan sin grupo (no se borran). */
export const removeGroup = (s: AppState, id: string): AppState => ({
  ...s, groups: s.groups.filter(g => g.id !== id), guests: s.guests.map(g => (g.groupId === id ? { ...g, groupId: null } : g)),
});
export const assignGuest = (s: AppState, guestId: string, groupId: string | null): AppState => {
  if (groupId && !s.groups.some(g => g.id === groupId)) return s;
  return { ...s, guests: s.guests.map(g => (g.id === guestId ? { ...g, groupId } : g)) };
};

/* ------------------------------------------------------------------ plan y publicación */

/** Lo que la pareja ya cargó y el plan dado no incluye: se conserva como borrador (no se publica) hasta que elija un plan que lo incluya. */
export function draftsFor(s: AppState, planId: PlanId): { feature: Feature; label: string; plan: string }[] {
  const found: [Feature, string, boolean][] = [
    ['site', 'La página del casamiento', s.site.events.some(hasEventDetails)],
    ['guests', 'Los invitados', s.guests.length > 0],
    ['groups', 'Las mesas y grupos', tablesInUse(s)],
    ['playlist', 'La música de la fiesta', s.site.playlist.tracks.length > 0],
    ['gallery', 'La galería de fotos', s.site.gallery.photos.length > 0],
    ['message', 'El mensaje final', s.site.message.text.trim() !== ''],
  ];
  return found.filter(([f, , has]) => has && !can(planId, f)).map(([feature, label]) => ({ feature, label, plan: planFor(feature)?.name ?? '' }));
}

/** Cambia de plan. Lo que el nuevo plan no incluye se desactiva en el sitio (los datos se conservan por si vuelve a subir). */
export function setPlan(s: AppState, planId: PlanId): AppState {
  return { ...s, planId, preferredPlan: planId };
}

export type TaskStatus = 'todo' | 'doing' | 'done';
/** `to` es la pantalla donde se hace; la tarea «datos» se resuelve en un diálogo del resumen. */
export type Task = { id: 'datos' | 'regalos' | 'sitio' | 'invitados' | 'mesas'; label: string; help: string; status: TaskStatus; done: boolean; to: string; optional?: boolean };

export const hasEventDetails = (e: SiteEvent) => e.enabled && (e.name.trim() !== '' || e.address.trim() !== '');
const eventComplete = (e: SiteEvent) => e.enabled && e.name.trim() !== '' && e.address.trim() !== '';

const mk = (t: Omit<Task, 'done'>): Task => ({ ...t, done: t.status === 'done' });

/** Pasos del casamiento según el plan. El estado sale siempre de los datos reales: nadie lo marca a mano. */
export function tasks(s: AppState): Task[] {
  const t: Task[] = [];
  t.push(mk({ id: 'datos', label: 'Datos del casamiento', help: 'Nombres, fecha y foto de portada.', status: s.date ? 'done' : 'doing', to: '/panel', optional: true }));
  if (can(s.planId, 'gifts')) {
    const items = s.gifts.items.length > 0; const alias = s.gifts.alias.trim() !== '';
    t.push(mk({ id: 'regalos', label: 'Lista de regalos', help: 'Elegí un set o sumá regalos de a uno, y cargá tu alias.', status: items && alias ? 'done' : items || alias ? 'doing' : 'todo', to: '/panel/regalos' }));
  }
  if (can(s.planId, 'site')) {
    const ev = s.site.events;
    t.push(mk({ id: 'sitio', label: 'Tu página web', help: 'Lugares, horarios y las secciones que quieras mostrar.', status: ev.some(eventComplete) ? 'done' : ev.some(hasEventDetails) ? 'doing' : 'todo', to: '/panel/sitio' }));
  }
  if (can(s.planId, 'guests')) t.push(mk({ id: 'invitados', label: 'Invitados', help: 'Cargá a las personas y seguí sus confirmaciones.', status: s.guests.length ? 'done' : 'todo', to: '/panel/invitados' }));
  if (can(s.planId, 'groups')) {
    const loose = s.guests.filter(g => g.status !== 'declined' && !g.groupId).length;
    t.push(mk({ id: 'mesas', label: 'Mesas y grupos', help: 'Organizá dónde se sienta cada persona.', status: !tablesInUse(s) ? 'todo' : loose === 0 && s.guests.length > 0 ? 'done' : 'doing', to: '/panel/mesas', optional: true }));
  }
  return t;
}

export function readiness(s: AppState) {
  const list = tasks(s);
  const pending = list.filter(x => !x.done && !x.optional);
  return { tasks: list, next: pending[0] ?? null, ready: pending.length === 0, remaining: pending.length };
}

/** Qué páginas públicas existen según el plan (el plan Regalos solo tiene la lista de regalos). */
export const publicPages = (planId: PlanId | null) => ({ invitation: can(planId, 'site'), gifts: can(planId, 'gifts') });

export const siteSlug = (s: AppState) => s.slug || slugify(s.couple.first, s.couple.second);
export const sitePath = (s: AppState) => `/sitio/${siteSlug(s)}`;

export type ReceivedGift = { id: string; giver: string; message: string; giftName: string; amount: number; how: 'alias' | 'tarjeta' | null; at: number | null };

/** Regalos que los invitados ya hicieron, del más nuevo al más viejo. Completa con la lista si falta el nombre o el monto. */
export function receivedGifts(s: AppState): ReceivedGift[] {
  return s.gifts.given
    .map(x => {
      const g = s.gifts.items.find(i => i.id === x.id);
      return { id: x.id, giver: x.name.trim() || 'Un invitado', message: x.message, giftName: x.giftName ?? g?.name ?? 'Regalo', amount: x.amount ?? g?.amount ?? 0, how: x.how ?? null, at: x.at ?? null };
    })
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}
export const receivedTotal = (r: ReceivedGift[]) => r.reduce((n, x) => n + x.amount, 0);
