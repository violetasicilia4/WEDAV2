// @vitest-environment node
// Aviso «cambios sin publicar» (DASH-04): el servidor compara lo que publicaría ahora con la página pública, al leer y al guardar el casamiento.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, saveDraft, signUp, type Env } from './helpers';

let env: Env;
beforeEach(() => { env = makeEnv(); });
afterEach(() => env.close());

const pendingOf = async (c: ReturnType<Env['client']>) => (await c.get('/api/wedding')).body.publication?.pendingChanges;

describe('cambios sin publicar', () => {
  it('sin publicación no hay nada que comparar', async () => {
    const c = env.client(); await signUp(c, 'sinpub@correo.com');
    expect((await saveDraft(c, draftFor('Ana', 'Leo'))).pendingChanges).toBeNull();
    expect((await c.get('/api/wedding')).body.publication).toBeNull();
  });

  it('se enciende al guardar algo que se ve en la página y se apaga al publicar', async () => {
    const c = env.client(); await signUp(c, 'pareja@correo.com');
    const base = draftFor('Ana', 'Leo');
    await saveDraft(c, base);
    await c.post('/api/wedding/publish');
    expect(await pendingOf(c)).toBe(false);
    expect((await saveDraft(c, base)).pendingChanges).toBe(false); // guardar lo mismo no es un cambio

    const edited = { ...base, site: { ...base.site, coverText: 'Nos casamos en la playa' } };
    expect((await saveDraft(c, edited)).pendingChanges).toBe(true);
    expect(await pendingOf(c)).toBe(true); // también al volver a abrir el panel

    expect((await c.post('/api/wedding/publish')).status).toBe(200);
    expect(await pendingOf(c)).toBe(false);
    expect((await env.client().get('/api/public/ana-y-leo')).body.site.coverText).toBe('Nos casamos en la playa');
  });

  it('lo que el invitado no ve (la lista de invitados) no genera aviso; cambiar de plan sí', async () => {
    const c = env.client(); await signUp(c, 'otra@correo.com');
    const base = draftFor('Eva', 'Juan');
    await saveDraft(c, base);
    await c.post('/api/wedding/publish');
    const r = await saveDraft(c, base, { upsert: [{ id: 'inv-1', first: 'Rosa', last: 'Gómez', status: 'confirmed', menu: '', groupId: null, source: 'manual' }] });
    expect(r.pendingChanges).toBe(false);
    expect((await saveDraft(c, { ...base, planId: 'regalos' })).pendingChanges).toBe(true);
  });

  it('cada pareja ve solo el estado de su propia página', async () => {
    const a = env.client(), b = env.client();
    await signUp(a, 'a@correo.com'); await signUp(b, 'b@correo.com');
    await saveDraft(a, draftFor('Ana', 'Leo')); await a.post('/api/wedding/publish');
    await saveDraft(b, draftFor('Eva', 'Juan')); await b.post('/api/wedding/publish');
    const base = draftFor('Ana', 'Leo');
    await saveDraft(a, { ...base, site: { ...base.site, coverText: 'Cambio de A' } });
    expect(await pendingOf(a)).toBe(true);
    expect(await pendingOf(b)).toBe(false);
  });
});
