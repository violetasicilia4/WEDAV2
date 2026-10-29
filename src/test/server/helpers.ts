/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API, sin esquema compartido todavía */
// Fixtures de integración: base SQLite REAL en un directorio temporal (nunca datos de producción) y llamadas por la misma
// función que usa el servidor (handleApi), con cookies como un navegador.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handleApi } from '@/server/api';
import type { ServerConfig } from '@/server/config';
import { openDb } from '@/server/db';
import { Service } from '@/server/service';
import { emptyState } from '@/lib/weda/logic';
import type { AppState } from '@/lib/weda/types';

export type Env = { svc: Service; cfg: ServerConfig; dir: string; client: (name?: string) => Client; close: () => void };
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

export function makeEnv(over: Partial<ServerConfig> = {}): Env {
  const dir = mkdtempSync(path.join(tmpdir(), 'weda-test-'));
  const cfg: ServerConfig = { dbPath: path.join(dir, 'test.db'), dataDir: dir, cookieSecure: false, requirePaidOrder: false, allowedOrigins: [],
    mail: { from: 'Weda <hola@weda.app>', replyTo: 'hola@weda.app', testOutbox: [] }, publicUrl: 'https://weda.test', secret: 'secreto-de-prueba',
    payments: { provider: 'none', webhookSecret: 'secreto-webhook-de-prueba' }, ...over };
  const svc = new Service(openDb(cfg.dbPath), cfg);
  const env: Env = { svc, cfg, dir, client: () => new Client(env), close: () => { svc.db.close(); rmSync(dir, { recursive: true, force: true }); } };
  return env;
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

export const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
