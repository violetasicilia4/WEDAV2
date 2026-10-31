/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API, sin esquema compartido todavía */
// Capa de acceso a datos con el servidor (cuenta real + casamiento guardado en el servidor). El resto del panel sigue leyendo y
// escribiendo el mismo AppState local (store.ts): este módulo lo sincroniza en segundo plano y expone el estado del guardado.
//
// Reglas (ver docs/backend-readiness.md):
//  - Sin sesión, todo sigue como antes: borrador solo en este navegador (modo demostración).
//  - Con sesión, el servidor es la fuente de verdad. Un guardado nunca se da por hecho hasta que el servidor responde 200.
//  - Concurrencia optimista: cada guardado lleva la revisión que este dispositivo vio; si otro dispositivo guardó antes (409) se frena
//    el guardado automático y se pide recargar, en vez de pisar datos.
//  - Los invitados viajan como operaciones (altas/cambios/bajas), no como lista completa: así no se pierden respuestas del sitio público.
import { useSyncExternalStore } from 'react';
import { hasEvent } from './account';
import { addTerm } from './payments';
import { getState, replace, reset, subscribeState } from './store';
import type { AppState, Guest, PlanId, Publication } from './types';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
export type RemoteState = {
  /** false hasta que se supo si hay sesión (evita redirigir al onboarding antes de tiempo). */
  settled: boolean;
  user: { email: string } | null;
  save: SaveState;
  /** Código del último error de guardado o de carga (no un texto del servidor). */
  error: string | null;
  /** Aviso para la persona (por ejemplo, que se conservó el borrador local). */
  notice: string | null;
  /** `pendingChanges`: lo guardado difiere de la página pública (lo calcula el servidor). Sin dato todavía: undefined. */
  publication: { status: string; planId: string; version: number; publishedAt: string; pendingChanges?: boolean | null } | null;
  /** Cobro: si el servidor tiene un proveedor de pagos y qué plan está pagado (confirmado por el proveedor). null = todavía no se sabe. */
  payments: { enabled: boolean; paidPlan: string | null } | null;
};

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, public detail?: string) { super(code); }
}

export async function api<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, credentials: 'same-origin', ...(body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  } catch {
    throw new ApiFailure(0, 'network');
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) throw new ApiFailure(res.status, data?.error ?? 'error', data?.detail);
  return data as T;
}

/* ------------------------------------------------------------------ estado observable */

let remote: RemoteState = { settled: false, user: null, save: 'idle', error: null, notice: null, publication: null, payments: null };
const listeners = new Set<() => void>();
const set = (p: Partial<RemoteState>) => { remote = { ...remote, ...p }; listeners.forEach(l => l()); };
const SERVER_REMOTE: RemoteState = remote;
export const getRemote = () => remote;
export function useRemote(): RemoteState {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, getRemote, () => SERVER_REMOTE);
}

/* ------------------------------------------------------------------ borrador y diferencias */

/** Lo que se guarda en el servidor como borrador: todo menos lo que tiene tabla propia o es solo local. */
export const draftOf = (s: AppState): AppState => ({ ...s, guests: [], gifts: { ...s.gifts, given: [] }, publication: null, email: '', seeded: false, slug: undefined });
const guestKey = (g: Guest) => JSON.stringify([g.first, g.last, g.status, g.menu, g.groupId, g.source]);

let revision = 0;
let syncedDraft = '';
let syncedGuests = new Map<string, string>();
let baselineRef: AppState | null = null;
let unsub: (() => void) | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight = false;
let rerun = false;
let retry = 0;
let started: Promise<void> | undefined;
let frozen = false; // tras un conflicto no se guarda automáticamente

const DEBOUNCE = 800;
const BACKOFF = [3000, 10_000, 30_000, 60_000];

/** La publicación manda el servidor: si en otro dispositivo se publicó o se dio de baja, este navegador lo refleja. El historial de pagos de prueba es solo local. */
function reconcilePublication(local: Publication | null, server: { status: string; planId: string; publishedAt: string } | null): Publication | null {
  if (!server) return local;
  const live = server.status === 'live';
  if (local) return { ...local, live, planId: server.planId as PlanId };
  return { planId: server.planId as PlanId, live, publishedAt: server.publishedAt, expiresAt: addTerm(server.publishedAt), payments: [] };
}

function mergeFromServer(local: AppState, w: any, email: string): AppState {
  return { ...w.draft, guests: w.guests, email, gifts: { ...w.draft.gifts, given: local.gifts.given }, publication: reconcilePublication(local.publication, w.publication), seeded: false, ...(w.slug ? { slug: w.slug } : {}) };
}

/* Marca local de lo último confirmado por el servidor (revisión y huella del borrador, sin duplicar las fotos). Sirve para distinguir, al volver a abrir la
   página, «cambios míos que todavía no llegaron al servidor» (se conservan y se suben) de «otro dispositivo guardó antes» (gana el servidor). */
const META_KEY = 'weda-sync';
const hashOf = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); };
type Meta = { email: string; revision: number; hash: string; guestIds: string[] };
const readMeta = (): Meta | null => { try { const m = JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null'); return m && typeof m.email === 'string' && typeof m.revision === 'number' ? m as Meta : null; } catch { return null; } };
const writeMeta = (email?: string) => { try { window.localStorage.setItem(META_KEY, JSON.stringify({ email: email ?? remote.user?.email ?? '', revision, hash: hashOf(syncedDraft), guestIds: [...syncedGuests.keys()] } satisfies Meta)); } catch { /* sin lugar: solo se pierde la ayuda para recuperar cambios */ } };

function markSynced(w: { revision: number; guests: Guest[]; draft: AppState }) {
  revision = w.revision;
  syncedDraft = JSON.stringify(draftOf(w.draft));
  syncedGuests = new Map(w.guests.map(g => [g.id, guestKey(g)]));
}

/* ------------------------------------------------------------------ inicio y mezcla con lo que hay en este navegador */

const BACKUP_KEY = 'weda-app-local-backup';

async function load(): Promise<void> {
  let me: { user: { email: string } | null };
  try { me = await api('GET', '/api/me'); } catch (e) { set({ settled: true, user: null, ...(e instanceof ApiFailure && e.code === 'backend_unavailable' ? {} : { error: 'network' }) }); return; }
  if (!me.user) { set({ settled: true, user: null }); return; }
  await attach(me.user.email);
}

/** Con sesión confirmada: trae el casamiento del servidor y lo combina con el borrador de este navegador sin perder ninguno de los dos. */
async function attach(email: string): Promise<void> {
  void refreshPayments();
  let w: any;
  try { w = await api('GET', '/api/wedding'); } catch (e) {
    set({ settled: true, user: { email }, error: e instanceof ApiFailure ? e.code : 'network', save: 'error' });
    return;
  }
  const local = getState();
  const serverHasData = !!w.draft.onboarded || !!w.draft.couple.first || !!w.draft.couple.second;
  if (!serverHasData && hasEvent(local)) {
    // Primer ingreso con un borrador local: se sube a la cuenta (el local no se borra).
    revision = w.revision; syncedDraft = ''; syncedGuests = new Map();
    replace({ ...local, email });
    baselineRef = null;
    set({ settled: true, user: { email }, error: null, notice: 'Guardamos en tu cuenta el casamiento que empezaste en este navegador.' });
    scheduleSave(0);
  } else if (serverHasData && isUnsyncedLocal(local, w, email)) {
    // Este navegador tiene cambios que no llegaron a guardarse (por ejemplo, se recargó antes del guardado) y nadie guardó otra cosa mientras tanto:
    // se conservan y se suben. Las respuestas que llegaron al servidor desde el sitio público se suman (no se pisan).
    const known = new Set(readMeta()?.guestIds ?? []);
    const arrived = (w.guests as Guest[]).filter(g => !known.has(g.id) && !local.guests.some(x => x.id === g.id));
    markSynced(w);
    replace({ ...local, email, guests: [...local.guests, ...arrived], ...(w.slug ? { slug: w.slug } : {}) });
    baselineRef = null;
    set({ settled: true, user: { email }, error: null, publication: w.publication });
    scheduleSave(0);
  } else if (serverHasData) {
    if (hasEvent(local) && JSON.stringify(draftOf(local)) !== JSON.stringify(draftOf(w.draft))) {
      try { window.localStorage.setItem(BACKUP_KEY, JSON.stringify(local)); } catch { /* sin lugar: el servidor igual conserva el casamiento de la cuenta */ }
      set({ notice: 'Abrimos el casamiento guardado en tu cuenta. El borrador que tenías en este navegador quedó guardado aparte.' });
    }
    replace(mergeFromServer(local, w, email));
    markSynced(w);
    baselineRef = getState();
    writeMeta(email);
    set({ settled: true, user: { email }, error: null, save: 'saved', publication: w.publication });
  } else {
    replace({ ...local, email, publication: reconcilePublication(local.publication, w.publication), ...(w.slug ? { slug: w.slug } : {}) });
    markSynced(w);
    baselineRef = getState();
    writeMeta(email);
    set({ settled: true, user: { email }, error: null, publication: w.publication });
  }
  frozen = false;
  unsub?.();
  unsub = subscribeState(() => { if (getState() !== baselineRef) scheduleSave(DEBOUNCE); });
}

function isUnsyncedLocal(local: AppState, w: any, email: string): boolean {
  const meta = readMeta();
  if (!meta || meta.email !== email || meta.revision !== w.revision) return false;
  const localJson = JSON.stringify(draftOf(local));
  return localJson !== JSON.stringify(draftOf(w.draft)) && hashOf(localJson) !== meta.hash;
}

/** Idempotente: la primera pantalla que lo necesite arranca la carga; las demás esperan la misma promesa. */
export function ensureRemote(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return (started ??= load());
}

/* ------------------------------------------------------------------ guardado */

function scheduleSave(delay: number) {
  if (frozen || !remote.user) return;
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
}

async function flush(): Promise<void> {
  if (frozen || !remote.user) return;
  if (inFlight) { rerun = true; return; }
  const snapshot = getState();
  const draftJson = JSON.stringify(draftOf(snapshot));
  const upsert = snapshot.guests.filter(g => syncedGuests.get(g.id) !== guestKey(g));
  const sentIds = new Set(snapshot.guests.map(g => g.id));
  const remove = [...syncedGuests.keys()].filter(id => !sentIds.has(id));
  if (draftJson === syncedDraft && upsert.length === 0 && remove.length === 0) { baselineRef = snapshot; return; }
  inFlight = true;
  set({ save: 'saving', error: null });
  try {
    const r = await api('PUT', '/api/wedding', { baseRevision: revision, draft: draftOf(snapshot), guests: { upsert, remove } });
    revision = r.revision;
    syncedDraft = draftJson;
    syncedGuests = new Map(snapshot.guests.map(g => [g.id, guestKey(g)]));
    // Respuestas del sitio público que llegaron mientras tanto: se suman (nunca se quita ni se pisa nada local).
    const known = new Set([...sentIds, ...remove]);
    const arrived = (r.guests as Guest[]).filter(g => !known.has(g.id));
    for (const g of arrived) syncedGuests.set(g.id, guestKey(g));
    if (arrived.length) replace({ ...getState(), guests: [...getState().guests, ...arrived.filter(g => !getState().guests.some(x => x.id === g.id))] });
    baselineRef = getState();
    writeMeta();
    retry = 0;
    const pub = remote.publication;
    set({ save: 'saved', error: null, ...(pub && typeof r.pendingChanges === 'boolean' ? { publication: { ...pub, pendingChanges: r.pendingChanges } } : {}) });
  } catch (e) {
    if (e instanceof ApiFailure && e.status === 409 && e.code === 'revision_conflict') {
      frozen = true;
      set({ save: 'conflict', error: 'revision_conflict' });
    } else if (e instanceof ApiFailure && e.status === 401) {
      frozen = true;
      set({ save: 'error', error: 'session_expired', user: null });
    } else {
      set({ save: 'error', error: e instanceof ApiFailure ? e.code : 'network' });
      const wait = BACKOFF[Math.min(retry++, BACKOFF.length - 1)]!;
      scheduleSave(wait);
    }
  } finally {
    inFlight = false;
    if (rerun) { rerun = false; scheduleSave(0); }
  }
}

/** Reintento manual desde el aviso de error. */
export function retrySave() { retry = 0; scheduleSave(0); }

/** Hay cambios sin confirmar por el servidor (para avisar antes de cerrar la pestaña). */
export const hasUnsaved = () => !!remote.user && (remote.save === 'saving' || remote.save === 'error' || remote.save === 'conflict' || timer !== undefined);

/** Descarta lo local y vuelve a cargar lo del servidor (después de un conflicto). El borrador local queda en una copia aparte. */
export async function reloadFromServer(): Promise<void> {
  const local = getState();
  try { window.localStorage.setItem(BACKUP_KEY, JSON.stringify(local)); } catch { /* ver nota arriba */ }
  frozen = false;
  set({ save: 'idle', error: null, settled: false });
  await attach(remote.user?.email ?? local.email);
  set({ notice: 'Recargamos lo último guardado en tu cuenta. Tus cambios sin guardar quedaron en una copia aparte.' });
}

export const dismissNotice = () => set({ notice: null });
export const setNotice = (notice: string) => set({ notice });

/* ------------------------------------------------------------------ cuenta y publicación */

export type AuthResult = { ok: true } | { ok: false; code: string };

async function auth(path: 'register' | 'login', email: string, password: string): Promise<AuthResult> {
  try {
    const r = await api<{ user: { email: string } }>('POST', `/api/auth/${path}`, { email, password });
    started = undefined;
    await attach(r.user.email);
    started = Promise.resolve();
    return { ok: true };
  } catch (e) {
    return { ok: false, code: e instanceof ApiFailure ? e.code : 'network' };
  }
}
export const register = (email: string, password: string) => auth('register', email, password);
export const login = (email: string, password: string) => auth('login', email, password);

/** Cambia la clave con la sesión abierta. El servidor exige la clave actual y cierra las demás sesiones; esta sigue abierta. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
  try { await api('POST', '/api/auth/password', { currentPassword, newPassword }); return { ok: true }; }
  catch (e) {
    const code = e instanceof ApiFailure ? e.code : 'network';
    return { ok: false, code: code === 'unauthenticated' ? 'session_expired' : code };
  }
}

const authCode = (e: unknown) => { const code = e instanceof ApiFailure ? e.code : 'network'; return code === 'unauthenticated' ? 'session_expired' : code; };

/** Cuántas sesiones abiertas tiene la cuenta además de esta (otros dispositivos o navegadores). */
export async function otherSessions(): Promise<{ ok: true; others: number } | { ok: false; code: string }> {
  try { const r = await api<{ others: number }>('GET', '/api/auth/sessions'); return { ok: true, others: r.others }; }
  catch (e) { return { ok: false, code: authCode(e) }; }
}

/** Cierra las demás sesiones de la cuenta; esta sigue abierta. */
export async function closeOtherSessions(): Promise<{ ok: true; closed: number } | { ok: false; code: string }> {
  try { const r = await api<{ closed: number }>('POST', '/api/auth/sessions/close-others'); return { ok: true, closed: r.closed }; }
  catch (e) { return { ok: false, code: authCode(e) }; }
}

export async function logout(): Promise<void> {
  try { await api('POST', '/api/auth/logout'); } catch { /* si no hay red, la cookie igual vence */ }
  unsub?.(); unsub = undefined; baselineRef = null; frozen = false;
  if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
  try { window.localStorage.removeItem(META_KEY); } catch { /* nada que borrar */ }
  reset();
  started = Promise.resolve();
  set({ settled: true, user: null, save: 'idle', error: null, notice: null, publication: null, payments: null });
}

/** Publica de verdad en el servidor lo último guardado. Primero se asegura de que el servidor tenga el borrador actual. */
export async function publishRemote(): Promise<{ ok: true; slug: string } | { ok: false; code: string }> {
  if (!remote.user) return { ok: false, code: 'no_session' };
  try {
    if (timer !== undefined) { clearTimeout(timer); timer = undefined; }
    while (inFlight) await new Promise(r => setTimeout(r, 50));
    await flush();
    if (remote.save === 'error' || remote.save === 'conflict') return { ok: false, code: remote.error ?? 'save_failed' };
    const r = await api<{ slug: string; planId: string; version: number }>('POST', '/api/wedding/publish');
    replace({ ...getState(), slug: r.slug });
    baselineRef = getState();
    set({ publication: { status: 'live', planId: r.planId, version: r.version, publishedAt: remote.publication?.publishedAt ?? new Date().toISOString(), pendingChanges: false } });
    return { ok: true, slug: r.slug };
  } catch (e) {
    return { ok: false, code: e instanceof ApiFailure ? e.code : 'network' };
  }
}

export async function unpublishRemote(): Promise<{ ok: true } | { ok: false; code: string }> {
  if (!remote.user) return { ok: true };
  try { await api('POST', '/api/wedding/unpublish'); set({ publication: remote.publication ? { ...remote.publication, status: 'taken_down' } : null }); return { ok: true }; }
  catch (e) { return { ok: false, code: e instanceof ApiFailure ? e.code : 'network' }; }
}

/** Mensajes para la persona (nunca el texto crudo del servidor). */
export const ERROR_TEXT: Record<string, string> = {
  backend_unavailable: 'Las cuentas no están disponibles en este momento.',
  network: 'No hay conexión con Weda. Revisá tu internet y probá de nuevo.',
  invalid_credentials: 'El correo o la clave no coinciden.',
  wrong_password: 'La clave actual no es correcta.',
  email_taken: 'Ya existe una cuenta con ese correo. Probá ingresar.',
  invalid_email: 'Ingresá un correo válido.',
  weak_password: 'Usá 8 o más caracteres, con mayúsculas, minúsculas y un número.',
  too_many_attempts: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
  session_expired: 'Tu sesión venció. Ingresá de nuevo para seguir guardando.',
  revision_conflict: 'Este casamiento se modificó desde otro dispositivo.',
  payment_required: 'Falta el pago del plan para publicar.',
  payments_not_configured: 'El cobro todavía no está disponible.',
  already_paid: 'Ese plan ya está pagado.',
  publication_expired: 'Tu publicación venció. Escribinos a hola@weda.app para volver a publicarla.',
  incomplete: 'Completá los nombres de la pareja para publicar.',
  no_plan: 'Elegí un plan para publicar.',
  invalid_or_expired_token: 'El enlace venció o ya se usó. Pedí uno nuevo.',
  too_many_requests: 'Hiciste demasiados pedidos seguidos. Esperá un rato y probá de nuevo.',
};
export const errorText = (code: string | null) => (code && ERROR_TEXT[code]) || 'Algo salió mal de nuestro lado. Probá de nuevo en un rato.';

/* ------------------------------------------------------------------ pagos (el servidor decide: la interfaz solo pregunta y redirige) */

/** Vuelve a preguntar al servidor si hay cobro configurado y qué plan está pagado. */
export async function refreshPayments(): Promise<void> {
  try { const r = await api<{ payments: boolean; paidPlan: string | null }>('GET', '/api/payments'); set({ payments: { enabled: r.payments, paidPlan: r.paidPlan } }); }
  catch { set({ payments: null }); }
}

/** Empieza el pago de un plan. El monto lo calcula el servidor. Devuelve adónde ir a pagar (o el error). No marca nada como pagado. */
export async function startCheckout(planId: string): Promise<{ ok: true; orderId: string; url: string } | { ok: false; code: string }> {
  try {
    await flush();
    const r = await api<{ id: string; checkoutUrl: string }>('POST', '/api/checkout', { planId });
    return { ok: true, orderId: r.id, url: r.checkoutUrl };
  } catch (e) { return { ok: false, code: e instanceof ApiFailure ? e.code : 'network' }; }
}

export type OrderStatus = { id: string; planId: string; amount: number; status: 'pending' | 'paid' | 'failed' | 'cancelled'; paidAt: string | null };
/** Estado real de una orden según el servidor (al volver del proveedor o para retomar un pago interrumpido). */
export async function getOrder(id: string): Promise<{ ok: true; order: OrderStatus } | { ok: false; code: string }> {
  try { return { ok: true, order: await api<OrderStatus>('GET', `/api/orders/${encodeURIComponent(id)}`) }; }
  catch (e) { return { ok: false, code: e instanceof ApiFailure ? e.code : 'network' }; }
}
