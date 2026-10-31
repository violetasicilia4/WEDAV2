// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleApi } from '@/server/api';
import { openDb } from '@/server/db';
import { draftFor, makeEnv, signUp, type Env } from './helpers';

let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());

describe('endurecimiento de la API', () => {
  it('las respuestas de la API no se indexan ni se guardan en caché', async () => {
    const r = await env.client().get('/api/health');
    expect(r.headers.get('x-robots-tag')).toContain('noindex');
    expect(r.headers.get('cache-control')).toBe('no-store');
  });

  it('una sesión vencida deja de valer', async () => {
    const c = env.client(); await signUp(c, 'vence@correo.com');
    expect((await c.get('/api/wedding')).status).toBe(200);
    env.svc.db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect((await c.get('/api/wedding')).status).toBe(401);
  });

  it('exige JSON en las escrituras y rechaza cuerpos inválidos', async () => {
    const c = env.client(); await signUp(c, 'json@correo.com');
    const raw = await c.call('PUT', '/api/wedding', new Uint8Array([1, 2, 3]));
    expect(raw.status).toBe(415);
    const bad = await (async () => {
      const { handleApi } = await import('@/server/api');
      return handleApi(new Request('http://weda.test/api/wedding', { method: 'PUT', headers: { 'content-type': 'application/json', cookie: c.cookie }, body: '{no es json' }), env.cfg, env.svc);
    })();
    expect(bad!.status).toBe(400);
  });

  it('un borrador demasiado grande se rechaza sin tocar lo guardado', async () => {
    const c = env.client(); await signUp(c, 'grande@correo.com');
    const w = (await c.get('/api/wedding')).body;
    const huge = draftFor('Ana', 'Luis', { gifts: { ...draftFor('a', 'b').gifts, cover: 'x'.repeat(7 * 1024 * 1024) } });
    const r = await c.put('/api/wedding', { baseRevision: w.revision, draft: huge });
    expect([413, 400]).toContain(r.status);
    expect((await c.get('/api/wedding')).body.revision).toBe(w.revision);
  });

  it('las migraciones son idempotentes: reabrir la base conserva los datos', async () => {
    const c = env.client(); await signUp(c, 'migra@correo.com');
    const again = openDb(env.cfg.dbPath);
    const n = again.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'migra@correo.com'").get() as { n: number };
    expect(n.n).toBe(1);
    expect((again.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(7);
    again.close();
  });

  it('no deja claves ni tokens legibles en la base', () => {
    const rows = env.svc.db.prepare('SELECT id FROM sessions').all() as { id: string }[];
    expect(rows.every(r => /^[0-9a-f]{64}$/.test(r.id))).toBe(true);
  });

  it('sin base de datos disponible solo falla la API (503); el resto del sitio ni la toca', async () => {
    const broken = { ...env.cfg, dbPath: '/etc/hostname/no-se-puede/weda.db', dataDir: '/etc/hostname/no-se-puede' };
    // Rutas que no son de la API: no abre la base (regresión: antes se abría en cada pedido y el sitio entero fallaba en un hosting sin disco).
    expect(await handleApi(new Request('http://weda.test/'), broken)).toBeNull();
    expect(await handleApi(new Request('http://weda.test/ejemplo'), broken)).toBeNull();
    const r = await handleApi(new Request('http://weda.test/api/me'), broken);
    expect(r!.status).toBe(503);
    expect((await r!.json()).error).toBe('backend_unavailable');
  });
});
