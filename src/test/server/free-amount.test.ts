/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API */
// GIFT-09 · Aporte de importe libre (specs/GIFT-09-aporte-libre): lo habilita lo PUBLICADO, el monto es el único importe que viene del cliente,
// se valida contra el mínimo publicado y el máximo, un renglón libre por aporte, sin duplicar al reintentar, y la migración 8 conserva los aportes.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PNG, publishWith, saveDraft, signUp, type Env } from './helpers';
import type { AppState } from '@/lib/weda/types';

let env: Env;
beforeAll(async () => { env = await makeEnv(); });
afterAll(() => env.close());

const withFree = (d: AppState, enabled: boolean, min: number | null = null): AppState => ({ ...d, gifts: { ...d.gifts, freeAmount: { enabled, min } } });
let n = 0;
const body = (over: Record<string, unknown> = {}) => {
  n += 1;
  return { idempotencyKey: `key-libre-${n}`, manageToken: `token-del-invitado-libre-${n}`, giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '', how: 'alias', giftIds: [], receipt: { data: Buffer.from(PNG).toString('base64') }, ...over };
};

async function couple(email: string, draft: AppState) {
  const o = env.client(); await signUp(o, email);
  const pub = await publishWith(o, draft);
  return { o, slug: pub.slug as string };
}

describe('aporte libre', () => {
  it('apagado en lo publicado: 409 free_amount_disabled (CA-1, CA-6)', async () => {
    const { slug } = await couple('libre-off@correo.com', draftFor('Ana', 'Luis'));
    const r = await env.client().post(`/api/public/${slug}/contributions`, body({ freeAmount: 50000 }));
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('free_amount_disabled');
  });

  it('rechaza montos fuera de regla: bajo el mínimo publicado, decimal, negativo o sobre el máximo (CA-6)', async () => {
    const { slug } = await couple('libre-min@correo.com', withFree(draftFor('Eva', 'Juan'), true, 20000));
    const g = env.client();
    for (const bad of [19999, 20000.5, -5, 0, 100_000_001, '30000']) {
      const r = await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: bad }));
      expect(r.status, String(bad)).toBe(400);
      expect(r.body.error).toBe('invalid_free_amount');
    }
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 20000 }))).status).toBe(201);
  });

  it('sin mínimo propio, el mínimo es $ 1.000', async () => {
    const { slug } = await couple('libre-base@correo.com', withFree(draftFor('Sol', 'Leo'), true));
    const g = env.client();
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 999 }))).status).toBe(400);
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 1000 }))).status).toBe(201);
  });

  it('un aporte solo libre se acepta: total igual al monto, renglón libre y pendiente de revisión; sin comprobante, no (CA-4, CA-10)', async () => {
    const { o, slug } = await couple('libre-solo@correo.com', withFree(draftFor('Mia', 'Tomi'), true));
    const g = env.client();
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 75000, receipt: undefined }))).body.error).toBe('receipt_required');
    const r = await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 75000 }));
    expect(r.status).toBe(201);
    const c = (await o.get('/api/contributions')).body.contributions.find((x: any) => x.id === r.body.id);
    expect(c.status).toBe('pending_review');
    expect(c.total).toBe(75000);
    expect(c.items).toEqual([{ kind: 'free', giftId: '', giftName: '', amount: 75000 }]);
    const mail = env.cfg.mail.testOutbox!.filter(m => m.to === 'nora@correo.com').at(-1)!;
    expect(mail.text).toContain('Aporte libre: $');
  });

  it('regalo más aporte libre en el mismo envío: un solo renglón libre y el total es la suma; el importe del regalo sale de lo publicado (CA-5, CA-7)', async () => {
    const { o, slug } = await couple('libre-mix@correo.com', withFree(draftFor('Flor', 'Nico'), true));
    const r = await env.client().post(`/api/public/${slug}/contributions`, body({ giftIds: ['g1'], freeAmount: 40000, amount: 1, total: 1 }));
    expect(r.status).toBe(201);
    const c = (await o.get('/api/contributions')).body.contributions.find((x: any) => x.id === r.body.id);
    expect(c.total).toBe(180000 + 40000);
    expect(c.items.map((i: any) => i.kind)).toEqual(['gift', 'free']);
    expect(c.items[0]).toMatchObject({ giftId: 'g1', giftName: 'Cena frente al mar', amount: 180000 });
  });

  it('sin regalos ni aporte libre, se rechaza (invalid_gifts)', async () => {
    const { slug } = await couple('libre-vacio@correo.com', withFree(draftFor('Paz', 'Gus'), true));
    expect((await env.client().post(`/api/public/${slug}/contributions`, body())).body.error).toBe('invalid_gifts');
  });

  it('reenviar con la misma clave no duplica (CA-8)', async () => {
    const { o, slug } = await couple('libre-idem@correo.com', withFree(draftFor('Ale', 'Bea'), true));
    const g = env.client();
    const once = body({ freeAmount: 30000 });
    const a = await g.post(`/api/public/${slug}/contributions`, once);
    const b = await g.post(`/api/public/${slug}/contributions`, once);
    expect(b.body.id).toBe(a.body.id);
    expect((await o.get('/api/contributions')).body.contributions).toHaveLength(1);
  });

  it('cambiarlo en el borrador no afecta a los invitados hasta publicar (CA-3)', async () => {
    const draft = withFree(draftFor('Lu', 'Fede'), true, 10000);
    const { o, slug } = await couple('libre-pub@correo.com', draft);
    const g = env.client();
    await saveDraft(o, withFree(draft, true, 50000));
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 20000 }))).status).toBe(201); // vale el mínimo publicado (10.000)
    await saveDraft(o, withFree(draft, false));
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 20000 }))).status).toBe(201); // sigue habilitado en lo publicado
    expect((await o.post('/api/wedding/publish')).status).toBe(200);
    expect((await g.post(`/api/public/${slug}/contributions`, body({ freeAmount: 20000 }))).body.error).toBe('free_amount_disabled');
  });

  it('la página pública dice si está habilitado y el mínimo, pero ningún dato de aportes (CA-9)', async () => {
    const { slug } = await couple('libre-api@correo.com', withFree(draftFor('Rocío', 'Iván'), true, 25000));
    await env.client().post(`/api/public/${slug}/contributions`, body({ freeAmount: 60000, giverName: 'Persona Secreta' }));
    const r = await env.client().get(`/api/public/${slug}`);
    expect(r.body.site.freeAmount).toEqual({ enabled: true, min: 25000 });
    const text = JSON.stringify(r.body);
    expect(text).not.toContain('Persona Secreta');
    expect(text).not.toContain('60000');
  });

  it('los aportes libres de una pareja no aparecen en otra (CA-12)', async () => {
    const a = await couple('libre-a@correo.com', withFree(draftFor('Uno', 'Dos'), true));
    const b = await couple('libre-b@correo.com', withFree(draftFor('Tres', 'Cuatro'), true));
    await env.client().post(`/api/public/${a.slug}/contributions`, body({ freeAmount: 12345 }));
    expect((await b.o.get('/api/contributions')).body.contributions).toEqual([]);
    expect((await a.o.get('/api/contributions')).body.contributions).toHaveLength(1);
  });
});

