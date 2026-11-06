// Cuentas y sesiones de Weda: registrarse, entrar, salir, contar y cerrar las otras sesiones, comprobar y cambiar la clave.
// Dos implementaciones con la misma forma: la propia (tablas `users` y `sessions`, claves con scrypt) y Supabase Auth (OPS-08, D-07, P1).
// La cookie de Weda (`weda_session`) guarda un token opaco: en la propia, el token de la sesión; en Supabase, el de acceso y el de renovación.
// El enlace para recuperar la clave sigue siendo de Weda (tabla `password_resets` y correo propio): ver service.ts.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Db, Row } from './db';
import { ApiError, conflict, invalid } from './errors';
import { hashPassword, newId, newToken, sha256, verifyPassword } from './security';

export type Issued = { userId: string; email: string; token: string };
/** Sesión válida. `renewed`: el token cambió (se renovó el de acceso) y hay que reescribir la cookie. */
export type Authenticated = { userId: string; email: string; token: string; renewed: boolean };

export interface Accounts {
  /** Crea la cuenta y abre una sesión. Correo repetido → 409 `email_taken`. */
  create(email: string, password: string): Promise<Issued>;
  /** null si el correo o la clave no coinciden (sin decir cuál). */
  signIn(email: string, password: string): Promise<Issued | null>;
  session(token: string): Promise<Authenticated | null>;
  signOut(token: string): Promise<void>;
  countOthers(userId: string, token: string): Promise<number>;
  closeOthers(userId: string, token: string): Promise<number>;
  checkPassword(userId: string, email: string, password: string): Promise<boolean>;
  /**
   * Cambia la clave y cierra todas las sesiones de la cuenta, salvo la de `keep` (si viene). Devuelve el token con el que sigue esa sesión:
   * el mismo (cuentas propias) o uno nuevo (Supabase cierra todas al cambiar la clave, así que se abre otra para quien la cambió).
   */
  setPassword(userId: string, password: string, keep?: { token: string; email: string }): Promise<string | null>;
  idByEmail(email: string): Promise<string | null>;
}

const SESSION_DAYS = 30;
const now = () => new Date().toISOString();

/** Cuentas propias, en la base de Weda (SQLite). */
export class LocalAccounts implements Accounts {
  constructor(private db: Db) {}
  private async open(userId: string): Promise<string> {
    const token = newToken();
    const exp = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
    await this.db.run('INSERT INTO sessions (id,user_id,created_at,expires_at) VALUES (?,?,?,?)', sha256(token), userId, now(), exp);
    return token;
  }
  async create(email: string, password: string) {
    const hash = await hashPassword(password);
    const id = newId('usr');
    try {
      await this.db.run('INSERT INTO users (id,email,password_hash,created_at) VALUES (?,?,?,?)', id, email, hash, now());
    } catch (e) {
      if (String((e as Error).message).includes('UNIQUE')) throw conflict('email_taken');
      throw e;
    }
    return { userId: id, email, token: await this.open(id) };
  }
  async signIn(email: string, password: string) {
    const row = await this.db.get('SELECT id, password_hash FROM users WHERE email = ?', email);
    // Se calcula el hash aunque el correo no exista, para no distinguirlos por tiempo.
    const ok = await verifyPassword(password, (row?.['password_hash'] as string | undefined) ?? 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAA');
    if (!row || !ok) return null;
    return { userId: row['id'] as string, email, token: await this.open(row['id'] as string) };
  }
  async session(token: string) {
    const row = await this.db.get('SELECT u.id AS id, u.email AS email, s.expires_at AS exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?', sha256(token));
    if (!row) return null;
    if ((row['exp'] as string) <= now()) { await this.db.run('DELETE FROM sessions WHERE id = ?', sha256(token)); return null; }
    return { userId: row['id'] as string, email: row['email'] as string, token, renewed: false };
  }
  async signOut(token: string) {
    await this.db.run('DELETE FROM sessions WHERE id = ?', sha256(token));
  }
  async countOthers(userId: string, token: string) {
    const row = (await this.db.get('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND id != ? AND expires_at > ?', userId, sha256(token), now()))!;
    return Number(row['n']);
  }
  async closeOthers(userId: string, token: string) {
    return (await this.db.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', userId, sha256(token))).changes;
  }
  async checkPassword(userId: string, _email: string, password: string) {
    const row = await this.db.get('SELECT password_hash FROM users WHERE id = ?', userId);
    return !!row && (await verifyPassword(password, row['password_hash'] as string));
  }
  async setPassword(userId: string, password: string, keep?: { token: string; email: string }) {
    const hash = await hashPassword(password);
    await this.db.tx(userId, async () => {
      await this.db.run('UPDATE users SET password_hash = ? WHERE id = ?', hash, userId);
      if (keep) await this.db.run('DELETE FROM sessions WHERE user_id = ? AND id != ?', userId, sha256(keep.token));
      else await this.db.run('DELETE FROM sessions WHERE user_id = ?', userId);
    });
    return keep?.token ?? null;
  }
  async idByEmail(email: string) {
    const row = await this.db.get('SELECT id FROM users WHERE email = ?', email);
    return (row?.['id'] as string | undefined) ?? null;
  }
}

/* -------------------------------------------------------------------------------------------------------------------------------- Supabase */

type Pair = { access: string; refresh: string };
const SEP = '~';
const pack = (p: Pair) => `${p.access}${SEP}${p.refresh}`;
const unpack = (token: string): Pair | null => {
  const i = token.indexOf(SEP);
  return i > 0 ? { access: token.slice(0, i), refresh: token.slice(i + 1) } : null;
};
/** Lee los datos del token de acceso sin verificarlo (la verificación la hace `getClaims` o la renovación). */
function claimsOf(access: string): { sub?: string; session_id?: string; exp?: number; email?: string } | null {
  try { return JSON.parse(Buffer.from(access.split('.')[1] ?? '', 'base64url').toString('utf8')) as Record<string, never>; }
  catch { return null; }
}

/**
 * Supabase Auth, con la clave de servicio (solo en el servidor; nunca llega al navegador). No se guardan sesiones en memoria.
 * Cada pedido verifica el token de acceso **y** que la sesión siga existiendo en `auth.sessions`: cerrar sesión tiene efecto en el acto (plan OPS-08).
 * Las consultas a `auth.*` van por la misma conexión del servidor (`db`), que tiene acceso a ese esquema.
 */
export class SupabaseAccounts implements Accounts {
  private admin: SupabaseClient;
  constructor(private url: string, private key: string, private db: Db) {
    this.admin = this.client();
  }
  /** Cliente nuevo y sin estado: cada ingreso usa el suyo para no mezclar sesiones entre pedidos. */
  private client() {
    return createClient(this.url, this.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  private issued(s: { access_token: string; refresh_token: string; user: { id: string; email?: string | undefined } }, email: string): Issued {
    return { userId: s.user.id, email: s.user.email ?? email, token: pack({ access: s.access_token, refresh: s.refresh_token }) };
  }
  async create(email: string, password: string) {
    // Sin correo de confirmación (P10): la cuenta nace confirmada y se entra enseguida, como hoy.
    const { error } = await this.admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      if (error.code === 'email_exists' || error.code === 'user_already_exists') throw conflict('email_taken');
      // Supabase Auth es más estricto que Weda con el formato (por ejemplo, no acepta «ñ»): se responde como un correo inválido.
      if (error.code === 'email_address_invalid' || error.code === 'validation_failed' || /invalid format/i.test(error.message)) throw invalid('invalid_email');
      throw new Error(`Supabase Auth (createUser): ${error.message}`);
    }
    const r = await this.signIn(email, password);
    if (!r) throw new Error('Supabase Auth: la cuenta se creó pero no se pudo entrar');
    return r;
  }
  async signIn(email: string, password: string) {
    const { data, error } = await this.client().auth.signInWithPassword({ email, password });
    // Límite de Supabase: se responde como el límite propio de Weda (429), no como un error interno.
    if (error?.status === 429 || error?.code === 'over_request_rate_limit') throw new ApiError(429, 'too_many_attempts');
    if (error && error.code !== 'invalid_credentials') console.error('Supabase Auth (signIn):', error.code, error.message);
    if (error || !data.session) return null;
    return this.issued(data.session, email);
  }
  private async alive(sessionId: string | undefined, userId: string | undefined): Promise<boolean> {
    if (!sessionId || !userId) return false;
    const row = await this.db.get("SELECT 1 FROM auth.sessions WHERE id = ? AND user_id = ? AND (not_after IS NULL OR not_after > now())", sessionId, userId);
    return !!row;
  }
  async session(token: string): Promise<Authenticated | null> {
    const pair = unpack(token);
    if (!pair) return null;
    const c = claimsOf(pair.access);
    const fresh = !!c?.exp && c.exp * 1000 > Date.now() + 5_000;
    if (fresh) {
      const { data, error } = await this.admin.auth.getClaims(pair.access);
      const claims = data?.claims as { sub?: string; session_id?: string; email?: string } | undefined;
      if (error || !claims?.sub || !(await this.alive(claims.session_id, claims.sub))) return null;
      return { userId: claims.sub, email: claims.email ?? '', token, renewed: false };
    }
    // Venció el de acceso: si la sesión sigue viva, se renueva con el de renovación y se reescribe la cookie.
    const { data, error } = await this.client().auth.refreshSession({ refresh_token: pair.refresh });
    if (error || !data.session || !data.user) return null;
    const next = claimsOf(data.session.access_token);
    if (!(await this.alive(next?.session_id, data.user.id))) return null;
    return { userId: data.user.id, email: data.user.email ?? '', token: pack({ access: data.session.access_token, refresh: data.session.refresh_token }), renewed: true };
  }
  async signOut(token: string) {
    const pair = unpack(token);
    if (pair) await this.admin.auth.admin.signOut(pair.access, 'local');
  }
  async countOthers(userId: string, token: string) {
    const sid = claimsOf(unpack(token)?.access ?? '')?.session_id ?? '';
    const row = (await this.db.get("SELECT COUNT(*) AS n FROM auth.sessions WHERE user_id = ? AND id::text != ? AND (not_after IS NULL OR not_after > now())", userId, sid))!;
    return Number(row['n']);
  }
  async closeOthers(userId: string, token: string) {
    const sid = claimsOf(unpack(token)?.access ?? '')?.session_id ?? '';
    return (await this.db.run('DELETE FROM auth.sessions WHERE user_id = ? AND id::text != ?', userId, sid)).changes;
  }
  async checkPassword(_userId: string, email: string, password: string) {
    // Se comprueba con un ingreso aparte, y esa sesión de comprobación se cierra en el acto.
    const r = await this.signIn(email, password);
    if (!r) return false;
    await this.signOut(r.token);
    return true;
  }
  async setPassword(userId: string, password: string, keep?: { token: string; email: string }) {
    // Supabase cierra todas las sesiones de la cuenta al cambiar la clave (comprobado en el proyecto de desarrollo, 2026-11-05).
    const { error } = await this.admin.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(`Supabase Auth (updateUserById): ${error.message}`);
    await this.db.run('DELETE FROM auth.sessions WHERE user_id = ?', userId); // por si alguna quedara abierta
    if (!keep) return null;
    // Quien cambió la clave sigue adentro: se le abre una sesión nueva y la API reescribe su cookie.
    const r = await this.signIn(keep.email, password);
    return r?.token ?? null;
  }
  async idByEmail(email: string) {
    const row: Row | undefined = await this.db.get('SELECT id::text AS id FROM auth.users WHERE lower(email) = lower(?)', email);
    return (row?.['id'] as string | undefined) ?? null;
  }
}
