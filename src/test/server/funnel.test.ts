// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, saveDraft, signUp, type Env } from './helpers';

/* Embudo mínimo: lo que prueba algo lo registra el servidor; el navegador solo puede mandar eventos de su lista y sin datos personales. */
let env: Env;
beforeAll(() => { env = makeEnv({ requirePaidOrder: true, payments: { provider: 'test', webhookSecret: 'secreto-webhook-de-prueba' } }); });
afterAll(() => env.close());
const events = (name: string) => env.svc.db.prepare('SELECT source, props FROM funnel_events WHERE name = ?').all(name) as { source: string; props: string }[];

describe('embudo', () => {
  it('registro, pago confirmado (solo por la notificación), publicación y apertura de la invitación los registra el servidor', async () => {
    const o = env.client(); await signUp(o, 'embudo@correo.com');
    expect(events('signup_completed').length).toBeGreaterThanOrEqual(1);
    await saveDraft(o, draftFor('Rita', 'Sol'));
    const ord = (await o.post('/api/checkout', { planId: 'regalos' })).body;
    expect(events('payment_confirmed')).toHaveLength(0);                                   // empezar a pagar no es pago
    await o.post(`/api/test-payments/${ord.id}`, { outcome: 'paid' });
    expect(events('payment_confirmed')).toEqual([{ source: 'server', props: '{"plan_id":"regalos"}' }]);
    const slug = (await o.post('/api/wedding/publish')).body.slug;
    expect(events('publication_completed').at(-1)).toEqual({ source: 'server', props: '{"plan_id":"regalos","is_republish":false}' });
    await env.client().get(`/api/public/${slug}`);
    expect(events('public_invitation_opened').length).toBeGreaterThanOrEqual(1);
  });

  it('el navegador no puede mandar «pago confirmado» ni otro evento fuera de su lista; los datos personales se descartan', async () => {
    const g = env.client();
    expect((await g.post('/api/events', { name: 'payment_confirmed' })).body.error).toBe('unknown_event');
    expect((await g.post('/api/events', { name: 'publication_completed' })).body.error).toBe('unknown_event');
    expect((await g.post('/api/events', { name: 'plan_selected', props: { plan_id: 'completo', email: 'a@b.com', name: 'Ana' } })).status).toBe(200);
    expect(events('plan_selected').at(-1)).toEqual({ source: 'client', props: '{"plan_id":"completo"}' });
  });
});
