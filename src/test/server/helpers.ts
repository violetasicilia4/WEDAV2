/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API, sin esquema compartido todavía */
// Fixtures de integración, con llamadas por la misma función que usa el servidor (handleApi) y cookies como un navegador. Dos modos:
// · local (por defecto): base SQLite REAL y archivos en un directorio temporal;
// · Supabase (OPS-08), si hay SUPABASE_URL, SUPABASE_SECRET_KEY y SUPABASE_DB_URL (y no WEDA_TEST_DB=sqlite): cada entorno crea un esquema
//   propio de Postgres en el proyecto de DESARROLLO, sus usuarios de Auth con correos marcados y sus archivos bajo una carpeta propia, y los borra al cerrar.
// Nunca datos de producción.
import { randomBytes } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { SupabaseAccounts, type Accounts } from '@/server/accounts';
import { handleApi } from '@/server/api';
import { projectUrlFromDb, type ServerConfig } from '@/server/config';
import { openDb } from '@/server/db';
import { connectPg, migratePg, PgDb } from '@/server/pg';
import { Service } from '@/server/service';
import { DiskFiles, SupabaseFiles } from '@/server/storage';
import { emptyState } from '@/lib/weda/logic';
import type { AppState } from '@/lib/weda/types';

export type Env = { svc: Service; cfg: ServerConfig; dir: string; client: (name?: string) => Client; close: () => Promise<void> };
export type Res = { status: number; body: any; headers: Headers; raw: Response };

export class Client {
  cookie = '';
  constructor(private env: Env) {}
  async call(method: string, url: string, body?: unknown, extra: Record<string, string> = {}): Promise<Res> {
    const headers: Record<string, string> = { host: 'weda.test', ...extra };
    let payload: BodyInit | undefined;
    if (body instanceof Uint8Array) payload = body as unknown as BodyInit;
    else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
    if (this.cookie) headers['cookie'] = this.cookie;
    const raw = await handleApi(new Request(`http://weda.test${url}`, { method, headers, ...(payload !== undefined ? { body: payload } : {}) }), this.env.cfg, this.env.svc);
    if (!raw) throw new Error('ruta fuera de la API');
    const set = raw.headers.get('set-cookie');
    if (set) this.cookie = set.startsWith(`weda_session=;`) ? '' : set.split(';')[0]!;
    const text = await raw.clone().text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* binario */ }
    return { status: raw.status, body: parsed, headers: raw.headers, raw };
  }
  get = (u: string, h?: Record<string, string>) => this.call('GET', u, undefined, h);
  post = (u: string, b?: unknown, h?: Record<string, string>) => this.call('POST', u, b ?? {}, h);
  put = (u: string, b?: unknown, h?: Record<string, string>) => this.call('PUT', u, b, h);
  patch = (u: string, b?: unknown) => this.call('PATCH', u, b);
}

const SUPA = { url: process.env['SUPABASE_URL'] || projectUrlFromDb(process.env['SUPABASE_DB_URL']) || '', key: process.env['SUPABASE_SECRET_KEY'] ?? '', db: process.env['SUPABASE_TEST_DB_URL'] || process.env['SUPABASE_DB_URL'] || '' };
/** true: las pruebas de servidor corren contra el proyecto de desarrollo de Supabase. */
export const PG = !!(SUPA.url && SUPA.key && SUPA.db) && process.env['WEDA_TEST_DB'] !== 'sqlite';

/** Cuentas de Supabase con los correos marcados por entorno (`ana+t1a2b3@correo.com`): Auth es uno solo para todo el proyecto. */
class TaggedAccounts implements Accounts {
  readonly created: string[] = [];
  constructor(private inner: Accounts, private tag: string) {}
  private on = (e: string) => e.replace('@', `+${this.tag}@`);
  private off = (e: string) => e.replace(`+${this.tag}@`, '@');
  async create(email: string, password: string) { const r = await this.inner.create(this.on(email), password); this.created.push(r.userId); return { ...r, email: this.off(r.email) }; }
  async signIn(email: string, password: string) { const r = await this.inner.signIn(this.on(email), password); return r && { ...r, email: this.off(r.email) }; }
  async session(token: string) { const r = await this.inner.session(token); return r && { ...r, email: this.off(r.email) }; }
  signOut(token: string) { return this.inner.signOut(token); }
  countOthers(userId: string, token: string) { return this.inner.countOthers(userId, token); }
  closeOthers(userId: string, token: string) { return this.inner.closeOthers(userId, token); }
  checkPassword(userId: string, email: string, password: string) { return this.inner.checkPassword(userId, this.on(email), password); }
  setPassword(userId: string, password: string, keep?: { token: string; email: string }) { return this.inner.setPassword(userId, password, keep && { ...keep, email: this.on(keep.email) }); }
  idByEmail(email: string) { return this.inner.idByEmail(this.on(email)); }
}

export async function makeEnv(over: Partial<ServerConfig> = {}): Promise<Env> {
  const dir = mkdtempSync(path.join(tmpdir(), 'weda-test-'));
  const cfg: ServerConfig = { dbPath: path.join(dir, 'test.db'), dataDir: dir, cookieSecure: false, requirePaidOrder: false, allowedOrigins: [],
    mail: { from: 'Weda <hola@weda.app>', replyTo: 'hola@weda.app', testOutbox: [] }, publicUrl: 'https://weda.test', secret: 'secreto-de-prueba',
    payments: { provider: 'none', webhookSecret: 'secreto-webhook-de-prueba' }, ...over };
  if (!PG) {
    const svc = new Service(openDb(cfg.dbPath), cfg);
    const env: Env = { svc, cfg, dir, client: () => new Client(env), close: async () => { await svc.db.close(); rmSync(dir, { recursive: true, force: true }); } };
    return env;
  }
  const tag = `t${randomBytes(4).toString('hex')}`;
  const schema = `test_${tag}`;
  const admin = connectPg(SUPA.db, undefined, 1);
  await admin.unsafe(`CREATE SCHEMA ${schema}`);
  const sql = connectPg(SUPA.db, schema, 2);
  // El esquema propio tiene que valer en cada consulta: si el pooler no respeta search_path (modo transacción), las pruebas no pueden aislarse.
  const [cur] = await sql.unsafe('SELECT current_schema() AS s');
  if ((cur as unknown as { s: string }).s !== schema) {
    await sql.end(); await admin.unsafe(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
    throw new Error('Las pruebas necesitan una conexión que respete search_path: usá en SUPABASE_TEST_DB_URL la del «Session pooler» (puerto 5432).');
  }
  await migratePg(sql);
  const db = new PgDb(sql);
  const storage = createClient(SUPA.url, SUPA.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const accounts = new TaggedAccounts(new SupabaseAccounts(SUPA.url, SUPA.key, db), tag);
  const files = new SupabaseFiles(storage, `${schema}/`);
  const svc = new Service(db, cfg, files, accounts);
  const env: Env = {
    svc, cfg, dir, client: () => new Client(env),
    close: async () => {
      for (const bucket of ['media', 'receipts']) {
        const { data } = await storage.storage.from(bucket).list(schema, { limit: 1000 });
        if (data?.length) await storage.storage.from(bucket).remove(data.map(f => `${schema}/${f.name}`));
      }
      await db.close();
      await admin.unsafe(`DROP SCHEMA ${schema} CASCADE`);
      for (const id of accounts.created) await storage.auth.admin.deleteUser(id);
      await admin.end();
      rmSync(dir, { recursive: true, force: true });
    },
  };
  return env;
}

/** Nombres de los archivos guardados de un tipo (comprobantes o fotos), en disco o en Storage. */
export async function storedFiles(env: Env, kind: 'receipts' | 'media'): Promise<string[]> {
  const f = env.svc.files;
  if (f instanceof DiskFiles) { try { return readdirSync(path.join(env.dir, kind)); } catch { return []; } }
  if (f instanceof SupabaseFiles) return f.list(kind);
  return [];
}

/** Espera a que `fn` devuelva algo que cumpla `ok` (para lo que el servidor hace sin esperar, como registrar un correo). */
export async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 10_000): Promise<T> {
  const until = Date.now() + ms;
  let v = await fn();
  while (!ok(v) && Date.now() < until) { await new Promise(r => setTimeout(r, 100)); v = await fn(); }
  return v;
}

export const PASSWORD = 'Clave1234';

export async function signUp(c: Client, email: string) {
  const r = await c.post('/api/auth/register', { email, password: PASSWORD });
  if (r.status !== 201) throw new Error(`registro falló: ${r.status} ${JSON.stringify(r.body)}`);
}

/** Borrador completo de una pareja (lo que hoy guarda el panel en localStorage). */
export function draftFor(first: string, second: string, over: Partial<AppState> = {}): AppState {
  const s = emptyState();
  return {
    ...s, onboarded: true, couple: { first, second }, date: '2027-03-20', planId: 'completo',
    gifts: { ...s.gifts, alias: `${first}.${second}.mp`, items: [
      { id: 'g1', name: 'Cena frente al mar', text: '', amount: 180000, category: 'Luna de miel', icon: 'compass' },
      { id: 'g2', name: 'Spa para dos', text: '', amount: 300000, category: 'Luna de miel', icon: 'compass' },
    ] },
    site: { ...s.site, rsvp: { ...s.site.rsvp, enabled: true } },
    ...over,
  };
}

export async function saveDraft(c: Client, draft: AppState, guests?: unknown) {
  const w = await c.get('/api/wedding');
  const r = await c.put('/api/wedding', { baseRevision: w.body.revision, draft, ...(guests ? { guests } : {}) });
  if (r.status !== 200) throw new Error(`guardado falló: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

/** Publica con el plan del borrador (por defecto Celebración). Sin compuerta de pago alcanza con publicar para operar (BR-62, PAY-01 S-2). */
export async function publishWith(c: Client, draft: AppState) {
  await saveDraft(c, draft);
  const r = await c.post('/api/wedding/publish');
  if (r.status !== 200) throw new Error(`publicación falló: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

export const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** Cambia el destino de cobro como lo hace el panel: con la clave y sobre la versión vigente. */
export async function setPayout(c: Client, data: { alias?: string; bank?: string; cbu?: string }, password = PASSWORD) {
  const w = await c.get('/api/wedding');
  return c.post('/api/wedding/payout', { currentPassword: password, baseVersion: w.body.payout.version, ...data });
}
