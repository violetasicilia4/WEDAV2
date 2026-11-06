// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { draftFor, makeEnv, PASSWORD, PNG, saveDraft, signUp, type Client, type Env } from './helpers';

/* Permanencia (PAY-07, BR-65): lo publicado no vence. Reemplaza las pruebas del vencimiento a 12 meses (regla anterior a D-06).
   Reloj controlado (`vi.setSystemTime`): nada depende de esperas reales. Las sesiones duran 30 días, así que después de saltar meses se vuelve a ingresar. */
let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());
afterEach(() => { vi.useRealTimers(); });

const T0 = Date.parse('2026-11-04T12:00:00.000Z');
const months = (n: number) => new Date(T0 + n * 30.5 * 86_400_000);
const guest = (id: string) => ({ id, first: 'Rosa', last: 'Gómez', status: 'pending', menu: '', groupId: null, source: 'manual' });
const gift = (key: string) => ({ idempotencyKey: `key-${key}-0001`, manageToken: `token-del-invitado-${key}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') } });
const login = async (c: Client, email: string) => expect((await c.post('/api/auth/login', { email, password: PASSWORD })).status).toBe(200);

describe('permanencia de lo publicado (sin vencimiento)', () => {
  it('publicada con Celebración, sigue pública, editable y operable a los 6, 12 y 15 meses, con la misma URL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(T0);
    const email = 'permanente@correo.com';
    const o = env.client(); await signUp(o, email);
    const d = draftFor('Lara', 'Mateo');
    await saveDraft(o, d);
    const slug = (await o.post('/api/wedding/publish')).body.slug as string;
    expect(((await env.svc.db.get('SELECT expires_at FROM publications WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)', slug)) as { expires_at: string | null }).expires_at).toBeNull();

    for (const m of [6, 12, 15]) {
      vi.setSystemTime(months(m));
      const c = env.client(); await login(c, email);
      const w = (await c.get('/api/wedding')).body;
      expect(w.access.state, `activa a los ${m} meses`).toBe('active');
      // Página, confirmación y regalos públicos.
      const pub = await env.client().get(`/api/public/${slug}`);
      expect(pub.status, `pública a los ${m} meses`).toBe(200);
      expect((await env.client().post(`/api/public/${slug}/rsvp`, { people: [{ first: `Ana${m}`, last: 'Paz', attending: true, menu: '' }] })).status).toBe(200);
      const g = await env.client().post(`/api/public/${slug}/contributions`, gift(`perm${m}`));
      expect(g.status).toBe(201);
      // Editar, operar y publicar los cambios.
      const fresh = (await c.get('/api/wedding')).body;
      const edit = await c.put('/api/wedding', { baseRevision: fresh.revision, draft: { ...fresh.draft, site: { ...fresh.draft.site, coverText: `Mes ${m}` } }, guests: { upsert: [guest(`inv-m${m}`)] } });
      expect(edit.status, `editable y operable a los ${m} meses`).toBe(200);
      expect((await c.patch(`/api/contributions/${g.body.id}`, { status: 'confirmed' })).status).toBe(200);
      const again = await c.post('/api/wedding/publish');
      expect([again.status, again.body.slug]).toEqual([200, slug]);   // la URL no cambia
    }
  });

  it('una publicación con un vencimiento guardado por la regla vieja (ya pasado) sigue activa: `expires_at` es solo historia', async () => {
    const o = env.client(); await signUp(o, 'historia@correo.com');
    await saveDraft(o, draftFor('Ivo', 'Sol'));
    const slug = (await o.post('/api/wedding/publish')).body.slug as string;
    (await env.svc.db.run('UPDATE publications SET expires_at = ?, published_at = ? WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)', '2021-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', slug));
    expect((await env.client().get(`/api/public/${slug}`)).status).toBe(200);
    expect((await o.post('/api/wedding/publish')).status).toBe(200);
    expect((await o.get('/api/wedding')).body.access.state).toBe('active');
  });

  it('bajar la página y volver a publicarla mantiene la misma URL, aunque pasen meses', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(T0);
    const email = 'baja@correo.com';
    const o = env.client(); await signUp(o, email);
    await saveDraft(o, draftFor('Uma', 'Teo'));
    const slug = (await o.post('/api/wedding/publish')).body.slug as string;
    expect((await o.post('/api/wedding/unpublish')).status).toBe(200);
    expect((await env.client().get(`/api/public/${slug}`)).status).toBe(410);  // dada de baja por la pareja, no por tiempo
    vi.setSystemTime(months(14));
    const c = env.client(); await login(c, email);
    const r = await c.post('/api/wedding/publish');
    expect([r.status, r.body.slug]).toEqual([200, slug]);
    expect((await env.client().get(`/api/public/${slug}`)).status).toBe(200);
  });
});
