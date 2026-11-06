// Dominio de Weda en el servidor. TODA la autorización vive acá: cada función que toca datos privados recibe el `userId`
// ya autenticado y filtra por él; ninguna confía en un identificador que venga del cliente. No depende de HTTP (ver api.ts).
import { timingSafeEqual } from 'node:crypto';
import { normalizeName, publicSite, sanitizeDraft, type DraftState } from './draft';
import type { Db } from './db';
import { ApiError, conflict, forbidden, invalid, notFound, unauthorized } from './errors';
import { newId, newToken, RateLimiter, sha256 } from './security';
import type { Accounts, Authenticated } from './accounts';
import type { ServerConfig } from './config';
import { cleanCbu, emptyState, FREE_AMOUNT_LABEL, isEmail, maskAlias, maskCbu, MAX_AMOUNT, MIN_AMOUNT, slugify, strongPassword, validateAlias, validateCbu } from '@/lib/weda/logic';
import { planById, isPlanId, normalizePlanId, operates, planForOperation, planRank, TRIAL_DAYS, type Access, type Operation } from '@/lib/weda/plans';
import type { Guest, PlanId } from '@/lib/weda/types';
import type { SiteData } from '@/lib/weda/site-model';
import { MARKETING_CONSENT_VERSION } from '@/lib/weda/consent';
import { formatARS } from '@/lib/demo-wedding';
import { layout, sendMail, unsubscribeUrl, verifyUnsubscribe } from './mail';
import { providerFor, signedTestNotification, type Outcome } from './payments';
import { externalizeImages } from './media';
import type { Files } from './storage';
import { ALLOWED_PROPS, CLIENT_EVENTS, type EventProps, type ServerEvent } from '@/lib/analytics-events';

/** Entre un recordatorio de comprobante y el siguiente, para el mismo aporte. */
const REMINDER_GAP_MS = 24 * 60 * 60 * 1000;

/** Cuánto vale el enlace para cambiar la clave. */
const RESET_TTL_MS = 60 * 60 * 1000;
const MAX_DRAFT_BYTES = 6 * 1024 * 1024;
/** Cambios del destino de cobro: como mucho PAYOUT_MAX_CHANGES por casamiento en PAYOUT_WINDOW_MS (contados en la base). */
const PAYOUT_MAX_CHANGES = 3;
const PAYOUT_WINDOW_MS = 24 * 60 * 60 * 1000;
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
export type Payout = { version: number; alias: string; bank: string; cbu: string; changedAt: string | null };
export type GuestInput = { id: string; first: string; last: string; status: Guest['status']; menu: string; groupId: string | null; source: Guest['source'] };

export class Service {
  private loginLimiter = new RateLimiter(8, 15 * 60_000);
  /** Pedidos de recuperación: por correo y por IP, para no usar el formulario para mandar correos en masa. */
  private resetLimiter = new RateLimiter(5, 60 * 60_000);
  private resetIpLimiter = new RateLimiter(20, 60 * 60_000);
  /** Intentos con la clave actual al cambiarla, por cuenta. */
  private changeLimiter = new RateLimiter(8, 15 * 60_000);

  /** Intentos de cambiar el destino de cobro con la clave equivocada, por usuario. */
  private payoutLimiter = new RateLimiter(8, 15 * 60_000);
  constructor(public db: Db, public cfg: ServerConfig, public files: Files, public accounts: Accounts) {}

  /* ------------------------------------------------------------------ cuentas y sesiones */

  async register(emailRaw: unknown, password: unknown): Promise<{ user: Session; token: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!isEmail(email) || email.length > 200) throw invalid('invalid_email');
    if (typeof password !== 'string' || !strongPassword(password) || password.length > 200) throw invalid('weak_password');
    const r = await this.accounts.create(email, password);
    await this.track('signup_completed');
    return { user: { userId: r.userId, email: r.email }, token: r.token };
  }

  async login(emailRaw: unknown, password: unknown, ipKey = ''): Promise<{ user: Session; token: string }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!email || typeof password !== 'string') throw invalid('invalid_credentials');
    if (!this.loginLimiter.take(`${email}|${ipKey}`)) throw new ApiError(429, 'too_many_attempts');
    const r = await this.accounts.signIn(email, password);
    if (!r) throw new ApiError(401, 'invalid_credentials');
    this.loginLimiter.reset(`${email}|${ipKey}`);
    return { user: { userId: r.userId, email: r.email }, token: r.token };
  }

  /** La sesión de la cookie. `token` puede ser uno nuevo (se renovó): el que llama reescribe la cookie si `renewed`. */
  async authenticate(token: string | undefined): Promise<Authenticated | null> {
    return token ? this.accounts.session(token) : null;
  }

  async sessionFromToken(token: string | undefined): Promise<Session | null> {
    const a = await this.authenticate(token);
    return a ? { userId: a.userId, email: a.email } : null;
  }

  /* ------------------------------------------------------------------ embudo */

  /** Registra un evento del embudo. Nunca falla hacia afuera: medir no puede romper un registro, un pago ni una publicación. */
  private async track(name: ServerEvent | string, props: EventProps = {}, source: 'server' | 'client' = 'server') {
    try {
      const clean = Object.fromEntries(Object.entries(props).filter(([k, v]) => (ALLOWED_PROPS as readonly string[]).includes(k) && ['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 40));
      (await this.db.run('INSERT INTO funnel_events (name,source,props,at) VALUES (?,?,?,?)', name, source, JSON.stringify(clean), now()));
    } catch (e) { console.error('No se pudo registrar el evento:', e); }
  }

  /** Eventos que manda el navegador: solo los de la lista del cliente (nunca «pago confirmado» ni otro que pruebe algo). */
  async recordClientEvent(nameRaw: unknown, propsRaw: unknown) {
    if (typeof nameRaw !== 'string' || !(CLIENT_EVENTS as readonly string[]).includes(nameRaw)) throw invalid('unknown_event');
    (await this.track(nameRaw, (propsRaw && typeof propsRaw === 'object' ? propsRaw : {}) as EventProps, 'client'));
    return { ok: true };
  }

  /* ------------------------------------------------------------------ recuperar la clave */

  /** Pide el enlace para cambiar la clave. Responde lo mismo exista o no la cuenta (no revela qué correos están registrados). */
  async requestPasswordReset(emailRaw: unknown, ipKey = ''): Promise<{ ok: true }> {
    const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
    if (!isEmail(email) || email.length > 200) throw invalid('invalid_email');
    if (!this.resetLimiter.take(email) || !this.resetIpLimiter.take(ipKey)) throw new ApiError(429, 'too_many_requests');
    const userId = await this.accounts.idByEmail(email);
    if (!userId) return { ok: true };
    const user = { id: userId };
    const token = newToken();
    const created = new Date();
    const expires = new Date(created.getTime() + RESET_TTL_MS);
    await this.db.tx('weda', async () => {
      // Un enlace nuevo anula los anteriores sin usar.
      (await this.db.run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', created.toISOString(), user['id'] as string));
      (await this.db.run('INSERT INTO password_resets (id,user_id,token_hash,created_at,expires_at,used_at) VALUES (?,?,?,?,?,NULL)', newId('rst'), user['id'] as string, sha256(token), created.toISOString(), expires.toISOString()));
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
    const row = (await this.db.get('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?', sha256(tokenRaw))) as Row | undefined;
    if (!row || row['used_at'] || Date.parse(row['expires_at'] as string) <= Date.now()) throw invalid('invalid_or_expired_token');
    await this.db.tx(row['user_id'] as string, async () => {
      // Se vuelve a verificar dentro de la transacción: dos envíos simultáneos con el mismo token no pasan los dos.
      const still = (await this.db.get('SELECT used_at FROM password_resets WHERE id = ?', row['id'] as string)) as Row | undefined;
      if (!still || still['used_at']) throw invalid('invalid_or_expired_token');
      await this.db.run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', now(), row['user_id'] as string);
      // Cambia la clave y cierra todas las sesiones de la cuenta.
      await this.accounts.setPassword(row['user_id'] as string, password);
    });
    return { ok: true };
  }

  /**
   * Cambia la clave desde el perfil (con sesión). Exige la clave actual: una sesión robada sola no alcanza para quedarse con la cuenta.
   * Cierra las demás sesiones (sigue abierta la de quien la cambió) y anula los enlaces de recuperación pendientes.
   */
  async changePassword(token: string | undefined, current: unknown, next: unknown): Promise<{ ok: true; token: string | null }> {
    const s = this.requireSession(await this.sessionFromToken(token));
    if (typeof current !== 'string' || !current) throw invalid('wrong_password');
    if (typeof next !== 'string' || !strongPassword(next) || next.length > 200) throw invalid('weak_password');
    if (!this.changeLimiter.take(s.userId)) throw new ApiError(429, 'too_many_attempts');
    if (!(await this.accounts.checkPassword(s.userId, s.email, current))) throw invalid('wrong_password');
    this.changeLimiter.reset(s.userId);
    const kept = await this.db.tx(s.userId, async () => {
      // Cierra las demás sesiones (sigue abierta la de quien la cambió) y anula los enlaces de recuperación pendientes.
      const t = await this.accounts.setPassword(s.userId, next, { token: token!, email: s.email });
      await this.db.run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', now(), s.userId);
      return t;
    });
    return { ok: true, token: kept };
  }

  /** Cuántas sesiones vigentes tiene la cuenta además de esta. Sin ids ni tokens: solo el número. */
  async otherSessions(token: string | undefined): Promise<{ others: number }> {
    const s = this.requireSession(await this.sessionFromToken(token));
    return { others: await this.accounts.countOthers(s.userId, token!) };
  }

  /** Cierra las demás sesiones de la cuenta (otros dispositivos o navegadores); esta sigue abierta. */
  async closeOtherSessions(token: string | undefined): Promise<{ closed: number }> {
    const s = this.requireSession(await this.sessionFromToken(token));
    return { closed: await this.accounts.closeOthers(s.userId, token!) };
  }

  async logout(token: string | undefined) {
    if (token) await this.accounts.signOut(token);
  }

  /* ------------------------------------------------------------------ casamiento (privado) */

  private async weddingOf(userId: string): Promise<Row | undefined> {
    return (await this.db.get('SELECT * FROM weddings WHERE owner_id = ?', userId)) as Row | undefined;
  }

  private async ensureWedding(userId: string): Promise<Row> {
    const existing = (await this.weddingOf(userId));
    if (existing) return existing;
    const t = now();
    const draft = JSON.stringify(sanitizeDraft(emptyState()));
    (await this.db.run('INSERT INTO weddings (id,owner_id,draft,revision,created_at,updated_at) VALUES (?,?,?,?,?,?)', newId('wed'), userId, draft, 1, t, t));
    return (await this.weddingOf(userId))!;
  }

  private async guestsOf(weddingId: string): Promise<Guest[]> {
    const rows = (await this.db.all('SELECT * FROM guests WHERE wedding_id = ? ORDER BY created_at, id', weddingId)) as Row[];
    return rows.map(r => ({ id: r['id'] as string, first: r['first'] as string, last: r['last'] as string, status: r['status'] as Guest['status'], menu: r['menu'] as string, groupId: (r['group_id'] as string | null) ?? null, source: r['source'] as Guest['source'] }));
  }

  /** Lo que el panel necesita para trabajar: borrador, invitados, estado de publicación y órdenes. Solo del dueño. */
  async getWedding(userId: string) {
    const w = (await this.ensureWedding(userId));
    const wid = w['id'] as string;
    const pub = (await this.db.get('SELECT status, plan_id, version, published_at, updated_at, expires_at FROM publications WHERE wedding_id = ?', wid)) as Row | undefined;
    return {
      id: wid,
      revision: w['revision'] as number,
      slug: (w['slug'] as string | null) ?? null,
      draft: (await this.withPayout(JSON.parse(w['draft'] as string) as DraftState, wid)),
      guests: (await this.guestsOf(wid)),
      publication: pub ? { status: pub['status'] as string, planId: pub['plan_id'] as string, version: pub['version'] as number, publishedAt: pub['published_at'] as string, pendingChanges: (await this.pendingChanges(w)) } : null,
      payout: (await this.activePayout(wid)),
      access: (await this.access(wid)),
    };
  }

  /**
   * ¿Publicar ahora cambiaría la página pública? Arma el snapshot como lo haría `publish` y lo compara con el publicado.
   * Solo cuenta lo que ve un invitado: invitados, datos de cobro sin mostrar o secciones que el plan no incluye no generan aviso. null sin publicación.
   */
  private async pendingChanges(w: Row): Promise<boolean | null> {
    const wid = w['id'] as string;
    const slug = w['slug'] as string | null;
    const pub = (await this.db.get('SELECT plan_id, snapshot FROM publications WHERE wedding_id = ?', wid)) as Row | undefined;
    if (!pub || !slug) return null;
    // Con el destino de cobro vigente, como lo publicaría `publish`: cambiar el alias (con clave) enciende el aviso; un alias que viaje en el borrador no.
    const draft = (await this.withPayout(JSON.parse(w['draft'] as string) as DraftState, wid));
    let planId = pub['plan_id'] as PlanId;
    try { planId = (await this.entitledPlan(wid, draft.planId)); } catch { /* sin plan o sin pago: publicar fallaría; se compara con el plan publicado */ }
    return JSON.stringify(publicSite(draft, planId, slug)) !== (pub['snapshot'] as string);
  }

  /**
   * Guarda el borrador. `baseRevision` es la revisión que el cliente vio: si otra pestaña/dispositivo guardó antes, responde 409 y no pisa nada.
   * Los invitados se actualizan por operaciones (no por lista completa) para no borrar respuestas que llegaron desde el sitio público mientras tanto.
   */
  async saveWedding(userId: string, input: { baseRevision: unknown; draft: unknown; guests?: { upsert?: unknown; remove?: unknown } }) {
    if (typeof input.baseRevision !== 'number' || !Number.isInteger(input.baseRevision)) throw invalid('invalid_revision');
    const serialized = JSON.stringify(input.draft ?? null);
    if (serialized.length > MAX_DRAFT_BYTES) throw new ApiError(413, 'draft_too_large');
    // Fotos embebidas → archivos (media.ts, storage.ts). Va antes de la transacción: subir archivos no debe retener el candado de la base.
    const { value: draft, uploads } = externalizeImages(sanitizeDraft(input.draft));
    for (const u of uploads) await this.files.putMedia(u.name, u.bytes, u.mime);
    const upserts = parseGuestInputs(input.guests?.upsert);
    const removes = Array.isArray(input.guests?.remove) ? (input.guests!.remove as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= 80).slice(0, 5000) : [];
    return this.db.tx('weda', async () => {
      const w = (await this.ensureWedding(userId));
      const wid = w['id'] as string;
      if (w['revision'] !== input.baseRevision) throw new ApiError(409, 'revision_conflict', String(w['revision']));
      (await this.assertNotPaused(wid));
      // BR-62: el contenido se guarda siempre; las operaciones de gestión (invitados, mesas) solo con el plan publicado y vigente. Todo o nada.
      if (upserts.length > 0 || removes.length > 0) (await this.assertOperates(wid, 'guests'));
      if (JSON.stringify(draft.groups) !== JSON.stringify(sanitizeDraft(JSON.parse(w['draft'] as string)).groups)) (await this.assertOperates(wid, 'groups'));
      const t = now();
      const next = (w['revision'] as number) + 1;
      // El destino de cobro que mande el cliente se descarta: solo cambia por changePayout (con clave).
      (await this.db.run('UPDATE weddings SET draft = ?, revision = ?, updated_at = ? WHERE id = ?', JSON.stringify((await this.withPayout(draft, wid))), next, t, wid));
      // BR-63: el trial empieza al crear la celebración (onboarding con los dos nombres), una sola vez. Ni el login, ni otro dispositivo, ni editar lo reinician.
      if (draft.onboarded && draft.couple.first.trim() && draft.couple.second.trim()) (await this.db.run('UPDATE weddings SET trial_started_at = ? WHERE id = ? AND trial_started_at IS NULL', t, wid));
      for (const g of upserts) {
        const owner = (await this.db.get('SELECT wedding_id FROM guests WHERE id = ?', g.id)) as Row | undefined;
        if (owner && owner['wedding_id'] !== wid) throw conflict('guest_id_in_use'); // nunca se toca un invitado de otro casamiento
        if (owner) (await this.db.run('UPDATE guests SET first=?,last=?,name_key=?,status=?,menu=?,group_id=?,source=?,updated_at=? WHERE id=? AND wedding_id=?', g.first, g.last, normalizeName(g.first, g.last), g.status, g.menu, g.groupId, g.source, t, g.id, wid));
        else (await this.db.run('INSERT INTO guests (id,wedding_id,first,last,name_key,status,menu,group_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', g.id, wid, g.first, g.last, normalizeName(g.first, g.last), g.status, g.menu, g.groupId, g.source, t, t));
      }
      for (const id of removes) (await this.db.run('DELETE FROM guests WHERE id = ? AND wedding_id = ?', id, wid));
      return { revision: next, guests: (await this.guestsOf(wid)), pendingChanges: (await this.pendingChanges({ ...w, draft: JSON.stringify(draft) })), access: (await this.access(wid)) };
    });
  }

  /* ------------------------------------------------------------------ destino de cobro (GIFT-14, BR-30) */

  /** Destino vigente: la versión más alta de `payout_methods`. Versión 0 = todavía no se cargó ninguno. */
  private async activePayout(wid: string): Promise<Payout> {
    const r = (await this.db.get('SELECT version, alias, bank, cbu, created_at FROM payout_methods WHERE wedding_id = ? ORDER BY version DESC LIMIT 1', wid)) as Row | undefined;
    return r
      ? { version: r['version'] as number, alias: r['alias'] as string, bank: r['bank'] as string, cbu: r['cbu'] as string, changedAt: r['created_at'] as string }
      : { version: 0, alias: '', bank: '', cbu: '', changedAt: null };
  }

  /** El borrador siempre lleva el destino vigente: así lo leen el panel, la publicación y el snapshot, y ningún guardado lo reescribe. */
  private async withPayout(draft: DraftState, wid: string): Promise<DraftState> {
    const p = (await this.activePayout(wid));
    return { ...draft, gifts: { ...draft.gifts, alias: p.alias, bank: p.bank, cbu: p.cbu } };
  }

  /**
   * Cambia adónde transfieren los invitados. Solo el dueño, con su clave en la misma operación, sobre la versión que vio (`baseVersion`) y con un
   * límite de cambios por día. Nunca edita una versión: agrega la siguiente. Avisa por correo al dueño (con los datos enmascarados).
   * Los invitados lo ven recién al publicar los cambios (la página pública es una copia).
   */
  async changePayout(s: Session, input: Row): Promise<{ payout: Payout; pendingChanges: boolean | null }> {
    const next = parsePayout(input);
    const password = typeof input['currentPassword'] === 'string' ? input['currentPassword'] : '';
    if (!password) throw invalid('wrong_password');
    const baseVersion = input['baseVersion'];
    if (typeof baseVersion !== 'number' || !Number.isInteger(baseVersion)) throw invalid('invalid_version');
    if (!this.payoutLimiter.take(s.userId)) throw new ApiError(429, 'too_many_attempts');
    if (!(await this.accounts.checkPassword(s.userId, s.email, password))) throw invalid('wrong_password');
    const prev = await this.db.tx('weda', async () => {
      const wid = (await this.ensureWedding(s.userId))['id'] as string;
      (await this.assertNotPaused(wid));
      const cur = (await this.activePayout(wid));
      if (cur.version !== baseVersion) throw conflict('payout_changed', String(cur.version));
      if (cur.alias === next.alias && cur.bank === next.bank && cur.cbu === next.cbu) throw invalid('payout_unchanged');
      const since = new Date(Date.now() - PAYOUT_WINDOW_MS).toISOString();
      const recent = (await this.db.get("SELECT COUNT(*) AS n FROM payout_methods WHERE wedding_id = ? AND source = 'owner' AND created_at > ?", wid, since)) as Row;
      if (Number(recent['n']) >= PAYOUT_MAX_CHANGES) throw new ApiError(429, 'too_many_changes');
      (await this.db.run("INSERT INTO payout_methods (id,wedding_id,version,alias,bank,cbu,created_by,created_at,source) VALUES (?,?,?,?,?,?,?,?,'owner')", newId('pay'), wid, cur.version + 1, next.alias, next.bank, next.cbu, s.userId, now()));
      return cur;
    });
    this.payoutLimiter.reset(s.userId);
    void this.mailPayoutChanged(s.email, prev, next);
    const w = (await this.ensureWedding(s.userId));
    return { payout: (await this.activePayout(w['id'] as string)), pendingChanges: (await this.pendingChanges(w)) };
  }

  private mailPayoutChanged(to: string, prev: Payout, next: { alias: string; bank: string; cbu: string }) {
    const show = (p: { alias: string; bank: string; cbu: string }) => [`Alias: ${p.alias ? maskAlias(p.alias) : 'sin alias'}`, ...(p.cbu ? [`CBU: ${maskCbu(p.cbu)}`] : []), ...(p.bank ? [`Banco: ${p.bank}`] : [])].join(' · ');
    const body = layout({
      title: prev.version ? 'Cambiaron tus datos de cobro' : 'Cargaste tus datos de cobro',
      paragraphs: [
        `${prev.version ? 'Se cambió' : 'Se cargó'} adónde transfieren tus invitados los regalos, desde tu cuenta de Weda.`,
        ...(prev.version ? [`Antes: ${show(prev)}`] : []),
        `${prev.version ? 'Ahora' : 'Datos'}: ${show(next)}`,
        'Tus invitados lo van a ver cuando publiques los cambios de tu página.',
        'Si no fuiste vos, cambiá tu clave ahora y escribinos a hola@weda.app.',
      ],
      button: { label: 'Cambiar mi clave', url: `${this.cfg.publicUrl}/clave` },
    });
    return sendMail(this.db, this.cfg, 'payout_changed', { to, subject: prev.version ? 'Cambiaron tus datos de cobro en Weda' : 'Cargaste tus datos de cobro en Weda', ...body });
  }

  /* ------------------------------------------------------------------ publicación */

  /**
   * Estado de la celebración (PAY-07, BR-62 a BR-65, DP-25). Se calcula, no se guarda, y nunca sale del navegador.
   * - `active`: publicada (con la compuerta de pago, con una orden pagada de ese plan). Sin vencimiento: sigue activa indefinidamente (BR-65).
   *   Bajar la página no la cierra (PAY-01, supuesto S-1).
   * - `paid_unpublished`: pago confirmado y publicación pendiente o fallida; se reintenta sin cobrar. No opera.
   * - `trial`: 14 días desde que se creó la celebración (BR-63); sin `trial_started_at` todavía, el trial no empezó.
   * - `paused`: venció el trial sin contratar (BR-64). Solo lectura; los datos se conservan.
   * Sin compuerta (desarrollo y pruebas, IC-17) la publicación alcanza para `active`. El plan del borrador nunca cuenta.
   */
  private async access(wid: string): Promise<Access> {
    const paid = ((await this.db.all("SELECT plan_id FROM orders WHERE wedding_id = ? AND status = 'paid'", wid)) as Row[]).map(r => normalizePlanId(r['plan_id'] as PlanId));
    const pub = (await this.db.get('SELECT plan_id FROM publications WHERE wedding_id = ?', wid)) as Row | undefined;
    const w = (await this.db.get('SELECT trial_started_at FROM weddings WHERE id = ?', wid)) as Row;
    const started = (w['trial_started_at'] as string | null) ?? null;
    const trialEndsAt = started ? new Date(Date.parse(started) + TRIAL_DAYS * 86_400_000).toISOString() : null;
    const plan = pub ? normalizePlanId(pub['plan_id'] as PlanId) : null;
    // Publicado sin una orden pagada de su plan (por ejemplo, antes de encender la compuerta): no opera.
    if (plan && (!this.cfg.requirePaidOrder || paid.includes(plan))) return { state: 'active', plan, trialEndsAt };
    if (paid.length) return { state: 'paid_unpublished', plan: null, trialEndsAt };
    if (trialEndsAt && Date.parse(trialEndsAt) <= Date.now()) return { state: 'paused', plan: null, trialEndsAt };
    return { state: 'trial', plan: null, trialEndsAt };
  }

  /** Rechaza la operación si el plan publicado no la incluye (403). Las lecturas no pasan por acá. Sin vencimiento posterior a publicar (BR-65). */
  private async assertOperates(wid: string, op: Operation) {
    const a = (await this.access(wid));
    if (a.state === 'paused') throw new ApiError(403, 'trial_ended');
    if (!operates(a, op)) throw new ApiError(403, 'feature_requires_plan', `${op}:${planForOperation(op)?.id ?? ''}`);
  }

  /** BR-64: con el trial vencido y sin contratar, la celebración se lee pero no se edita. Contratar (checkout) sigue disponible. */
  private async assertNotPaused(wid: string) {
    if ((await this.access(wid)).state === 'paused') throw new ApiError(403, 'trial_ended');
  }

  /** Plan con el que se publica: el que el servidor puede respaldar. Con `requirePaidOrder`, el de la orden pagada; si no, el elegido en el borrador. */
  private async entitledPlan(wid: string, draftPlan: PlanId | null): Promise<PlanId> {
    if (this.cfg.requirePaidOrder) {
      const paid = (await this.db.all("SELECT plan_id FROM orders WHERE wedding_id = ? AND status = 'paid'", wid)) as Row[];
      const best = paid.map(r => planById(r['plan_id'] as PlanId)).filter(Boolean).sort((a, b) => planRank(b!.id) - planRank(a!.id))[0];
      if (!best) throw new ApiError(402, 'payment_required');
      return best.id;
    }
    if (!draftPlan) throw conflict('no_plan');
    return draftPlan;
  }

  async publish(userId: string) {
    return (await this.publishWedding((await this.ensureWedding(userId))['id'] as string));
  }

  /**
   * Publica (o publica los cambios de) una celebración. La usan la pareja y, al confirmarse un pago, el propio servidor (BR-01: contratar y publicar
   * son un único momento). Todo o nada: si falla, no escribe y se puede reintentar sin volver a cobrar (DP-25).
   */
  private async publishWedding(wid: string) {
    return this.db.tx('weda', async () => {
      const w = (await this.db.get('SELECT * FROM weddings WHERE id = ?', wid)) as Row;
      const draft = (await this.withPayout(JSON.parse(w['draft'] as string) as DraftState, wid));
      if (!draft.couple.first.trim() || !draft.couple.second.trim()) throw conflict('incomplete', 'couple_names');
      // Con el trial vencido solo se publica contratando: con la compuerta, la orden pagada ya saca de la pausa; sin ella, no se publica (BR-64).
      (await this.assertNotPaused(wid));
      const planId = (await this.entitledPlan(wid, draft.planId));
      let slug = w['slug'] as string | null;
      if (!slug) {
        const base = slugify(draft.couple.first, draft.couple.second) || 'casamiento';
        slug = base;
        for (let i = 2; (await this.db.get('SELECT 1 FROM weddings WHERE slug = ?', slug)); i++) slug = `${base}-${i}`;
        (await this.db.run('UPDATE weddings SET slug = ? WHERE id = ?', slug, wid));
      }
      const snapshot = publicSite(draft, planId, slug);
      const t = now();
      const prev = (await this.db.get('SELECT plan_id, version FROM publications WHERE wedding_id = ?', wid)) as Row | undefined;
      // F8 (D-05): mientras DP-23 siga pendiente, una página publicada no cambia de plan.
      if (prev && normalizePlanId(prev['plan_id'] as PlanId) !== normalizePlanId(planId)) throw conflict('plan_change_pending');
      // Sin vencimiento (BR-65): publicar cambios, bajar y volver a publicar no tienen fecha límite. `expires_at` queda como historia (migración 8).
      if (prev) (await this.db.run("UPDATE publications SET status='live', plan_id=?, snapshot=?, version=?, updated_at=? WHERE wedding_id=?", planId, JSON.stringify(snapshot), (prev['version'] as number) + 1, t, wid));
      else (await this.db.run("INSERT INTO publications (wedding_id,status,plan_id,snapshot,version,published_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,NULL)", wid, 'live', planId, JSON.stringify(snapshot), 1, t, t));
      // El plan publicado pasa a ser el del borrador (F-P1): una sola fuente para lo que se muestra como incluido. No cambia la revisión.
      (await this.db.run("UPDATE weddings SET draft = jsonb_set(draft::jsonb, '{planId}', to_jsonb(?::text))::text WHERE id = ?", planId, wid));
      (await this.track('publication_completed', { plan_id: planId, is_republish: !!prev }));
      return { slug, planId, version: ((prev?.['version'] as number | undefined) ?? 0) + 1, access: (await this.access(wid)) };
    });
  }

  async unpublish(userId: string) {
    const w = (await this.weddingOf(userId));
    if (!w) throw notFound();
    const r = (await this.db.run("UPDATE publications SET status='taken_down', updated_at=? WHERE wedding_id=? AND status='live'", now(), w['id'] as string));
    if (Number(r.changes) === 0) throw conflict('not_live');
  }

  /* ------------------------------------------------------------------ sitio público (sin sesión) */

  private async livePublication(slug: string): Promise<{ wid: string; snapshot: SiteData; status: string; }> {
    const row = (await this.db.get('SELECT w.id AS wid, p.snapshot AS snapshot, p.status AS status FROM weddings w JOIN publications p ON p.wedding_id = w.id WHERE w.slug = ?', slug)) as Row | undefined;
    if (!row) throw notFound('site_not_found');
    if (row['status'] !== 'live') throw new ApiError(410, 'site_unpublished');
    // Sin vencimiento (BR-65): la página, las confirmaciones y los regalos siguen activos mientras esté publicada.
    return { wid: row['wid'] as string, snapshot: JSON.parse(row['snapshot'] as string) as SiteData, status: 'live' };
  }

  /** Solo el snapshot publicado. Ningún dato de aportes: los regalos son repetibles (BR-19) y lo público no muestra cuántos se regalaron (BR-27). */
  async getPublicSite(slug: string) {
    const p = (await this.livePublication(slug));
    (await this.track('public_invitation_opened'));
    return { site: p.snapshot };
  }

  /** Confirmación de asistencia. No devuelve datos de invitados: ni existentes ni propios. */
  async submitRsvp(slug: string, peopleRaw: unknown, contactRaw?: unknown) {
    const p = (await this.livePublication(slug));
    if (!p.snapshot.blocks.rsvp) throw conflict('rsvp_disabled');
    const people = parseRsvp(peopleRaw, p.snapshot.rsvp.menus !== null);
    // Correo opcional de quien responde (queda en cada persona de este envío). Novedades de Weda: solo con correo y casilla tildada.
    const contact = (contactRaw ?? {}) as Row;
    const email = optEmail(contact['email']);
    const optIn = contact['marketingOptIn'] === true && !!email;
    return this.db.tx('weda', async () => {
      const t = now();
      for (const x of people) {
        const key = normalizeName(x.first, x.last);
        const found = (await this.db.get('SELECT id FROM guests WHERE wedding_id = ? AND name_key = ? ORDER BY created_at LIMIT 1', p.wid, key)) as Row | undefined;
        const status = x.attending ? 'confirmed' : 'declined';
        const menu = x.attending ? x.menu : '';
        let gid: string;
        if (found) { gid = found['id'] as string; (await this.db.run("UPDATE guests SET status=?, menu=?, source='rsvp', email=CASE WHEN ? != '' THEN ? ELSE email END, updated_at=? WHERE id=?", status, menu, email, email, t, gid)); }
        else { gid = newId('inv'); (await this.db.run("INSERT INTO guests (id,wedding_id,first,last,name_key,status,menu,group_id,source,email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,NULL,'rsvp',?,?,?)", gid, p.wid, x.first, x.last, key, status, menu, email, t, t)); }
        (await this.db.run('INSERT INTO rsvp_events (wedding_id,guest_id,status,menu,at) VALUES (?,?,?,?,?)', p.wid, gid, status, menu, t));
      }
      if (optIn) (await this.grantConsent(email, 'rsvp', p.wid));
      (await this.track('rsvp_submitted', { attending: people.some(x => x.attending) }));
      return { count: people.length };
    });
  }

  /** Alta en la base de novedades de Weda (consentimiento expreso). Si la persona ya tiene un consentimiento vigente, no se duplica. */
  private async grantConsent(email: string, source: 'gift' | 'rsvp', weddingId: string) {
    const live = (await this.db.get('SELECT 1 FROM marketing_consents WHERE lower(email) = lower(?) AND revoked_at IS NULL', email));
    if (live) return;
    (await this.db.run('INSERT INTO marketing_consents (id,email,source,wedding_id,text_version,granted_at,revoked_at) VALUES (?,?,?,?,?,?,NULL)', newId('cns'), email, source, weddingId, MARKETING_CONSENT_VERSION, now()));
  }

  /* ------------------------------------------------------------------ aportes */

  /** El invitado informa que regala/aportó. Los montos salen del snapshot publicado; la clave de idempotencia evita duplicados al reintentar. */
  async submitContribution(slug: string, raw: unknown) {
    const b = (raw ?? {}) as Row;
    const p = (await this.livePublication(slug));
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
    // Aporte libre (GIFT-09): un solo renglón por aporte, solo si lo publicado lo habilita. Es el único importe que viene del cliente.
    const wantsFree = b['freeAmount'] !== undefined && b['freeAmount'] !== null;
    if (ids.length > 30 || (ids.length < 1 && !wantsFree)) throw invalid('invalid_gifts');
    if (!p.snapshot.blocks.gifts) throw conflict('gifts_disabled');
    const gifts = ids.map(id => p.snapshot.gifts.find(g => g.id === id));
    if (gifts.some(g => !g)) throw invalid('unknown_gift');
    let free: number | null = null;
    if (wantsFree) {
      const fa = p.snapshot.freeAmount;
      if (!fa?.enabled) throw conflict('free_amount_disabled');
      const v = b['freeAmount'];
      if (typeof v !== 'number' || !Number.isInteger(v) || v < Math.max(fa.min, MIN_AMOUNT) || v > MAX_AMOUNT) throw invalid('invalid_free_amount');
      free = v;
    }
    const lines = [
      ...gifts.map(g => ({ kind: 'gift' as const, giftId: g!.id, name: g!.name, suggested: Math.round(g!.amount), amount: Math.round(g!.amount) })),
      ...(free !== null ? [{ kind: 'free' as const, giftId: null, name: null, suggested: null, amount: free }] : []),
    ];
    // El comprobante se sube antes de la transacción (subir no retiene el candado de la base); si el aporte no se registra, se borra.
    let written = '';
    if (receipt) { written = newId('rcp'); await this.files.putReceipt(written, receipt.bytes, receipt.mime); }
    let res: { id: string; status: string; replay: boolean };
    try { res = await this.db.tx('weda', async () => {
      const hash = sha256(manage);
      const prev = (await this.db.get('SELECT id, status, manage_token_hash FROM contributions WHERE wedding_id = ? AND idempotency_key = ?', p.wid, key)) as Row | undefined;
      if (prev) {
        if (prev['manage_token_hash'] !== hash) throw conflict('idempotency_key_reused');
        return { id: prev['id'] as string, status: prev['status'] as string, replay: true };
      }
      if (!receipt) throw invalid('receipt_required');
      // Regalos repetibles (BR-19): el mismo regalo puede estar en cualquier cantidad de aportes. Lo único que evita duplicados es la clave de idempotencia.
      const id = newId('apo');
      const t = now();
      const total = lines.reduce((n, l) => n + l.amount, 0);
      (await this.db.run("INSERT INTO contributions (id,wedding_id,giver_name,giver_email,message,how,status,total,idempotency_key,manage_token_hash,created_at,updated_at) VALUES (?,?,?,?,?,?,'pending_review',?,?,?,?,?)", id, p.wid, giver, giverEmail, message, 'alias', total, key, hash, t, t));
      if (b['marketingOptIn'] === true) (await this.grantConsent(giverEmail, 'gift', p.wid));
      for (const l of lines) (await this.db.run('INSERT INTO contribution_items (contribution_id,kind,gift_id,gift_name,suggested_amount,amount) VALUES (?,?,?,?,?,?)', id, l.kind, l.giftId, l.name, l.suggested, l.amount));
      (await this.db.run("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'created','guest',NULL,'pending_review','',?)", id, t));
      (await this.db.run('INSERT INTO receipts (id,wedding_id,contribution_id,mime,size,storage_key,created_at) VALUES (?,?,?,?,?,?,?)', newId('rec'), p.wid, id, receipt.mime, receipt.bytes.length, written, t));
      return { id, status: 'pending_review', replay: false };
    });
    } catch (e) {
      if (written) await this.files.removeReceipt(written); // sin registro no queda archivo huérfano
      throw e;
    }
    if (res.replay && written) await this.files.removeReceipt(written); // reintento: el aporte ya tenía su comprobante
    if (!res.replay) (await this.track('gift_submitted'));
    // Constancia para quien regaló (no bloquea: si el correo falla, el regalo ya quedó registrado).
    if (!res.replay) void this.mailGiftReceipt({ id: res.id, to: giverEmail, giver, couple: p.snapshot.names, gifts: lines.map(l => ({ name: l.name ?? FREE_AMOUNT_LABEL, amount: l.amount })), manage, optedIn: b['marketingOptIn'] === true });
    return res;
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
    const { to, link, giver, couple } = await this.db.tx('weda', async () => {
      const c = (await this.ownedContribution(userId, id));
      (await this.assertOperates(c['wedding_id'] as string, 'contributions'));
      if (c['status'] === 'rejected') throw conflict('contribution_rejected');
      if ((await this.db.get('SELECT 1 FROM receipts WHERE contribution_id = ?', id))) throw conflict('receipt_already_attached');
      const to = (c['giver_email'] as string | undefined) ?? '';
      if (!to) throw conflict('no_giver_email');
      const last = (await this.db.get("SELECT at FROM contribution_events WHERE contribution_id = ? AND kind = 'receipt_reminder' ORDER BY id DESC LIMIT 1", id)) as Row | undefined;
      if (last && Date.now() - Date.parse(last['at'] as string) < REMINDER_GAP_MS) throw conflict('reminder_too_soon');
      const token = newToken();
      (await this.db.run('UPDATE contributions SET manage_token_hash = ?, updated_at = ? WHERE id = ?', sha256(token), now(), id));
      (await this.db.run("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'receipt_reminder','owner',?,?,'',?)", id, c['status'] as string, c['status'] as string, now()));
      const site = (await this.db.get("SELECT snapshot FROM publications WHERE wedding_id = ? ORDER BY version DESC LIMIT 1", c['wedding_id'] as string)) as Row | undefined;
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
  async unsubscribe(token: string): Promise<boolean> {
    const email = verifyUnsubscribe(this.cfg.secret, token);
    if (!email) return false;
    (await this.db.run('UPDATE marketing_consents SET revoked_at = ? WHERE lower(email) = lower(?) AND revoked_at IS NULL', now(), email));
    return true;
  }

  private async contributionWithToken(id: string, token: string | undefined): Promise<Row> {
    const row = (await this.db.get('SELECT * FROM contributions WHERE id = ?', id)) as Row | undefined;
    // Mismo error si no existe o si el token no coincide: no se revela cuáles ids existen.
    const ok = !!row && !!token && sha256(token).length === (row['manage_token_hash'] as string).length && timingSafeEqual(Buffer.from(sha256(token)), Buffer.from(row['manage_token_hash'] as string));
    if (!ok) throw notFound();
    return row!;
  }

  async guestContributionStatus(id: string, token: string | undefined) {
    const c = (await this.contributionWithToken(id, token));
    const rec = (await this.db.get('SELECT 1 FROM receipts WHERE contribution_id = ?', id));
    return { id, status: c['status'] as string, total: c['total'] as number, hasReceipt: !!rec };
  }

  /** El invitado adjunta su comprobante (privado). Valida tipo real por contenido, tamaño y que el archivo y el registro queden consistentes. */
  async attachReceipt(id: string, token: string | undefined, bytes: Buffer) {
    const c = (await this.contributionWithToken(id, token));
    if (c['status'] === 'rejected') throw conflict('contribution_rejected');
    if (bytes.length === 0) throw invalid('empty_file');
    if (bytes.length > MAX_RECEIPT_BYTES) throw new ApiError(413, 'file_too_large');
    const mime = sniffMime(bytes);
    if (!mime) throw new ApiError(415, 'unsupported_file_type');
    // El archivo se sube antes de la transacción (subir no retiene el candado de la base) y se borra si el registro no se escribe.
    const key = newId('rcp');
    await this.files.putReceipt(key, bytes, mime);
    try {
      const old = await this.db.tx('weda', async () => {
        const prev = (await this.db.get('SELECT id, storage_key FROM receipts WHERE contribution_id = ?', id)) as Row | undefined;
        if (prev) (await this.db.run('DELETE FROM receipts WHERE id = ?', prev['id'] as string));
        (await this.db.run('INSERT INTO receipts (id,wedding_id,contribution_id,mime,size,storage_key,created_at) VALUES (?,?,?,?,?,?,?)', newId('rec'), c['wedding_id'] as string, id, mime, bytes.length, key, now()));
        (await this.db.run("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'receipt_attached','guest',?,?,'',?)", id, c['status'] as string, c['status'] as string, now()));
        return prev?.['storage_key'] as string | undefined;
      });
      if (old) await this.files.removeReceipt(old);
    } catch (e) {
      await this.files.removeReceipt(key); // sin registro no queda archivo huérfano
      throw e;
    }
    return { mime, size: bytes.length };
  }

  /** Aportes del casamiento del usuario (nunca de otro). */
  async listContributions(userId: string) {
    const w = (await this.weddingOf(userId));
    if (!w) return [];
    const rows = (await this.db.all('SELECT * FROM contributions WHERE wedding_id = ? ORDER BY created_at DESC, id', w['id'] as string)) as Row[];
    return Promise.all(rows.map(async c => ({
      id: c['id'] as string, giverName: c['giver_name'] as string, giverEmail: (c['giver_email'] as string | undefined) ?? '', message: c['message'] as string, how: c['how'] as string, status: c['status'] as string, total: c['total'] as number, createdAt: c['created_at'] as string,
      items: ((await this.db.all('SELECT kind, gift_id, gift_name, amount FROM contribution_items WHERE contribution_id = ? ORDER BY id', c['id'] as string)) as Row[]).map(i => ({ kind: i['kind'] as 'gift' | 'free', giftId: (i['gift_id'] as string | null) ?? '', giftName: (i['gift_name'] as string | null) ?? '', amount: i['amount'] as number })),
      hasReceipt: !!(await this.db.get('SELECT 1 FROM receipts WHERE contribution_id = ?', c['id'] as string)),
      history: ((await this.db.all('SELECT kind, actor, from_status, to_status, note, at FROM contribution_events WHERE contribution_id = ? ORDER BY id', c['id'] as string)) as Row[]).map(e => ({ kind: e['kind'] as string, actor: e['actor'] as string, from: (e['from_status'] as string | null) ?? null, to: (e['to_status'] as string | null) ?? null, note: e['note'] as string, at: e['at'] as string })),
    })));
  }

  private async ownedContribution(userId: string, id: string): Promise<Row> {
    const row = (await this.db.get('SELECT c.* FROM contributions c JOIN weddings w ON w.id = c.wedding_id WHERE c.id = ? AND w.owner_id = ?', id, userId)) as Row | undefined;
    if (!row) throw notFound(); // existe pero es de otra pareja = mismo 404
    return row;
  }

  async setContributionStatus(userId: string, id: string, to: unknown, note: unknown) {
    if (typeof to !== 'string' || !['pending_review', 'confirmed', 'rejected'].includes(to)) throw invalid('invalid_status');
    return this.db.tx('weda', async () => {
      const c = (await this.ownedContribution(userId, id));
      (await this.assertOperates(c['wedding_id'] as string, 'contributions'));
      const from = c['status'] as string;
      if (!CONTRIBUTION_TRANSITIONS[from]?.includes(to)) throw conflict('invalid_transition');
      if (to === 'confirmed' && !(await this.db.get('SELECT 1 FROM receipts WHERE contribution_id = ?', id))) throw conflict('receipt_required');
      const t = now();
      (await this.db.run('UPDATE contributions SET status=?, updated_at=? WHERE id=?', to, t, id));
      (await this.db.run("INSERT INTO contribution_events (contribution_id,kind,actor,from_status,to_status,note,at) VALUES (?,'status_changed','owner',?,?,?,?)", id, from, to, typeof note === 'string' ? note.slice(0, 300) : '', t));
      return { id, status: to };
    });
  }

  /** Comprobante: solo el dueño del casamiento. */
  async readReceipt(userId: string, id: string): Promise<{ bytes: Buffer; mime: string }> {
    (await this.ownedContribution(userId, id));
    const r = (await this.db.get('SELECT mime, storage_key FROM receipts WHERE contribution_id = ?', id)) as Row | undefined;
    if (!r) throw notFound();
    const bytes = await this.files.receipt(r['storage_key'] as string);
    if (!bytes) throw notFound();
    return { bytes, mime: r['mime'] as string };
  }

  /* ------------------------------------------------------------------ planes y órdenes */

  /** Registra la intención de compra. El monto sale del servidor. No cobra: sin proveedor de pagos configurado la orden queda «pending». */
  async createOrder(userId: string, planIdRaw: unknown) {
    if (!isPlanId(planIdRaw)) throw invalid('invalid_plan');
    const w = (await this.ensureWedding(userId));
    const plan = planById(planIdRaw)!;
    (await this.assertNoPlanChange(w['id'] as string, plan.id));
    const id = newId('ord');
    const t = now();
    (await this.db.run("INSERT INTO orders (id,wedding_id,plan_id,amount,status,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?)", id, w['id'] as string, plan.id, plan.price, t, t));
    return { id, planId: plan.id, amount: plan.price, status: 'pending', checkoutUrl: null as string | null };
  }

  async listOrders(userId: string) {
    const w = (await this.weddingOf(userId));
    if (!w) return [];
    return ((await this.db.all('SELECT id, plan_id, amount, status, created_at, paid_at FROM orders WHERE wedding_id = ? ORDER BY created_at DESC, id', w['id'] as string)) as Row[]).map(o => ({ id: o['id'] as string, planId: o['plan_id'] as string, amount: o['amount'] as number, status: o['status'] as string, createdAt: o['created_at'] as string, paidAt: (o['paid_at'] as string | null) ?? null }));
  }

  /** Plan más alto que esta pareja ya pagó (con confirmación del proveedor), o null. */
  private async paidPlan(wid: string): Promise<PlanId | null> {
    const paid = (await this.db.all("SELECT plan_id FROM orders WHERE wedding_id = ? AND status = 'paid'", wid)) as Row[];
    return paid.map(r => planById(r['plan_id'] as PlanId)).filter(Boolean).sort((a, b) => planRank(b!.id) - planRank(a!.id))[0]?.id ?? null;
  }

  /** Con un plan ya pagado: el mismo → `already_paid`; otro → `plan_change_pending` (F8, D-05: DP-23 pendiente). No crea ninguna orden. */
  private async assertNoPlanChange(wid: string, planId: PlanId) {
    const current = (await this.paidPlan(wid));
    if (!current) return;
    throw conflict(normalizePlanId(current) === normalizePlanId(planId) ? 'already_paid' : 'plan_change_pending');
  }

  /** Para el panel: hay cobro configurado y qué plan está pagado. Sin proveedor, `payments: false` (publicar no cobra). */
  async paymentInfo(userId: string) {
    const w = (await this.weddingOf(userId));
    return { payments: this.cfg.payments.provider !== 'none', paidPlan: w ? (await this.paidPlan(w['id'] as string)) : null };
  }

  /**
   * Empieza un pago. El monto lo calcula el servidor: el precio del plan. Con un plan ya pagado no se cobra nada más (F8, D-05). Si ya hay una orden
   * pendiente para el mismo plan y monto (doble clic, recarga, volver atrás), se reusa: no se crean dos cobros para lo mismo.
   */
  async startCheckout(userId: string, planIdRaw: unknown) {
    const provider = providerFor(this.cfg);
    if (!provider) throw new ApiError(501, 'payments_not_configured');
    if (!isPlanId(planIdRaw)) throw invalid('invalid_plan');
    return this.db.tx('weda', async () => {
      const w = (await this.ensureWedding(userId));
      const wid = w['id'] as string;
      const plan = planById(planIdRaw)!;
      (await this.assertNoPlanChange(wid, plan.id));
      // Sin mejoras ni cobros adicionales (D-05): se cobra el precio completo del plan, una sola vez.
      const amount = plan.price;
      const open = (await this.db.get("SELECT id FROM orders WHERE wedding_id = ? AND plan_id = ? AND amount = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", wid, plan.id, amount)) as Row | undefined;
      const id = (open?.['id'] as string | undefined) ?? newId('ord');
      if (!open) {
        const t = now();
        (await this.db.run("INSERT INTO orders (id,wedding_id,plan_id,amount,status,provider,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?,?)", id, wid, plan.id, amount, provider.name, t, t));
      }
      return { id, planId: plan.id, amount, status: 'pending', checkoutUrl: provider.checkoutUrl({ id, amount }, this.cfg) };
    });
  }

  /** Estado de una orden propia (para retomar un pago interrumpido o al volver del proveedor). */
  async orderStatus(userId: string, id: string) {
    const o = (await this.db.get('SELECT o.id, o.plan_id, o.amount, o.status, o.paid_at FROM orders o JOIN weddings w ON w.id = o.wedding_id WHERE o.id = ? AND w.owner_id = ?', id, userId)) as Row | undefined;
    if (!o) throw notFound();
    return { id: o['id'] as string, planId: o['plan_id'] as string, amount: o['amount'] as number, status: o['status'] as string, paidAt: (o['paid_at'] as string | null) ?? null };
  }

  /**
   * Notificación del proveedor (webhook). Única vía para marcar una orden como pagada. Se verifica la firma; cada evento se procesa una sola vez
   * (el proveedor puede repetirlo) y una orden ya cerrada no cambia por un evento posterior contradictorio.
   */
  async handlePaymentNotification(providerName: string, rawBody: string, headers: Headers) {
    const provider = providerFor(this.cfg);
    if (!provider || provider.name !== providerName) throw notFound();
    let n;
    try { n = provider.verify(rawBody, headers, this.cfg); } catch { throw new ApiError(401, 'invalid_signature'); }
    const res = (await this.settlePaymentEvent(provider.name, n));
    // BR-01 (PAY-07): con el pago confirmado se publica en el mismo momento. Va DESPUÉS y aparte: el pago queda registrado aunque la publicación falle
    // (por ejemplo, faltan los nombres); el estado queda en `paid_unpublished` y la pareja reintenta sin volver a pagar (DP-25).
    if (res.status === 'paid' && !res.duplicate && !res.ignored) {
      const wid = ((await this.db.get('SELECT wedding_id FROM orders WHERE id = ?', n.orderId)) as Row)['wedding_id'] as string;
      try { (await this.publishWedding(wid)); } catch (e) {
        // F-P2: la falla queda registrada (evento persistente y log del servidor) solo con su código, sin datos de la pareja ni del pago.
        // Recuperación: «Publicar mi página» en el panel.
        const reason = e instanceof ApiError ? e.code : 'unexpected';
        (await this.track('publication_failed', { reason }));
        console.error(`Publicación automática tras el pago no completada: ${reason}`);
      }
    }
    return res;
  }

  private async settlePaymentEvent(providerName: string, n: { eventId: string; orderId: string; outcome: Outcome; providerRef: string }): Promise<{ duplicate: boolean; ignored?: boolean; status?: string; }> {
    const provider = { name: providerName };
    return this.db.tx('weda', async () => {
      const seen = (await this.db.get('SELECT 1 FROM payment_events WHERE provider = ? AND event_id = ?', provider.name, n.eventId));
      if (seen) return { duplicate: true };
      (await this.db.run('INSERT INTO payment_events (provider,event_id,order_id,outcome,received_at) VALUES (?,?,?,?,?)', provider.name, n.eventId, n.orderId, n.outcome, now()));
      const o = (await this.db.get('SELECT status FROM orders WHERE id = ?', n.orderId)) as Row | undefined;
      if (!o) throw notFound();
      if (o['status'] !== 'pending') return { duplicate: false, ignored: true, status: o['status'] as string };
      const t = now();
      (await this.db.run('UPDATE orders SET status=?, provider=?, provider_ref=?, updated_at=?, paid_at=? WHERE id=?', n.outcome, provider.name, n.providerRef, t, n.outcome === 'paid' ? t : null, n.orderId));
      // Única fuente de «pago confirmado»: la notificación verificada del proveedor.
      if (n.outcome === 'paid') { const po = (await this.db.get('SELECT plan_id FROM orders WHERE id = ?', n.orderId)) as Row; (await this.track('payment_confirmed', { plan_id: po['plan_id'] as string })); }
      return { duplicate: false, status: n.outcome };
    });
  }

  /** SOLO adaptador de prueba: lo que hace el «proveedor» cuando la persona toca Aprobar/Rechazar/Cancelar en /pago-de-prueba. Pasa por la misma verificación. */
  async completeTestPayment(userId: string, orderId: string, outcome: unknown) {
    if (this.cfg.payments.provider !== 'test') throw notFound();
    if (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'cancelled') throw invalid('invalid_outcome');
    (await this.orderStatus(userId, orderId)); // solo la pareja dueña
    const { body, signature } = signedTestNotification(this.cfg, { eventId: newId('evt'), orderId, outcome: outcome as Outcome });
    return (await this.handlePaymentNotification('test', body, new Headers({ 'x-weda-signature': signature })));
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

/** Destino de cobro que manda el panel: alias en minúsculas (6–20 letras, números, puntos o guiones), CBU de 22 números y banco corto. Vacío = sin dato. */
function parsePayout(v: Row): { alias: string; bank: string; cbu: string } {
  const text = (x: unknown, code: string) => { if (x === undefined || x === null) return ''; if (typeof x !== 'string') throw invalid(code); return x.trim(); };
  const alias = text(v['alias'], 'invalid_alias').toLowerCase();
  if (alias && validateAlias(alias)) throw invalid('invalid_alias');
  const cbu = cleanCbu(text(v['cbu'], 'invalid_cbu'));
  if (cbu && validateCbu(cbu)) throw invalid('invalid_cbu');
  const bank = text(v['bank'], 'invalid_bank');
  // eslint-disable-next-line no-control-regex -- se rechazan justamente los caracteres de control
  if (bank.length > 60 || /[\u0000-\u001f\u007f]/.test(bank)) throw invalid('invalid_bank');
  return { alias, bank, cbu };
}

/** Vencimiento de una publicación. Las anteriores a la migración 5 no lo tienen guardado: se calcula desde su primera publicación. */


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
