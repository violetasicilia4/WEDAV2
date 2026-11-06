// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PNG, publishWith, saveDraft, signUp, type Client, type Env } from './helpers';
import { planById } from '@/lib/weda/plans';
import type { AppState } from '@/lib/weda/types';

/* PAY-01 (BR-62, D-02, D-05): el plan define qué se publica y qué se OPERA; ver y editar contenido son libres. El servidor rechaza las
   operaciones aunque se llamen directo a la API, según el plan PUBLICADO y vigente; el plan del borrador nunca cuenta. */

const guest = (id: string) => ({ id, first: 'Rosa', last: 'Gómez', status: 'pending', menu: '', groupId: null, source: 'manual' });
const withTable = (d: AppState): AppState => ({ ...d, groups: [...d.groups, { id: 'grp-2', name: 'Mesa 2' }] });
const put = async (c: Client, draft: AppState, guests?: unknown) => {
  const w = (await c.get('/api/wedding')).body;
  return c.put('/api/wedding', { baseRevision: w.revision, draft, ...(guests ? { guests } : {}) });
};
const contribution = (key: string) => ({ idempotencyKey: `key-${key}-0001`, manageToken: `token-del-invitado-${key}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') } });

describe('sin compuerta de pago (desarrollo y pruebas): opera lo publicado', () => {
  let env: Env;
  beforeAll(async () => { env = await makeEnv(); });
  afterAll(() => env.close());

  it('CA-2 · sin publicar: el contenido se guarda; invitados y mesas → 403; el plan del borrador no cuenta (CA-6)', async () => {
    const o = env.client(); await signUp(o, 'trial@correo.com');
    const d = draftFor('Ana', 'Luis', { planId: 'invitacion' });
    const ok = await put(o, { ...d, site: { ...d.site, message: { ...d.site.message, enabled: true, text: 'Gracias' } } });
    expect(ok.status).toBe(200);
    expect(ok.body.access).toMatchObject({ state: 'trial', plan: null });                // el trial de 14 días ya empezó (PAY-07, BR-63)
    expect(typeof ok.body.access.trialEndsAt).toBe('string');
    const g = await put(o, d, { upsert: [guest('inv-1')] });
    expect([g.status, g.body.error, g.body.detail]).toEqual([403, 'feature_requires_plan', 'guests:invitacion']);
    expect((await put(o, d, { remove: ['inv-1'] })).status).toBe(403);
    expect((await put(o, withTable(d))).body.error).toBe('feature_requires_plan');
    const w = (await o.get('/api/wedding')).body;
    expect(w.guests).toEqual([]);                                                      // todo o nada: el rechazo no escribe
    expect(w.draft.site.message.text).toBe('Gracias');
    expect(w.draft.groups.map((x: { id: string }) => x.id)).not.toContain('grp-2');
  });

  it('CA-3 · Regalos publicado: invitados y mesas → 403; el RSVP público → 409; un aporte se recibe y se revisa', async () => {
    const o = env.client(); await signUp(o, 'regalos@correo.com');
    const d = draftFor('Bea', 'Tomás', { planId: 'regalos' });
    const slug = (await publishWith(o, d)).slug;
    expect((await o.get('/api/wedding')).body.access).toMatchObject({ state: 'active', plan: 'regalos' });
    expect((await put(o, d, { upsert: [guest('inv-2')] })).status).toBe(403);
    expect((await put(o, withTable(d))).status).toBe(403);
    const anon = env.client();
    expect((await anon.post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Ana', last: 'Paz', attending: true, menu: '' }] })).body.error).toBe('rsvp_disabled');
    const c = await anon.post(`/api/public/${slug}/contributions`, contribution('reg'));
    expect(c.status).toBe(201);
    expect((await o.patch(`/api/contributions/${c.body.id}`, { status: 'confirmed' })).status).toBe(200);
  });

  it('CA-4 · Celebración publicado: invitados (también varios a la vez, como al importar), mesas, asignaciones y RSVP → 200', async () => {
    const o = env.client(); await signUp(o, 'celebra@correo.com');
    const d = draftFor('Cami', 'Lucas');
    const slug = (await publishWith(o, d)).slug;
    expect((await put(o, d, { upsert: [guest('inv-3'), guest('inv-4')] })).status).toBe(200);
    expect((await put(o, withTable(d))).status).toBe(200);
    expect((await put(o, withTable(d), { upsert: [{ ...guest('inv-3'), groupId: 'grp-2' }] })).status).toBe(200);
    expect((await env.client().post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Ana', last: 'Paz', attending: true, menu: '' }] })).status).toBe(200);
  });

  it('CA-5 (reemplazado por PAY-07, BR-65) · lo publicado no vence: con un `expires_at` viejo ya pasado sigue activo y opera', async () => {
    const o = env.client(); await signUp(o, 'vencido@correo.com');
    const d = draftFor('Lara', 'Mateo');
    const slug = (await publishWith(o, d)).slug;
    const c = await env.client().post(`/api/public/${slug}/contributions`, contribution('venc'));
    // Un vencimiento guardado con la regla vieja (12 meses) ya pasado: queda como historia y no se lee.
    (await env.svc.db.run('UPDATE publications SET expires_at = ? WHERE wedding_id = (SELECT id FROM weddings WHERE slug = ?)', new Date(Date.now() - 1).toISOString(), slug));
    const w = await o.get('/api/wedding');
    expect([w.status, w.body.access.state]).toEqual([200, 'active']);
    expect((await env.client().get(`/api/public/${slug}`)).status).toBe(200);
    expect((await put(o, d, { upsert: [guest('inv-5')] })).status).toBe(200);
    expect((await put(o, withTable(d))).status).toBe(200);
    expect((await o.patch(`/api/contributions/${c.body.id}`, { status: 'rejected' })).status).toBe(200);
    expect((await o.post('/api/wedding/publish')).status).toBe(200);
  });

  it('F8 · una página publicada no cambia de plan: volver a publicar con otro plan → 409', async () => {
    const o = env.client(); await signUp(o, 'cambio@correo.com');
    await publishWith(o, draftFor('Flor', 'Gus', { planId: 'regalos' }));
    await saveDraft(o, draftFor('Flor', 'Gus', { planId: 'invitacion' }));
    expect((await o.post('/api/wedding/publish')).body.error).toBe('plan_change_pending');
    expect((await o.get('/api/wedding')).body.publication.planId).toBe('regalos');
  });
});

describe('con compuerta de pago: pagar sin publicar no habilita nada (DP-25)', () => {
  let env: Env;
  beforeAll(async () => { env = await makeEnv({ requirePaidOrder: true, payments: { provider: 'test', webhookSecret: 'secreto-webhook-de-prueba' } }); });
  afterAll(() => env.close());
  const pay = async (o: Client, planId: string) => {
    const r = (await o.post('/api/checkout', { planId })).body;
    await o.post(`/api/test-payments/${r.id}`, { outcome: 'paid' });
    return r;
  };
  const counts = async () => (await env.svc.db.get('SELECT (SELECT count(*) FROM orders) AS orders, (SELECT count(*) FROM payment_events) AS events'));

  it('CA-15 · Celebración pagada y sin publicar (la publicación automática falló): invitados y mesas → 403', async () => {
    const o = env.client(); await signUp(o, 'pagado@correo.com');
    const d = draftFor('Ema', 'Leo');
    await saveDraft(o, { ...d, couple: { first: '', second: '' } });       // sin nombres, la publicación al pagar falla (PAY-07 F4)
    await pay(o, 'invitacion');
    expect((await o.get('/api/wedding')).body.access).toMatchObject({ state: 'paid_unpublished', plan: null });
    expect((await put(o, d, { upsert: [guest('inv-6')] })).status).toBe(403);
    expect((await put(o, withTable(d))).status).toBe(403);
  });

  it('CA-16 · pago confirmado y publicación fallida: no opera; el reintento publica con el mismo pago y la orden se conserva', async () => {
    const o = env.client(); await signUp(o, 'reintento@correo.com');
    const d = draftFor('Uma', 'Teo');
    await saveDraft(o, { ...d, couple: { first: '', second: '' } });
    const order = await pay(o, 'invitacion');
    const paidAt = (await o.get(`/api/orders/${order.id}`)).body.paidAt;
    const before = (await counts());
    expect((await o.post('/api/wedding/publish')).body.error).toBe('incomplete');
    expect((await put(o, d, { upsert: [guest('inv-7')] })).status).toBe(403);
    await saveDraft(o, d);
    const p = await o.post('/api/wedding/publish');
    expect([p.status, p.body.planId]).toEqual([200, 'invitacion']);
    expect((await counts())).toEqual(before);                                                   // ni orden nueva ni otro evento de pago
    expect((await o.get(`/api/orders/${order.id}`)).body).toMatchObject({ status: 'paid', paidAt });
    expect((await o.post('/api/checkout', { planId: 'invitacion' })).body.error).toBe('already_paid');
    expect((await put(o, d, { upsert: [guest('inv-7')] })).status).toBe(200);
  });

  it('CA-10 · el primer checkout cobra el precio del plan', async () => {
    const o = env.client(); await signUp(o, 'precio@correo.com');
    await saveDraft(o, draftFor('Ivo', 'Sol'));
    expect((await o.post('/api/checkout', { planId: 'regalos' })).body.amount).toBe(95000);
    const x = env.client(); await signUp(x, 'precio2@correo.com');
    await saveDraft(x, draftFor('Ada', 'Max'));
    expect((await x.post('/api/checkout', { planId: 'invitacion' })).body.amount).toBe(140000);
    expect(planById('invitacion')!.price).toBe(140000);
  });

  it('CA-12 · una orden histórica de Celebración Plus (`completo`) habilita Celebración y conserva su monto; su `expires_at` queda como historia', async () => {
    const o = env.client(); await signUp(o, 'plus@correo.com');
    const d = draftFor('Nina', 'Raúl');
    await saveDraft(o, d);
    const wid = (await o.get('/api/wedding')).body.id as string;
    const t = new Date().toISOString(), until = new Date(Date.now() + 86_400_000 * 100).toISOString();
    (await env.svc.db.run("INSERT INTO orders (id,wedding_id,plan_id,amount,status,provider,created_at,updated_at,paid_at) VALUES ('ord_plus',?,'completo',150000,'paid','test',?,?,?)", wid, t, t, t));
    (await env.svc.db.run("UPDATE weddings SET slug = 'nina-y-raul' WHERE id = ?", wid));
    (await env.svc.db.run("INSERT INTO publications (wedding_id,status,plan_id,snapshot,version,published_at,updated_at,expires_at) VALUES (?,'live','completo','{}',1,?,?,?)", wid, t, t, until));
    expect((await o.get('/api/wedding')).body.access).toMatchObject({ state: 'active', plan: 'invitacion' });
    expect((await put(o, d, { upsert: [guest('inv-8')] })).status).toBe(200);
    expect((await o.post('/api/checkout', { planId: 'invitacion' })).body.error).toBe('already_paid');
    expect((await o.post('/api/wedding/publish')).status).toBe(200);
    expect((await env.svc.db.get("SELECT amount FROM orders WHERE id = 'ord_plus'"))).toEqual({ amount: 150000 });
    expect(((await env.svc.db.get('SELECT expires_at FROM publications WHERE wedding_id = ?', wid)) as { expires_at: string }).expires_at).toBe(until);
  });
});
