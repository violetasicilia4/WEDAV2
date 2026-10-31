// Dominio de Weda en el servidor. TODA la autorización vive acá: cada función que toca datos privados recibe el `userId`
// ya autenticado y filtra por él; ninguna confía en un identificador que venga del cliente. No depende de HTTP (ver api.ts).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { normalizeName, publicSite, sanitizeDraft, type DraftState } from './draft';
import { tx, type Db } from './db';
import { ApiError, conflict, forbidden, invalid, notFound, unauthorized } from './errors';
import { hashPassword, newId, newToken, RateLimiter, sha256, verifyPassword } from './security';
import type { ServerConfig } from './config';
import { emptyState, isEmail, slugify, strongPassword } from '@/lib/weda/logic';
import { planById, isPlanId } from '@/lib/weda/plans';
import type { Guest, PlanId } from '@/lib/weda/types';
import type { SiteData } from '@/lib/weda/site-model';
import { MARKETING_CONSENT_VERSION } from '@/lib/weda/consent';
import { formatARS } from '@/lib/demo-wedding';
import { layout, sendMail, unsubscribeUrl, verifyUnsubscribe } from './mail';
import { providerFor, signedTestNotification, type Outcome } from './payments';
import { addTerm } from '@/lib/weda/payments';
import { externalizeImages } from './media';
import { ALLOWED_PROPS, CLIENT_EVENTS, type EventProps, type ServerEvent } from '@/lib/analytics-events';

/** Entre un recordatorio de comprobante y el siguiente, para el mismo aporte. */
const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;

const SESSION_DAYS = 30;
/** Cuánto vale el enlace para cambiar la clave. */
const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_DRAFT_BYTES = 6 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const now = () => new Date().toISOString();
type Row = Record<string, unknown>;

/** Estados de un aporte y quién puede cambiarlos (solo la pareja dueña, desde el panel). Reglas propuestas, pendientes de confirmación comercial. */
export const CONTRIBUTION_TRANSITIONS: Record<string, string[]> = {
  pending_review: ['confirmed', 'rejected'],
  confirmed: ['rejected'],
  rejected: ['pending_review'],
};

export type Session = { userId: string; email: string };
export type GuestInput = { id: string; first: string; last: string; status: Guest['status']; menu: string; groupId: string | null; source: Guest['source'] };

export class Service {
  private loginLimiter = new RateLimiter(8, 15 * 60_000);
  /** Pedidos de recuperación: por correo y por IP, para no usar el formulario para mandar correos en masa. */
  private resetLimiter = new RateLimiter(5, 60 * 60_000);
  private resetIpLimiter = new RateLimiter(20, 60 * 60_000);
  constructor(public db: Db, public cfg: ServerConfig) {}

  /* ------------------------------------------------------------------ cuentas y sesiones */

  async register(emailRaw: unknown, password: unknown): Promise<{ user: Session; token: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!isEmail(email) || email.length > 200) throw invalid('invalid_email');
    if (typeof password !== 'string' || !strongPassword(password) || password.length > 200) throw invalid('weak_password');
    const hash = await hashPassword(password);
    const id = newId('usr');
    try {
      this.db.prepare('INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(id, email, hash, now());
    } catch (e) {
      if (String((e as Error).message).includes('UNIQUE')) throw conflict('email_taken');
      throw e;
    }
    this.track('signup_completed');
    return { user: { userId: id, email }, token: this.newSession(id) };
  }

  async login(emailRaw: unknown, password: unknown, ipKey = ''): Promise<{ user: Session; token: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string') throw invalid('invalid_credentials');
    if (!this.loginLimiter.take(`${email}|${ipKey}`)) throw new ApiError(429, 'too_many_attempts');
    const row = this.db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email) as Row | undefined;
    // Se calcula el hash aunque el correo no exista, para no distinguirlos por tiempo.
    const ok = await verifyPassword(password, (row?.['password_hash'] as string | undefined) ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAA');
    if (!row || !ok) throw new ApiError(401, 'invalid_credentials');
    this.loginLimiter.reset(`${email}|${ipKey}`);
    return { user: { userId: row['id'] as string, email }, token: this.newSession(row['id'] as string) };
  }

  private newSession(userId: string): string {
    const token = newToken();
    const exp = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
    this.db.prepare('INSERT INTO sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)').run(sha256(token), userId, now(), exp);
    return token;
  }

  sessionFromToken(token: string | undefined): Session | null {
    if (!token) return null;
    const row = this.db.prepare('SELECT u.id AS id, u.email AS email, s.expires_at AS exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(sha256(token)) as Row | undefined;
    if (!row) return null;
    if ((row['exp'] as string) <= now()) { this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token)); return null; }
    return { userId: row['id'] as string, email: row['email'] as string };
  }

  /* ------------------------------------------------------------------ embudo */

  /** Registra un evento del embudo. Nunca falla hacia afuera: medir no puede romper un registro, un pago ni una publicación. */
  private track(name: ServerEvent | string, props: EventProps = {}, source: 'server' | 'client' = 'server') {
    try {
      const clean = Object.fromEntries(Object.entries(props).filter(([k, v]) => (ALLOWED_PROPS as readonly string[]).includes(k) && ['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 40));
      this.db.prepare('INSERT INTO funnel_events (name,source,props,at) VALUES (?,?,?,?)').run(name, source, JSON.stringify(clean), now());
    } catch (e) { console.error('No se pudo registrar el evento:', e); }
  }

  /** Eventos que manda el navegador: solo los de la lista del cliente (nunca «pago confirmado» ni otro que pruebe algo). */
  recordClientEvent(nameRaw: unknown, propsRaw: unknown) {
    if (typeof nameRaw !== 'string' || !(CLIENT_EVENTS as readonly string[]).includes(nameRaw)) throw invalid('unknown_event');
    this.track(nameRaw, (propsRaw && typeof propsRaw === 'object' ? propsRaw : {}) as EventProps, 'client');
    return { ok: true };
  }

  /* ------------------------------------------------------------------ recuperar la clave */

  /** Pide el enlace para cambiar la clave. Responde lo mismo exista o no la cuenta (no revela qué correos están registrados). */
  async requestPasswordReset(emailRaw: unknown, ipKey = ''): Promise<{ ok: true }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!isEmail(email) || email.length > 200) throw invalid('invalid_email');
    if (!this.resetLimiter.take(email) || !this.resetIpLimiter.take(ipKey)) throw new ApiError(429, 'too_many_requests');
    const user = this.db.prepare('SELECT id FROM users WHERE email = ?').get(email) as Row | undefined;
    if (!user) return { ok: true };
    const token = newToken();
    const created = new Date();
    const expires = new Date(created.getTime() + RESET_TTL_MS);
    tx(this.db, () => {
      // Un enlace nuevo anula los anteriores sin usar.
      this.db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(created.toISOString(), user['id'] as string);
      this.db.prepare('INSERT INTO password_resets (id,user_id,token_hash,created_at,expires_at,used_at) VALUES (?,?,?,?,?,NULL)').run(newId('rst'), user['id'] as string, sha256(token), created.toISOString(), expires.toISOString());
    });
    const url = `${this.cfg.publicUrl}/clave/nueva?token=${encodeURIComponent(token)}`;
    const body = layout({
      title: 'Cambiá tu clave de Weda',
      paragraphs: ['Pediste cambiar la clave de tu cuenta. El enlace vale por una hora y sirve una sola vez.', 'Si no lo pediste, ignorá este correo: tu clave sigue igual.'],
      button: { label: 'Elegir una clave nueva', url },
    });
    // Sin esperar el envío: así la respuesta tarda lo mismo exista o no la cuenta.
    void sendMail(this.db, this.cfg, 'password_reset', { to: email, subject: 'Cambiá tu clave de Weda', ...body }, user['id'] as string);
    return { ok: true };
  }

  /** Cambia la clave con el token del enlace. Token de un solo uso y con vencimiento; al usarlo se cierran todas las sesiones de la cuenta. */
  async resetPassword(tokenRaw: unknown, password: unknown): Promise<{ ok: true }> {
    if (typeof tokenRaw !== 'string' || tokenRaw.length < 20 || tokenRaw.length > 200) throw invalid('invalid_or_expired_token');
    if (typeof password !== 'string' || !strongPassword(password) || password.length > 200) throw invalid('weak_password');
    const row = this.db.prepare('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?').get(sha256(tokenRaw)) as Row | undefined;
    if (!row || row['used_at'] || Date.parse(row['expires_at'] as string) <= Date.now()) throw invalid('invalid_or_expired_token');
    const hash = await hashPassword(password);
    tx(this.db, () => {
      // Se vuelve a verificar dentro de la transacción: dos envíos simultáneos con el mismo token no pasan los dos.
      const still = this.db.prepare('SELECT used_at FROM password_resets WHERE id = ?').get(row['id'] as string) as Row | undefined;
      if (!still || still['used_at']) throw invalid('invalid_or_expired_token');
      const t = now();
      this.db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(t, row['user_id'] as string);
      this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row['user_id'] as string);
      this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row['user_id'] as string);
    });
    return { ok: true };
  }

  logout(token: string | undefined) {
    if (token) this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token));
  }

  /* ------------------------------------------------------------------ casamiento (privado) */

  private weddingOf(userId: string): Row | undefined {
    return this.db.prepare('SELECT * FROM weddings WHERE owner_id = ?').get(userId) as Row | undefined;
  }

  private ensureWedding(userId: string): Row {
    const existing = this.weddingOf(userId);
    if (existing) return existing;
    const t = now();
    const draft = JSON.stringify(sanitizeDraft(emptyState()));
    this.db.prepare('INSERT INTO weddings (id,owner_id,draft,revision,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(newId('wed'), userId, draft, 1, t, t);
    return this.weddingOf(userId)!;
  }

  private guestsOf(weddingId: string): Guest[] {
    const rows = this.db.prepare('SELECT * FROM guests WHERE wedding_id = ? ORDER BY created_at, id').all(weddingId) as Row[];
    return rows.map(r => ({ id: r['id'] as string, first: r['first'] as string, last: r['last'] as string, status: r['status'] as Guest['status'], menu: r['menu'] as string, groupId: (r['group_id'] as string | null) ?? null, source: r['source'] as Guest['source'] }));
  }

  /** Lo que el panel necesita para trabajar: borrador, invitados, estado de publicación y órdenes. Solo del dueño. */
  getWedding(userId: string) {
    const w = this.ensureWedding(userId);
    const wid = w['id'] as string;
    const pub = this.db.prepare('SELECT status, plan_id, version, published_at, updated_at, expires_at FROM publications WHERE wedding_id = ?').get(wid) as Row | undefined;
    return {
      id: wid,
      revision: w['revision'] as number,
      slug: (w['slug'] as string | null) ?? null,
      draft: JSON.parse(w['draft'] as string) as DraftState,
      guests: this.guestsOf(wid),
      publication: pub ? { status: pub['status'] as string, planId: pub['plan_id'] as string, version: pub['version'] as number, publishedAt: pub['published_at'] as string, expiresAt: (pub['expires_at'] as string | null) ?? null, pendingChanges: this.pendingChanges(w) } : null,
    };
  }

  /**
   * ¿Publicar ahora cambiaría la página pública? Arma el snapshot como lo haría `publish` y lo compara con el publicado.
   * Solo cuenta lo que ve un invitado: invitados, datos de cobro sin mostrar o secciones que el plan no incluye no generan aviso. null sin publicación.
   */
  private pendingChanges(w: Row): boolean | null {
    const wid = w['id'] as string;
    const slug = w['slug'] as string | null;
    const pub = this.db.prepare('SELECT plan_id, snapshot FROM publications WHERE wedding_id = ?').get(wid) as Row | undefined;
    if (!pub || !slug) return null;
    const draft = JSON.parse(w['draft'] as string) as DraftState;
    let planId = pub['plan_id'] as PlanId;
    try { planId = this.entitledPlan(wid, draft.planId); } catch { /* sin plan o sin pago: publicar fallaría; se compara con el plan publicado */ }
    return JSON.stringify(publicSite(draft, planId, slug)) !== (pub['snapshot'] as string);
  }

  /**
   * Guarda el borrador. `baseRevision` es la revisión que el cliente vio: si otra pestaña/dispositivo guardó antes, responde 409 y no pisa nada.
   * Los invitados se actualizan por operaciones (no por lista completa) para no borrar respuestas que llegaron desde el sitio público mientras tanto.
   */
  saveWedding(userId: string, input: { baseRevision: unknown; draft: unknown; guests?: { upsert?: unknown; remove?: unknown } }) {
    if (typeof input.baseRevision !== 'number' || !Number.isInteger(input.baseRevision)) throw invalid('invalid_revision');
    const serialized = JSON.stringify(input.draft ?? null);
    if (serialized.length > MAX_DRAFT_BYTES) throw new ApiError(413, 'draft_too_large');
    // Fotos embebidas → archivos (media.ts). Va antes de la transacción: escribir archivos no debe retener el candado de la base.
    const draft = externalizeImages(sanitizeDraft(input.draft), this.cfg.dataDir);
    const upserts = parseGuestInputs(input.guests?.upsert);
    const removes = Array.isArray(input.guests?.remove) ? (input.guests!.remove as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= 80).slice(0, 5000) : [];
    return tx(this.db, () => {
      const w = this.ensureWedding(userId);
      const wid = w['id'] as string;
      if (w['revision'] !== input.baseRevision) throw new ApiError(409, 'revision_conflict', String(w['revision']));
      const t = now();
      const next = (w['revision'] as number) + 1;
      this.db.prepare('UPDATE weddings SET draft = ?, revision = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(draft), next, t, wid);
      for (const g of upserts) {
        const owner = this.db.prepare('SELECT wedding_id FROM guests WHERE id = ?').get(g.id) as Row | undefined;
        if (owner && owner['wedding_id'] !== wid) throw conflict('guest_id_in_use'); // nunca se toca un invitado de otro casamiento
        if (owner) this.db.prepare('UPDATE guests SET first=?,last=?,name_key=?,status=?,menu=?,group_id=?,source=?,updated_at=? WHERE id=? AND wedding_id=?').run(g.first, g.last, normalizeName(g.first, g.last), g.status, g.menu, g.groupId, g.source, t, g.id, wid);
        else this.db.prepare('INSERT INTO guests (id,wedding_id,first,last,name_key,status,menu,group_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(g.id, wid, g.first, g.last, normalizeName(g.first, g.last), g.status, g.menu, g.groupId, g.source, t, t);
      }
      for (const id of removes) this.db.prepare('DELETE FROM guests WHERE id = ? AND wedding_id = ?').run(id, wid);
      return { revision: next, guests: this.guestsOf(wid), pendingChanges: this.pendingChanges({ ...w, draft: JSON.stringify(draft) }) };
    });
  }

  /* ------------------------------------------------------------------ publicación */

  /** Plan con el que se publica: el que el servidor puede respaldar. Con `requirePaidOrder`, el de la orden pagada; si no, el elegido en el borrador. */
  private entitledPlan(wid: string, draftPlan: PlanId | null): PlanId {
    if (this.cfg.requirePaidOrder) {
      const paid = this.db.prepare("SELECT plan_id FROM orders WHERE wedding_id = ? AND status = 'paid'").all(wid) as Row[];
      const best = paid.map(r => planById(r['plan_id'] as PlanId)).filter(Boolean).sort((a, b) => b!.price - a!.price)[0];
      if (!best) throw new ApiError(402, 'payment_required');
      return best.id;
    }
    if (!draftPlan) throw conflict('no_plan');
    return draftPlan;
  }

  publish(userId: string) {
    return tx(this.db, () => {
      const w = this.ensureWedding(userId);
      const wid = w['id'] as string;
      const draft = JSON.parse(w['draft'] as string) as DraftState;
      if (!draft.couple.first.trim() || !draft.couple.second.trim()) throw conflict('incomplete', 'couple_names');
      const planId = this.entitledPlan(wid, draft.planId);
      let slug = w['slug'] as string | null;
      if (!slug) {
        const base = slugify(draft.couple.first, draft.couple.second) || 'casamiento';
        slug = base;
        for (let i = 2; this.db.prepare('SELECT 1 FROM weddings WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`;
        this.db.prepare('UPDATE weddings SET slug = ? WHERE id = ?').run(slug, wid);
      }
      const snapshot = publicSite(draft, planId, slug);
      const t = now();
      const prev = this.db.prepare('SELECT version, published_at, expires_at FROM publications WHERE wedding_id = ?').get(wid) as Row | undefined;
      // Vencimiento (PUBLICATION_MONTHS desde la PRIMERA publicación, en UTC): publicar cambios, bajar y volver a publicar o mejorar el plan no lo extienden.
      // Una publicación vencida no se reabre sola: renovar es una decisión comercial pendiente (production-readiness.md). El contenido no se borra.
      if (prev && Date.parse(expiresOf(prev)) <= Date.now()) throw conflict('publication_expired');
      if (prev) this.db.prepare("UPDATE publications SET status='live', plan_id=?, snapshot=?, version=?, updated_at=?, expires_at=? WHERE wedding_id=?").run(planId, JSON.stringify(snapshot), (prev['version'] as number) + 1, t, expiresOf(prev), wid);
      else this.db.prepare("INSERT INTO publications (wedding_id,status,plan_id,snapshot,version,published_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?)").run(wid, 'live', planId, JSON.stringify(snapshot), 1, t, t, addTerm(t));
      this.track('publication_completed', { plan_id: planId, is_republish: !!prev });
      return { slug, planId, version: ((prev?.['version'] as number | undefined) ?? 0) + 1 };
    });
  }

  unpublish(userId: string) {
    const w = this.weddingOf(userId);
    if (!w) throw notFound();
    const r = this.db.prepare("UPDATE publications SET status='taken_down', updated_at=? WHERE wedding_id=? AND status='live'").run(now(), w['id'] as string);
    if (Number(r.changes) === 0) throw conflict('not_live');
  }

  /* ------------------------------------------------------------------ sitio público (sin sesión) */

  private livePublication(slug: string): { wid: string; snapshot: SiteData; status: string } {
    const row = this.db.prepare('SELECT w.id AS wid, p.snapshot AS snapshot, p.status AS status, p.published_at AS published_at, p.expires_at AS expires_at FROM weddings w JOIN publications p ON p.wedding_id = w.id WHERE w.slug = ?').get(slug) as Row | undefined;
    if (!row) throw notFound('site_not_found');
    if (row['status'] !== 'live') throw new ApiError(410, 'site_unpublished');
    // Vencida: el servidor decide (no un temporizador del navegador). Vale para la página, las confirmaciones y los regalos.
    if (Date.parse(expiresOf(row)) <= Date.now()) throw new ApiError(410, 'site_expired');
    return { wid: row['wid'] as string, snapshot: JSON.parse(row['snapshot'] as string) as SiteData, status: 'live' };
  }

  /** Solo el snapshot publicado y los ids de regalos ya tomados (sin nombres ni mensajes de nadie). */
  getPublicSite(slug: string) {
    const p = this.livePublication(slug);
    const taken = this.db.prepare("SELECT DISTINCT i.gift_id AS id FROM contribution_items i JOIN contributions c ON c.id = i.contribution_id WHERE c.wedding_id = ? AND c.status != 'rejected'").all(p.wid) as Row[];
    this.track('public_invitation_opened');
    return { site: p.snapshot, takenGiftIds: taken.map(r => r['id'] as string) };
  }

  /** Confirmación de asistencia. No devuelve datos de invitados: ni existentes ni propios. */
  submitRsvp(slug: string, peopleRaw: unknown, contactRaw?: unknown) {
    const p = this.livePublication(slug);
    if (!p.snapshot.blocks.rsvp) throw conflict('rsvp_disabled');
    const people = parseRsvp(peopleRaw, p.snapshot.rsvp.menus !== null);
    // Correo opcional de quien responde (queda en cada persona de este envío). Novedades de Weda: solo con correo y casilla tildada.
    const contact = (contactRaw ?? {}) as Row;
    const email = optEmail(contact['email']);
    const optIn = contact['marketingOptIn'] === true && !!email;
    return tx(this.db, () => {
      const t = now();
      for (const x of people) {
        const key = normalizeName(x.first, x.last);
        const found = this.db.prepare('SELECT id FROM guests WHERE wedding_id = ? AND name_key = ? ORDER BY created_at LIMIT 1').get(p.wid, key) as Row | undefined;
        const status = x.attending ? 'confirmed' : 'declined';
        const menu = x.attending ? x.menu : '';
        let gid: string;
        if (found) { gid = found['id'] as string; this.db.prepare("UPDATE guests SET status=?, menu=?, source='rsvp', email=CASE WHEN ? != '' THEN ? ELSE email END, updated_at=? WHERE id=?").run(status, menu, email, email, t, gid); }
        else { gid = newId('inv'); this.db.prepare("INSERT INTO guests (id,wedding_id,first,last,name_key,status,menu,group_id,source,email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,NULL,'rsvp',?,?,?)").run(gid, p.wid, x.first, x.last, key, status, menu, email, t, t); }
        this.db.prepare('INSERT INTO rsvp_events (wedding_id,guest_id,status,menu,at) VALUES (?,?,?,?,?)').run(p.wid, gid, status, menu, t);
      }
      if (optIn) this.grantConsent(email, 'rsvp', p.wid);
      this.track('rsvp_submitted', { attending: people.some(x => x.attending) });
      return { count: people.length };
    });
  }

  /** Alta en la base de novedades de Weda (consentimiento expreso). Si la persona ya tiene un consentimiento vigente, no se duplica. */
  private grantConsent(email: string, source: 'gift' | 'rsvp', weddingId: string) {
    const live = this.db.prepare('SELECT 1 FROM marketing_consents WHERE email = ? AND revoked_at IS NULL').get(email);
    if (live) return;
    this.db.prepare('INSERT INTO marketing_consents (id,email,source,wedding_id,text_version,granted_at,revoked_at) VALUES (?,?,?,?,?,?,NULL)').run(newId('cns'), email, source, weddingId, MARKETING_CONSENT_VERSION, now());
  }

  /* ------------------------------------------------------------------ aportes */

  /** El invitado informa que regala/aportó. Los montos salen del snapshot publicado; la clave de idempotencia evita duplicados al reintentar. */
  submitContribution(slug: string, raw: unknown) {
    const b = (raw ?? {}) as Row;
    const p = this.livePublication(slug);
    if (b['how'] === 'tarjeta') throw new ApiError(501, 'card_not_available');
    if (b['how'] !== 'alias') throw invalid('invalid_how');
    const key = reqStr(b['idempotencyKey'], 8, 100, 'invalid_idempotency_key');
    const manage = reqStr(b['manageToken'], 20, 200, 'invalid_manage_token');
    const giver = reqStr(b['giverName'], 1, 120, 'invalid_giver_name');
    const giverEmail = optEmail(b['giverEmail']);
    if (!giverEmail) throw invalid('invalid_giver_email'); // obligatorio: es para la constancia del regalo y para que la pareja pueda escribirle
    // El comprobante viaja en el mismo envío (decisión de la dueña, 2026-10-28): no existe un regalo sin comprobante.
    const receipt = decodeReceipt(b['receipt']);
    const message = typeof b['message'] === 'string' ? b['message'].trim().slice(0, 500) : '';
    const ids = Array.isArray(b['giftIds']) ? [...new Set((b['giftIds'] as unknown[]).filter((x): x is string => typeof x === 'string'))] : [];
    if (ids.length < 1 || ids.length > 30) throw invalid('invalid_gifts');
    if (!p.snapshot.blocks.gifts) throw conflict('gifts_disabled');
    const gifts = ids.map(id => p.snapshot.gifts.find(g => g.id === id));
    if (gifts.some(g => !g)) throw invalid('unknown_gift');
    let written = '';
    let res: { id: string; status: string; replay: boolean };
    try { res = tx(this.db, () => {
      const hash = sha256(manage);
      const prev = this.db.prepare('SELECT id, status, manage_token_hash FROM contributions WHERE wedding_id = ? AND idempotency_key = ?').get(p.wid, key) as Row | undefined;
      if (prev) {
        if (prev['manage_token_hash'] !== hash) throw conflict('idempotency_key_reused');
        return { id: prev['id'] as string, status: prev['status'] as string, replay: true };
      }
      if (!receipt) throw invalid('receipt_required');
      const taken = this.db.prepare(`SELECT DISTINCT i.gift_id AS id FROM contribution_items i JOIN contributions c ON c.id = i.contribution_id WHERE c.wedding_id = ? AND c.status != 'rejected' AND i.gift_id IN (${ids.map(() => '?').join(',')})`).all(p.wid, ...ids) as Row[];
      if (taken.length) throw new ApiError(409, 'gift_taken', taken.map(r => r['id']).join(','));
      const id = newId('apo');
      const t = now();
      const total = gifts.reduce((n, g) => n + Math.round(g!.amount), 0);
      this.db.prepare("INSERT INTO contributions (id,wedding_id,giver_name,giver_email,message,how,status,total,idempotency_key,manage_token_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,'pending_review',?,?,?,?,?)").run(id, p.wid, giver, giverEmail, message, 'alias', total, key, hash, t, t);
      if (b['marketingOptIn'] === true) this.grantConsent(giverEmail, 'gift', p.wid);
      for (const g of gifts) this.db.prepare('INSERT INTO contribution_items (contribution_id,gift_id,gift_name,amount) VALUES (?,?,?,?)').run(id, g!.id, g!.name, Math.round(g!.amount));
      this.db.prepare("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'created','guest',NULL,'pending_review','',?)").run(id, t);
      const fileKey = this.storeReceiptFile(receipt.bytes);
      written = fileKey;
      this.db.prepare('INSERT INTO receipts (id,wedding_id,contribution_id,mime,size,storage_key,created_at) VALUES (?,?,?,?,?,?,?)').run(newId('rec'), p.wid, id, receipt.mime, receipt.bytes.length, fileKey, t);
      return { id, status: 'pending_review', replay: false };
    });
    } catch (e) {
      if (written) rmSync(path.join(this.cfg.dataDir, 'receipts', written), { force: true }); // sin registro no queda archivo huérfano
      throw e;
    }
    if (!res.replay) this.track('gift_submitted');
    // Constancia para quien regaló (no bloquea: si el correo falla, el regalo ya quedó registrado).
    if (!res.replay) void this.mailGiftReceipt({ id: res.id, to: giverEmail, giver, couple: p.snapshot.names, gifts: gifts.map(g => ({ name: g!.name, amount: Math.round(g!.amount) })), manage, optedIn: b['marketingOptIn'] === true });
    return res;
  }

  /** Guarda el archivo del comprobante con un nombre al azar (privado) y devuelve ese nombre. */
  private storeReceiptFile(bytes: Buffer): string {
    const dir = path.join(this.cfg.dataDir, 'receipts');
    mkdirSync(dir, { recursive: true });
    const key = newId('rcp');
    writeFileSync(path.join(dir, key), bytes, { mode: 0o600 });
    return key;
  }

  private comprobanteUrl(id: string, token: string) {
    return `${this.cfg.publicUrl}/comprobante?aporte=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  }

  /** Constancia del regalo: qué regaló, el total, que la pareja revisa el comprobante y el enlace para adjuntarlo o cambiarlo. */
  private mailGiftReceipt(o: { id: string; to: string; giver: string; couple: string; gifts: { name: string; amount: number }[]; manage: string; optedIn: boolean }) {
    const total = o.gifts.reduce((n, g) => n + g.amount, 0);
    const first = o.giver.split(/\s+/)[0] ?? o.giver;
    const body = layout({
      title: `¡Gracias por tu regalo, ${first}!`,
      paragraphs: [
        `Le avisamos a ${o.couple} que les hiciste un regalo:`,
        ...o.gifts.map(g => `· ${g.name}: ${formatARS(g.amount)}`),
        `Total: ${formatARS(total)}.`,
        'La transferencia va directo a la cuenta de los novios. Ellos revisan tu comprobante para confirmarlo.',
      ],
      button: { label: 'Adjuntar o cambiar el comprobante', url: this.comprobanteUrl(o.id, o.manage) },
      footer: [
        'Weda no cobra comisión ni pasa por el dinero.',
        ...(o.optedIn ? [`Recibís novedades de Weda porque lo pediste. Para darte de baja: ${unsubscribeUrl(this.cfg, o.to)}`] : []),
      ],
    });
    return sendMail(this.db, this.cfg, 'gift_receipt', { to: o.to, subject: `Tu regalo para ${o.couple}`, ...body }, o.id);
  }

  /** La pareja pide el comprobante a quien regaló. Genera un enlace nuevo para adjuntarlo (el anterior deja de servir) y respeta un día entre pedidos. */
  async remindReceipt(userId: string, id: string): Promise<{ status: 'sent' | 'skipped' | 'failed' }> {
    const { to, link, giver, couple } = tx(this.db, () => {
      const c = this.ownedContribution(userId, id);
      if (c['status'] === 'rejected') throw conflict('contribution_rejected');
      if (this.db.prepare('SELECT 1 FROM receipts WHERE contribution_id = ?').get(id)) throw conflict('receipt_already_attached');
      const to = (c['giver_email'] as string | undefined) ?? '';
      if (!to) throw conflict('no_giver_email');
      const last = this.db.prepare("SELECT at FROM contribution_events WHERE contribution_id = ? AND kind = 'receipt_reminder' ORDER BY id DESC LIMIT 1").get(id) as Row | undefined;
      if (last && Date.now() - Date.parse(last['at'] as string) < REMINDER_GAP_MS) throw conflict('reminder_too_soon');
      const token = newToken();
      this.db.prepare('UPDATE contributions SET manage_token_hash = ?, updated_at = ? WHERE id = ?').run(sha256(token), now(), id);
      this.db.prepare("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'receipt_reminder','owner',?,?,'',?)").run(id, c['status'] as string, c['status'] as string, now());
      const site = this.db.prepare("SELECT snapshot FROM publications WHERE wedding_id = ? ORDER BY version DESC LIMIT 1").get(c['wedding_id'] as string) as Row | undefined;
      let couple = 'los novios';
      try { couple = (JSON.parse((site?.['snapshot'] as string | undefined) ?? '{}') as { names?: string }).names || couple; } catch { /* sin snapshot legible */ }
      return { to, link: this.comprobanteUrl(id, token), giver: c['giver_name'] as string, couple };
    });
    const first = giver.split(/\s+/)[0] ?? giver;
    const body = layout({
      title: `${first}, falta tu comprobante`,
      paragraphs: [`${couple} todavía no recibieron el comprobante de tu regalo. Cuando puedas, adjuntalo desde acá: es una captura o el PDF de la transferencia.`],
      button: { label: 'Adjuntar el comprobante', url: link },
      footer: ['Si ya lo mandaste por otro medio, podés ignorar este correo.'],
    });
    return { status: await sendMail(this.db, this.cfg, 'receipt_reminder', { to, subject: `Falta el comprobante de tu regalo para ${couple}`, ...body }, id) };
  }

  /** Baja de novedades desde el enlace firmado del correo. Marca la baja (no borra: queda la prueba de cuándo se dio y se retiró). */
  unsubscribe(token: string): boolean {
    const email = verifyUnsubscribe(this.cfg.secret, token);
    if (!email) return false;
    this.db.prepare('UPDATE marketing_consents SET revoked_at = ? WHERE email = ? AND revoked_at IS NULL').run(now(), email);
    return true;
  }

  private contributionWithToken(id: string, token: string | undefined): Row {
    const row = this.db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as Row | undefined;
    // Mismo error si no existe o si el token no coincide: no se revela cuáles ids existen.
    const ok = !!row && !!token && sha256(token).length === (row['manage_token_hash'] as string).length && timingSafeEqual(Buffer.from(sha256(token)), Buffer.from(row['manage_token_hash'] as string));
    if (!ok) throw notFound();
    return row!;
  }

  guestContributionStatus(id: string, token: string | undefined) {
    const c = this.contributionWithToken(id, token);
    const rec = this.db.prepare('SELECT 1 FROM receipts WHERE contribution_id = ?').get(id);
    return { id, status: c['status'] as string, total: c['total'] as number, hasReceipt: !!rec };
  }

  /** El invitado adjunta su comprobante (privado). Valida tipo real por contenido, tamaño y que el archivo y el registro queden consistentes. */
  attachReceipt(id: string, token: string | undefined, bytes: Buffer) {
    const c = this.contributionWithToken(id, token);
    if (c['status'] === 'rejected') throw conflict('contribution_rejected');
    if (bytes.length === 0) throw invalid('empty_file');
    if (bytes.length > MAX_RECEIPT_BYTES) throw new ApiError(413, 'file_too_large');
    const mime = sniffMime(bytes);
    if (!mime) throw new ApiError(415, 'unsupported_file_type');
    const dir = path.join(this.cfg.dataDir, 'receipts');
    mkdirSync(dir, { recursive: true });
    const key = newId('rcp');
    const file = path.join(dir, key);
    writeFileSync(file, bytes, { mode: 0o600 });
    try {
      const old = tx(this.db, () => {
        const prev = this.db.prepare('SELECT id, storage_key FROM receipts WHERE contribution_id = ?').get(id) as Row | undefined;
        if (prev) this.db.prepare('DELETE FROM receipts WHERE id = ?').run(prev['id'] as string);
        this.db.prepare('INSERT INTO receipts (id,wedding_id,contribution_id,mime,size,storage_key,created_at) VALUES (?,?,?,?,?,?,?)').run(newId('rec'), c['wedding_id'] as string, id, mime, bytes.length, key, now());
        this.db.prepare("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'receipt_attached','guest',?,?,'',?)").run(id, c['status'] as string, c['status'] as string, now());
        return prev?.['storage_key'] as string | undefined;
      });
      if (old) rmSync(path.join(dir, old), { force: true });
    } catch (e) {
      rmSync(file, { force: true }); // sin registro no queda archivo huérfano
      throw e;
    }
    return { mime, size: bytes.length };
  }

  /** Aportes del casamiento del usuario (nunca de otro). */
  listContributions(userId: string) {
    const w = this.weddingOf(userId);
    if (!w) return [];
    const rows = this.db.prepare('SELECT * FROM contributions WHERE wedding_id = ? ORDER BY created_at DESC, id').all(w['id'] as string) as Row[];
    return rows.map(c => ({
      id: c['id'] as string, giverName: c['giver_name'] as string, giverEmail: (c['giver_email'] as string | undefined) ?? '', message: c['message'] as string, how: c['how'] as string, status: c['status'] as string, total: c['total'] as number, createdAt: c['created_at'] as string,
      items: (this.db.prepare('SELECT gift_id, gift_name, amount FROM contribution_items WHERE contribution_id = ?').all(c['id'] as string) as Row[]).map(i => ({ giftId: i['gift_id'] as string, giftName: i['gift_name'] as string, amount: i['amount'] as number })),
      hasReceipt: !!this.db.prepare('SELECT 1 FROM receipts WHERE contribution_id = ?').get(c['id'] as string),
      history: (this.db.prepare('SELECT kind, actor, from_status, to_status, note, at FROM contribution_events WHERE contribution_id = ? ORDER BY id').all(c['id'] as string) as Row[]).map(e => ({ kind: e['kind'] as string, actor: e['actor'] as string, from: (e['from_status'] as string | null) ?? null, to: (e['to_status'] as string | null) ?? null, note: e['note'] as string, at: e['at'] as string })),
    }));
  }

  private ownedContribution(userId: string, id: string): Row {
    const row = this.db.prepare('SELECT c.* FROM contributions c JOIN weddings w ON w.id = c.wedding_id WHERE c.id = ? AND w.owner_id = ?').get(id, userId) as Row | undefined;
    if (!row) throw notFound(); // existe pero es de otra pareja = mismo 404
    return row;
  }

  setContributionStatus(userId: string, id: string, to: unknown, note: unknown) {
    if (typeof to !== 'string' || !['pending_review', 'confirmed', 'rejected'].includes(to)) throw invalid('invalid_status');
    return tx(this.db, () => {
      const c = this.ownedContribution(userId, id);
      const from = c['status'] as string;
      if (!CONTRIBUTION_TRANSITIONS[from]?.includes(to)) throw conflict('invalid_transition');
      if (to === 'confirmed' && !this.db.prepare('SELECT 1 FROM receipts WHERE contribution_id = ?').get(id)) throw conflict('receipt_required');
      const t = now();
      this.db.prepare('UPDATE contributions SET status=?, updated_at=? WHERE id=?').run(to, t, id);
      this.db.prepare("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'status_changed','owner',?,?,?,?)").run(id, from, to, typeof note === 'string' ? note.slice(0, 300) : '', t);
      return { id, status: to };
    });
  }

  /** Comprobante: solo el dueño del casamiento. */
  readReceipt(userId: string, id: string): { bytes: Buffer; mime: string } {
    this.ownedContribution(userId, id);
    const r = this.db.prepare('SELECT mime, storage_key FROM receipts WHERE contribution_id = ?').get(id) as Row | undefined;
    if (!r) throw notFound();
    return { bytes: readFileSync(path.join(this.cfg.dataDir, 'receipts', r['storage_key'] as string)), mime: r['mime'] as string };
  }

  /* ------------------------------------------------------------------ planes y órdenes */

  /** Registra la intención de compra. El monto sale del servidor. No cobra: sin proveedor de pagos configurado la orden queda «pending». */
  createOrder(userId: string, planIdRaw: unknown) {
    if (!isPlanId(planIdRaw)) throw invalid('invalid_plan');
    const w = this.ensureWedding(userId);
    const plan = planById(planIdRaw)!;
    const id = newId('ord');
    const t = now();
    this.db.prepare("INSERT INTO orders (id,wedding_id,plan_id,amount,status,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?)").run(id, w['id'] as string, plan.id, plan.price, t, t);
    return { id, planId: plan.id, amount: plan.price, status: 'pending', checkoutUrl: null as string | null };
  }

  listOrders(userId: string) {
    const w = this.weddingOf(userId);
    if (!w) return [];
    return (this.db.prepare('SELECT id, plan_id, amount, status, created_at, paid_at FROM orders WHERE wedding_id = ? ORDER BY created_at DESC, id').all(w['id'] as string) as Row[]).map(o => ({ id: o['id'] as string, planId: o['plan_id'] as string, amount: o['amount'] as number, status: o['status'] as string, createdAt: o['created_at'] as string, paidAt: (o['paid_at'] as string | null) ?? null }));
  }

  /** Plan más alto que esta pareja ya pagó (con confirmación del proveedor), o null. */
  private paidPlan(wid: string): PlanId | null {
    const paid = this.db.prepare("SELECT plan_id FROM orders WHERE wedding_id = ? AND status = 'paid'").all(wid) as Row[];
    return paid.map(r => planById(r['plan_id'] as PlanId)).filter(Boolean).sort((a, b) => b!.price - a!.price)[0]?.id ?? null;
  }

  /** Para el panel: hay cobro configurado y qué plan está pagado. Sin proveedor, `payments: false` (publicar no cobra). */
  paymentInfo(userId: string) {
    const w = this.weddingOf(userId);
    return { payments: this.cfg.payments.provider !== 'none', paidPlan: w ? this.paidPlan(w['id'] as string) : null };
  }

  /**
   * Empieza un pago. El monto lo calcula el servidor: el precio del plan, o la diferencia si ya hay uno pagado (mejora). Si ya hay una orden
   * pendiente para el mismo plan y monto (doble clic, recarga, volver atrás), se reusa: no se crean dos cobros para lo mismo.
   */
  startCheckout(userId: string, planIdRaw: unknown) {
    const provider = providerFor(this.cfg);
    if (!provider) throw new ApiError(501, 'payments_not_configured');
    if (!isPlanId(planIdRaw)) throw invalid('invalid_plan');
    return tx(this.db, () => {
      const w = this.ensureWedding(userId);
      const wid = w['id'] as string;
      const plan = planById(planIdRaw)!;
      const current = this.paidPlan(wid);
      const currentPrice = current ? planById(current)!.price : 0;
      if (currentPrice >= plan.price) throw conflict('already_paid');
      const amount = plan.price - currentPrice;
      const open = this.db.prepare("SELECT id FROM orders WHERE wedding_id = ? AND plan_id = ? AND amount = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(wid, plan.id, amount) as Row | undefined;
      const id = (open?.['id'] as string | undefined) ?? newId('ord');
      if (!open) {
        const t = now();
        this.db.prepare("INSERT INTO orders (id,wedding_id,plan_id,amount,status,provider,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?,?)").run(id, wid, plan.id, amount, provider.name, t, t);
      }
      return { id, planId: plan.id, amount, status: 'pending', checkoutUrl: provider.checkoutUrl({ id, amount }, this.cfg) };
    });
  }

  /** Estado de una orden propia (para retomar un pago interrumpido o al volver del proveedor). */
  orderStatus(userId: string, id: string) {
    const o = this.db.prepare('SELECT o.id, o.plan_id, o.amount, o.status, o.paid_at FROM orders o JOIN weddings w ON w.id = o.wedding_id WHERE o.id = ? AND w.owner_id = ?').get(id, userId) as Row | undefined;
    if (!o) throw notFound();
    return { id: o['id'] as string, planId: o['plan_id'] as string, amount: o['amount'] as number, status: o['status'] as string, paidAt: (o['paid_at'] as string | null) ?? null };
  }

  /**
   * Notificación del proveedor (webhook). Única vía para marcar una orden como pagada. Se verifica la firma; cada evento se procesa una sola vez
   * (el proveedor puede repetirlo) y una orden ya cerrada no cambia por un evento posterior contradictorio.
   */
  handlePaymentNotification(providerName: string, rawBody: string, headers: Headers) {
    const provider = providerFor(this.cfg);
    if (!provider || provider.name !== providerName) throw notFound();
    let n;
    try { n = provider.verify(rawBody, headers, this.cfg); } catch { throw new ApiError(401, 'invalid_signature'); }
    return tx(this.db, () => {
      const seen = this.db.prepare('SELECT 1 FROM payment_events WHERE provider = ? AND event_id = ?').get(provider.name, n.eventId);
      if (seen) return { duplicate: true };
      this.db.prepare('INSERT INTO payment_events (provider,event_id,order_id,outcome,received_at) VALUES (?,?,?,?,?)').run(provider.name, n.eventId, n.orderId, n.outcome, now());
      const o = this.db.prepare('SELECT status FROM orders WHERE id = ?').get(n.orderId) as Row | undefined;
      if (!o) throw notFound();
      if (o['status'] !== 'pending') return { duplicate: false, ignored: true, status: o['status'] as string };
      const t = now();
      this.db.prepare('UPDATE orders SET status=?, provider=?, provider_ref=?, updated_at=?, paid_at=? WHERE id=?').run(n.outcome, provider.name, n.providerRef, t, n.outcome === 'paid' ? t : null, n.orderId);
      // Única fuente de «pago confirmado»: la notificación verificada del proveedor.
      if (n.outcome === 'paid') { const po = this.db.prepare('SELECT plan_id FROM orders WHERE id = ?').get(n.orderId) as Row; this.track('payment_confirmed', { plan_id: po['plan_id'] as string }); }
      return { duplicate: false, status: n.outcome };
    });
  }

  /** SOLO adaptador de prueba: lo que hace el «proveedor» cuando la persona toca Aprobar/Rechazar/Cancelar en /pago-de-prueba. Pasa por la misma verificación. */
  completeTestPayment(userId: string, orderId: string, outcome: unknown) {
    if (this.cfg.payments.provider !== 'test') throw notFound();
    if (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'cancelled') throw invalid('invalid_outcome');
    this.orderStatus(userId, orderId); // solo la pareja dueña
    const { body, signature } = signedTestNotification(this.cfg, { eventId: newId('evt'), orderId, outcome: outcome as Outcome });
    return this.handlePaymentNotification('test', body, new Headers({ 'x-weda-signature': signature }));
  }

  /**
   * SOLO para el proveedor de pagos (webhook verificado) o para pruebas: no está expuesta por HTTP. Idempotente por (provider, providerRef).
   */
  settleOrder(orderId: string, outcome: 'paid' | 'failed' | 'cancelled', provider: string, providerRef: string) {
    return tx(this.db, () => {
      const o = this.db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId) as Row | undefined;
      if (!o) throw notFound();
      if (o['status'] === outcome) return { changed: false };
      if (o['status'] !== 'pending') throw conflict('order_already_settled');
      const t = now();
      this.db.prepare('UPDATE orders SET status=?, provider=?, provider_ref=?, updated_at=?, paid_at=? WHERE id=?').run(outcome, provider, providerRef, t, outcome === 'paid' ? t : null, orderId);
      return { changed: true };
    });
  }

  requireSession(s: Session | null): Session {
    if (!s) throw unauthorized();
    return s;
  }
}

/* ------------------------------------------------------------------ validación de entradas */

function reqStr(v: unknown, min: number, max: number, code: string): string {
  if (typeof v !== 'string') throw invalid(code);
  const s = v.trim();
  if (s.length < min || s.length > max) throw invalid(code);
  return s;
}

function parseGuestInputs(v: unknown): GuestInput[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 5000) throw invalid('invalid_guests');
  return v.map(x => {
    const o = (x ?? {}) as Row;
    const status = o['status'];
    if (typeof o['id'] !== 'string' || o['id'].length < 1 || o['id'].length > 80) throw invalid('invalid_guest_id');
    if (status !== 'confirmed' && status !== 'declined' && status !== 'pending') throw invalid('invalid_guest_status');
    return { id: o['id'], first: reqStr(o['first'], 1, 80, 'invalid_guest_name'), last: typeof o['last'] === 'string' ? o['last'].trim().slice(0, 80) : '', status, menu: typeof o['menu'] === 'string' ? o['menu'].slice(0, 60) : '', groupId: typeof o['groupId'] === 'string' ? o['groupId'].slice(0, 80) : null, source: o['source'] === 'rsvp' ? 'rsvp' : 'manual' } as GuestInput;
  });
}

/** Vencimiento de una publicación. Las anteriores a la migración 5 no lo tienen guardado: se calcula desde su primera publicación. */
function expiresOf(p: Row): string {
  return (p['expires_at'] as string | null) ?? addTerm(p['published_at'] as string);
}

/** Comprobante que viaja dentro del envío del regalo: `{ data: base64 }`. Valida tamaño y tipo real (por contenido). Sin comprobante → null. */
function decodeReceipt(v: unknown): { bytes: Buffer; mime: string } | null {
  const data = v && typeof v === 'object' ? (v as Row)['data'] : undefined;
  if (typeof data !== 'string' || data === '') return null;
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length === 0) throw invalid('empty_file');
  if (bytes.length > MAX_RECEIPT_BYTES) throw new ApiError(413, 'file_too_large');
  const mime = sniffMime(bytes);
  if (!mime) throw new ApiError(415, 'unsupported_file_type');
  return { bytes, mime };
}

/** Correo opcional: vacío o inválido → ''. Se guarda en minúsculas. */
function optEmail(v: unknown): string {
  const e = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return e && e.length <= 200 && isEmail(e) ? e : '';
}

function parseRsvp(v: unknown, withMenus: boolean) {
  if (!Array.isArray(v) || v.length < 1 || v.length > 10) throw invalid('invalid_people');
  return v.map(x => {
    const o = (x ?? {}) as Row;
    return { first: reqStr(o['first'], 1, 80, 'invalid_name'), last: typeof o['last'] === 'string' ? o['last'].trim().slice(0, 80) : '', attending: o['attending'] === true, menu: withMenus && typeof o['menu'] === 'string' ? o['menu'].slice(0, 60) : '' };
  });
}

/** Tipo real por los primeros bytes: el Content-Type que declara el cliente no se usa. */
export function sniffMime(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

export { forbidden };
