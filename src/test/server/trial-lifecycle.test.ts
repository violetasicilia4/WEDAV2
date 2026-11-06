// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { draftFor, makeEnv, PASSWORD, saveDraft, signUp, type Client, type Env } from './helpers';
import { emptyState } from '@/lib/weda/logic';
import type { AppState } from '@/lib/weda/types';

/* PAY-07 (BR-63, BR-64, BR-01): trial de 14 días desde que se crea la celebración, pausa en solo lectura al vencer sin contratar, y contratar = publicar.
   Reloj controlado con `vi.setSystemTime`: nada depende de esperas reales. Las sesiones duran 30 días: después de saltos largos se vuelve a ingresar. */
const T0 = Date.parse('2026-11-04T12:00:00.000Z');
const DAY = 86_400_000;
afterEach(() => { vi.useRealTimers(); });
const at = (ms: number) => vi.setSystemTime(ms);
const clock = () => { vi.useFakeTimers({ toFake: ['Date'] }); at(T0); };
const put = async (c: Client, draft: AppState) => {
  const w = (await c.get('/api/wedding')).body;
  return c.put('/api/wedding', { baseRevision: w.revision, draft });
};
const access = async (c: Client) => (await c.get('/api/wedding')).body.access;
const login = async (c: Client, email: string) => expect((await c.post('/api/auth/login', { email, password: PASSWORD })).status).toBe(200);
const trialStart = async (env: Env, c: Client) => c.get('/api/wedding').then(async r => ((await env.svc.db.get('SELECT trial_started_at FROM weddings WHERE id = ?', r.body.id)) as { trial_started_at: string | null }).trial_started_at);

describe('trial de 14 días (sin compuerta de pago)', () => {
  let env: Env;
  beforeAll(async () => { env = await makeEnv(); });
  afterAll(() => env.close());

  it('CA-1/CA-2 · registrarse (sin tarjeta) no inicia el trial; crear la celebración sí, y lo guarda el servidor', async () => {
    clock();
    const c = env.client();
    const reg = await c.post('/api/auth/register', { email: 'trial1@correo.com', password: PASSWORD });  // solo correo y clave
    expect(reg.status).toBe(201);
    expect(await access(c)).toEqual({ state: 'trial', plan: null, trialEndsAt: null });
    expect(await trialStart(env, c)).toBeNull();
    at(T0 + 3 * DAY);                                                  // tarda en crear la celebración: el trial no corrió
    expect((await put(c, { ...emptyState(), onboarded: false })).status).toBe(200);
    expect(await trialStart(env, c)).toBeNull();                       // sin onboarding no hay celebración
    expect((await put(c, draftFor('Ana', 'Luis'))).status).toBe(200);
    expect(await trialStart(env, c)).toBe(new Date(T0 + 3 * DAY).toISOString());
    expect(await access(c)).toEqual({ state: 'trial', plan: null, trialEndsAt: new Date(T0 + 17 * DAY).toISOString() });
  });

  it('CA-3/CA-4 · dura exactamente 14 días y no se reinicia (login, otro dispositivo, editar, cambiar la fecha, volver a hacer el onboarding)', async () => {
    clock();
    const email = 'trial2@correo.com';
    const a = env.client(); await signUp(a, email);
    await saveDraft(a, draftFor('Bea', 'Tomás'));
    const start = await trialStart(env, a);
    expect(start).toBe(new Date(T0).toISOString());
    at(T0 + 5 * DAY);
    const b = env.client(); await login(b, email);                     // otro dispositivo
    expect((await put(b, draftFor('Bea', 'Tomás', { date: '2028-01-15' }))).status).toBe(200);   // cambia la fecha de la boda
    expect((await put(b, { ...draftFor('Bea', 'Tomás'), onboarded: true })).status).toBe(200);    // vuelve a guardar el onboarding
    expect(await trialStart(env, b)).toBe(start);
    at(T0 + 14 * DAY - 60_000);                                        // 13 días, 23 h, 59 min
    expect((await access(b)).state).toBe('trial');
    expect((await put(b, draftFor('Bea', 'Tomás', { site: { ...draftFor('Bea', 'Tomás').site, coverText: 'Último minuto' } }))).status).toBe(200);
    at(T0 + 14 * DAY);
    expect((await access(b)).state).toBe('paused');
  });

  it('CA-5 · durante el trial se edita todo (lista, sitio, datos), sin operar invitados ni mesas', async () => {
    clock();
    const c = env.client(); await signUp(c, 'trial3@correo.com');
    const d = draftFor('Cami', 'Lucas');
    expect((await put(c, { ...d, site: { ...d.site, coverText: 'Nos casamos', dressCode: { ...d.site.dressCode, enabled: true, title: 'Elegante' } } })).status).toBe(200);
    const w = (await c.get('/api/wedding')).body;
    const g = await c.put('/api/wedding', { baseRevision: w.revision, draft: w.draft, guests: { upsert: [{ id: 'inv-t3', first: 'Rosa', last: 'Gómez', status: 'pending', menu: '', groupId: null, source: 'manual' }] } });
    expect([g.status, g.body.error]).toEqual([403, 'feature_requires_plan']);
  });

  it('CA-7/CA-8/CA-9 · en pausa: guardar, cambiar el cobro y publicar → 403; se lee y no se borra nada, ni a los 15 meses', async () => {
    clock();
    const email = 'pausa@correo.com';
    const c = env.client(); await signUp(c, email);
    await saveDraft(c, draftFor('Lara', 'Mateo', { site: { ...draftFor('Lara', 'Mateo').site, coverText: 'Lo que armamos' } }));
    at(T0 + 14 * DAY + 1);
    const save = await put(c, draftFor('Lara', 'Mateo'));
    expect([save.status, save.body.error]).toEqual([403, 'trial_ended']);
    const w = (await c.get('/api/wedding')).body;
    const payout = await c.post('/api/wedding/payout', { currentPassword: PASSWORD, baseVersion: w.payout.version, alias: 'nuevo.alias.mp' });
    expect([payout.status, payout.body.error]).toEqual([403, 'trial_ended']);
    const pub = await c.post('/api/wedding/publish');
    expect([pub.status, pub.body.error]).toEqual([403, 'trial_ended']);
    at(T0 + 460 * DAY);                                                // 15 meses en pausa
    const later = env.client(); await login(later, email);
    const r = await later.get('/api/wedding');
    expect(r.status).toBe(200);
    expect(r.body.access.state).toBe('paused');
    expect(r.body.draft.site.coverText).toBe('Lo que armamos');
    expect(r.body.draft.gifts.items).toHaveLength(2);
    expect(r.body.publication).toBeNull();
  });
});

describe('contratar y publicar en un solo momento (con compuerta y pago de prueba)', () => {
  let env: Env;
  beforeAll(async () => { env = await makeEnv({ requirePaidOrder: true, payments: { provider: 'test', webhookSecret: 'secreto-webhook-de-prueba' } }); });
  afterAll(() => env.close());
  const counts = async () => (await env.svc.db.get('SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM payment_events) AS events'));

  it('CA-10/CA-12/CA-13 · con el trial vencido se contrata Celebración: el pago publica en el momento, sale de la pausa y la URL queda fija', async () => {
    clock();
    const c = env.client(); await signUp(c, 'contrata@correo.com');
    await saveDraft(c, draftFor('Ema', 'Leo'));
    at(T0 + 20 * DAY);
    const relog = env.client(); await login(relog, 'contrata@correo.com');
    expect((await access(relog)).state).toBe('paused');
    const ord = await relog.post('/api/checkout', { planId: 'invitacion' });  // contratar sigue disponible en pausa
    expect([ord.status, ord.body.amount]).toEqual([201, 140000]);
    expect((await relog.post('/api/wedding/publish')).body.error).toBe('trial_ended');   // sin pago, en pausa no se publica
    await relog.post(`/api/test-payments/${ord.body.id}`, { outcome: 'paid' });
    const w = (await relog.get('/api/wedding')).body;
    expect(w.access).toMatchObject({ state: 'active', plan: 'invitacion' });
    expect(w.publication).toMatchObject({ status: 'live', planId: 'invitacion', version: 1 });
    expect((await env.client().get(`/api/public/${w.slug}`)).status).toBe(200);
    const again = await relog.post('/api/wedding/publish');            // publicar cambios: misma URL
    expect([again.status, again.body.slug]).toEqual([200, w.slug]);
  });

  it('CA-10 · Regalos cobra 95.000 y al pagar publica solo la lista', async () => {
    clock();
    const c = env.client(); await signUp(c, 'regalos@correo.com');
    await saveDraft(c, draftFor('Ivo', 'Sol', { planId: 'regalos' }));
    const ord = (await c.post('/api/checkout', { planId: 'regalos' })).body;
    expect(ord.amount).toBe(95000);
    await c.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' });
    const w = (await c.get('/api/wedding')).body;
    expect(w.access).toMatchObject({ state: 'active', plan: 'regalos' });
    const pub = (await env.client().get(`/api/public/${w.slug}`)).body;
    expect(pub.site.blocks.rsvp).toBe(false);
    expect(pub.site.blocks.invitation).toBe(false);
  });

  it('F-P1 · con el borrador en Celebración, pagar Regalos deja Regalos como plan del borrador y de lo publicado: la invitación no queda incluida', async () => {
    clock();
    const c = env.client(); await signUp(c, 'regalos-unico@correo.com');
    await saveDraft(c, draftFor('Noa', 'Fede', { planId: 'invitacion' }));
    const ord = (await c.post('/api/checkout', { planId: 'regalos' })).body;
    await c.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' });
    const w = (await c.get('/api/wedding')).body;
    expect(w.access).toMatchObject({ state: 'active', plan: 'regalos' });
    expect([w.publication.planId, w.draft.planId]).toEqual(['regalos', 'regalos']);
    const pub = (await env.client().get(`/api/public/${w.slug}`)).body;
    expect([pub.site.blocks.invitation, pub.site.blocks.rsvp]).toEqual([false, false]);
  });

  it('CA-14 · si la publicación automática falla, la orden queda pagada; no opera; el reintento publica sin cobrar de nuevo', async () => {
    clock();
    const c = env.client(); await signUp(c, 'reintento7@correo.com');
    const d = draftFor('Uma', 'Teo');
    await saveDraft(c, d);
    // Se borran los nombres justo antes de pagar: la publicación automática falla por `incomplete`.
    await saveDraft(c, { ...d, couple: { first: '', second: '' } });
    const ord = (await c.post('/api/checkout', { planId: 'invitacion' })).body;
    const before = (await counts());
    await c.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' });
    expect((await c.get(`/api/orders/${ord.id}`)).body.status).toBe('paid');
    const w = (await c.get('/api/wedding')).body;
    expect(w.access.state).toBe('paid_unpublished');
    expect(w.publication).toBeNull();
    // F-P2: la falla queda registrada solo con su código.
    expect((await env.svc.db.get("SELECT props FROM funnel_events WHERE name = 'publication_failed' ORDER BY id DESC LIMIT 1"))).toEqual({ props: JSON.stringify({ reason: 'incomplete' }) });
    const after = (await counts()) as { orders: number; events: number };
    expect(after.orders).toBe((before as { orders: number }).orders);
    await saveDraft(c, d);
    const r = await c.post('/api/wedding/publish');
    expect([r.status, r.body.planId]).toEqual([200, 'invitacion']);
    expect((await counts())).toEqual(after);                                    // ni orden nueva ni otro evento de pago
    expect((await c.post('/api/checkout', { planId: 'invitacion' })).body.error).toBe('already_paid');
  });

  it('un evento de pago repetido no vuelve a publicar ni cobra', async () => {
    clock();
    const c = env.client(); await signUp(c, 'repetido@correo.com');
    await saveDraft(c, draftFor('Ada', 'Max'));
    const ord = (await c.post('/api/checkout', { planId: 'regalos' })).body;
    await c.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' });
    const v1 = (await c.get('/api/wedding')).body.publication.version;
    expect((await c.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' })).body).toMatchObject({ ignored: true });
    expect((await c.get('/api/wedding')).body.publication.version).toBe(v1);
  });
});
