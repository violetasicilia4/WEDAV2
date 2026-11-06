// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleApi } from '@/server/api';
import { draftFor, makeEnv, signUp, type Env } from './helpers';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
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
    await env.svc.db.run("UPDATE auth.sessions SET not_after = now() - interval '1 day' WHERE user_id = ?", await env.svc.accounts.idByEmail('vence@correo.com'));
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



  it('sin base de datos disponible solo falla la API (503); el resto del sitio ni la toca', async () => {
    const broken = { ...env.cfg, supabase: undefined };
    // Rutas que no son de la API: no abre la base (regresión: antes se abría en cada pedido y el sitio entero fallaba sin base).
    expect(await handleApi(new Request('http://weda.test/'), broken)).toBeNull();
    expect(await handleApi(new Request('http://weda.test/ejemplo'), broken)).toBeNull();
    const r = await handleApi(new Request('http://weda.test/api/me'), broken);
    expect(r!.status).toBe(503);
    expect((await r!.json()).error).toBe('backend_unavailable');
  });
});
