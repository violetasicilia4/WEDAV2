// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, saveDraft, signUp, type Env } from './helpers';
import { signedTestNotification } from '@/server/payments';
import { planById } from '@/lib/weda/plans';

/* Pagos con el adaptador de PRUEBA (nunca cobra). Lo que se verifica no depende del proveedor: monto del servidor, idempotencia,
   firma, que la vuelta del navegador no cuente como pago y que publicar exija un pago confirmado. */
let env: Env;
beforeAll(() => { env = makeEnv({ requirePaidOrder: true, payments: { provider: 'test', webhookSecret: 'secreto-webhook-de-prueba' } }); });
afterAll(() => env.close());

const notify = (c: ReturnType<Env['client']>, n: { eventId: string; orderId: string; outcome: 'paid' | 'failed' | 'cancelled' }, signature?: string) => {
  const s = signedTestNotification(env.cfg, n);
  return c.post('/api/webhooks/payments/test', new TextEncoder().encode(s.body), { 'x-weda-signature': signature ?? s.signature, 'content-type': 'application/json' });
};

describe('pagos y publicación', () => {
  it('sin pago confirmado no se publica; el monto lo pone el servidor y un doble clic reusa la orden', async () => {
    const o = env.client(); await signUp(o, 'paga@correo.com');
    await saveDraft(o, draftFor('Ana', 'Leo'));
    expect((await o.get('/api/payments')).body).toEqual({ payments: true, paidPlan: null });
    expect((await o.post('/api/wedding/publish')).body.error).toBe('payment_required');
    const a = await o.post('/api/checkout', { planId: 'invitacion', amount: 1 });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ planId: 'invitacion', amount: planById('invitacion')!.price, status: 'pending' });
    expect(a.body.checkoutUrl).toBe(`/pago-de-prueba?orden=${a.body.id}`);
    const b = await o.post('/api/checkout', { planId: 'invitacion' });
    expect(b.body.id).toBe(a.body.id);                                                    // doble clic o recarga: misma orden
    expect((await o.get(`/api/orders/${a.body.id}`)).body.status).toBe('pending');        // volver del proveedor no es pago
    expect((await o.post('/api/wedding/publish')).body.error).toBe('payment_required');
  });

  it('una notificación con firma inválida no cambia nada; una válida aprueba; repetida no se procesa dos veces', async () => {
    const o = env.client(); await signUp(o, 'firma@correo.com');
    await saveDraft(o, draftFor('Bea', 'Ciro'));
    const ord = (await o.post('/api/checkout', { planId: 'regalos' })).body;
    const anon = env.client();
    expect((await notify(anon, { eventId: 'evt-1', orderId: ord.id, outcome: 'paid' }, 'firma-falsa')).status).toBe(401);
    expect((await o.get(`/api/orders/${ord.id}`)).body.status).toBe('pending');
    expect((await notify(anon, { eventId: 'evt-2', orderId: ord.id, outcome: 'paid' })).body).toMatchObject({ duplicate: false, status: 'paid' });
    expect((await notify(anon, { eventId: 'evt-2', orderId: ord.id, outcome: 'paid' })).body).toMatchObject({ duplicate: true });
    // Un evento posterior contradictorio no «despaga» una orden ya cerrada.
    expect((await notify(anon, { eventId: 'evt-3', orderId: ord.id, outcome: 'failed' })).body).toMatchObject({ ignored: true, status: 'paid' });
    expect((await o.get(`/api/orders/${ord.id}`)).body.status).toBe('paid');
    const pub = await o.post('/api/wedding/publish');
    expect(pub.status).toBe(200);
    expect(pub.body.slug).toMatch(/^bea-y-ciro/);
    expect(pub.body.planId).toBe('regalos');
  });

  it('pago rechazado o cancelado: no habilita publicar y se puede volver a intentar con una orden nueva', async () => {
    const o = env.client(); await signUp(o, 'rechazo@correo.com');
    await saveDraft(o, draftFor('Dani', 'Eva'));
    const first = (await o.post('/api/checkout', { planId: 'invitacion' })).body;
    expect((await o.post(`/api/test-payments/${first.id}`, { outcome: 'failed' })).body).toMatchObject({ status: 'failed' });
    expect((await o.post('/api/wedding/publish')).body.error).toBe('payment_required');
    const second = (await o.post('/api/checkout', { planId: 'invitacion' })).body;
    expect(second.id).not.toBe(first.id);
    expect((await o.post(`/api/test-payments/${second.id}`, { outcome: 'cancelled' })).body).toMatchObject({ status: 'cancelled' });
    const third = (await o.post('/api/checkout', { planId: 'invitacion' })).body;
    await o.post(`/api/test-payments/${third.id}`, { outcome: 'paid' });
    expect((await o.post('/api/wedding/publish')).status).toBe(200);
  });

  it('mejorar de plan cobra solo la diferencia; no se puede «pagar» un plan igual o menor', async () => {
    const o = env.client(); await signUp(o, 'mejora@correo.com');
    await saveDraft(o, draftFor('Flor', 'Gus'));
    const r = (await o.post('/api/checkout', { planId: 'regalos' })).body;
    await o.post(`/api/test-payments/${r.id}`, { outcome: 'paid' });
    const up = (await o.post('/api/checkout', { planId: 'completo' })).body;
    expect(up.amount).toBe(planById('completo')!.price - planById('regalos')!.price);
    expect((await o.post('/api/checkout', { planId: 'regalos' })).body.error).toBe('already_paid');
    await o.post(`/api/test-payments/${up.id}`, { outcome: 'paid' });
    expect((await o.get('/api/payments')).body.paidPlan).toBe('completo');
    expect((await o.post('/api/wedding/publish')).body.planId).toBe('completo');
  });

  it('otra pareja no ve ni completa órdenes ajenas', async () => {
    const o = env.client(); await signUp(o, 'duena@correo.com');
    await saveDraft(o, draftFor('Hugo', 'Ines'));
    const ord = (await o.post('/api/checkout', { planId: 'regalos' })).body;
    const x = env.client(); await signUp(x, 'ajena2@correo.com');
    expect((await x.get(`/api/orders/${ord.id}`)).status).toBe(404);
    expect((await x.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' })).status).toBe(404);
    expect((await o.get(`/api/orders/${ord.id}`)).body.status).toBe('pending');
  });
});

describe('sin proveedor de pagos', () => {
  let plain: Env;
  beforeAll(() => { plain = makeEnv(); });
  afterAll(() => plain.close());
  it('el checkout responde «no configurado» y la página de prueba no existe', async () => {
    const o = plain.client(); await signUp(o, 'sinpagos@correo.com');
    await saveDraft(o, draftFor('Juan', 'Kim'));
    expect((await o.get('/api/payments')).body).toEqual({ payments: false, paidPlan: null });
    expect((await o.post('/api/checkout', { planId: 'regalos' })).status).toBe(501);
    const ord = (await o.post('/api/orders', { planId: 'regalos' })).body;
    expect((await o.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' })).status).toBe(404);
    expect((await o.post('/api/webhooks/payments/test', new TextEncoder().encode('{}'), { 'content-type': 'application/json' })).status).toBe(404);
  });
});
