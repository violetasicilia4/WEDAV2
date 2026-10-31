// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API, sin esquema compartido todavía */
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PASSWORD, PNG, saveDraft, signUp, type Env } from './helpers';
import { MARKETING_CONSENT_VERSION } from '@/lib/weda/consent';
import { unsubscribeToken } from '@/server/mail';

let env: Env;
beforeAll(() => { env = makeEnv(); });
/** Simula un aporte anterior a la regla «sin comprobante no hay regalo»: borra su comprobante (registro y archivo). */
const dropReceipt = (id: string) => {
  const r = env.svc.db.prepare('SELECT storage_key FROM receipts WHERE contribution_id = ?').get(id) as { storage_key: string } | undefined;
  if (r) rmSync(path.join(env.dir, 'receipts', r.storage_key), { force: true });
  env.svc.db.prepare('DELETE FROM receipts WHERE contribution_id = ?').run(id);
};
afterAll(() => env.close());

describe('persistencia del casamiento', () => {
  it('sobrevive a una sesión nueva (otro dispositivo) con los mismos datos', async () => {
    const phone = env.client();
    await signUp(phone, 'p1@correo.com');
    await saveDraft(phone, draftFor('Pía', 'Juan'), { upsert: [{ id: 'inv-1', first: 'Rosa', last: 'Gómez', status: 'confirmed', menu: 'vegano', groupId: null, source: 'manual' }] });
    const laptop = env.client();
    expect((await laptop.post('/api/auth/login', { email: 'p1@correo.com', password: PASSWORD })).status).toBe(200);
    const w = (await laptop.get('/api/wedding')).body;
    expect(w.draft.couple).toMatchObject({ first: 'Pía', second: 'Juan' });
    expect(w.draft.gifts.items).toHaveLength(2);
    expect(w.guests[0]).toMatchObject({ first: 'Rosa', status: 'confirmed', menu: 'vegano' });
    expect(w.revision).toBe(2);
  });

  it('no pisa cambios más recientes: un guardado con revisión vieja devuelve 409 y no modifica nada', async () => {
    const a = env.client(); await a.post('/api/auth/login', { email: 'p1@correo.com', password: PASSWORD });
    const tab2 = env.client(); await tab2.post('/api/auth/login', { email: 'p1@correo.com', password: PASSWORD });
    const w = (await a.get('/api/wedding')).body;
    const ok = await a.put('/api/wedding', { baseRevision: w.revision, draft: draftFor('Pía', 'Juan', { date: '2027-05-01' }) });
    expect(ok.status).toBe(200);
    const late = await tab2.put('/api/wedding', { baseRevision: w.revision, draft: draftFor('Pía', 'Juan', { date: '2030-01-01' }) });
    expect(late.status).toBe(409);
    expect(late.body.error).toBe('revision_conflict');
    expect((await a.get('/api/wedding')).body.draft.date).toBe('2027-05-01');
  });

  it('un borrador inválido se rechaza y NO reemplaza el existente por uno vacío', async () => {
    const a = env.client(); await a.post('/api/auth/login', { email: 'p1@correo.com', password: PASSWORD });
    const w = (await a.get('/api/wedding')).body;
    for (const bad of [null, 'x', [], { version: 1 }, {}]) {
      expect((await a.put('/api/wedding', { baseRevision: w.revision, draft: bad })).status).toBe(400);
    }
    expect((await a.get('/api/wedding')).body.draft.couple.first).toBe('Pía');
  });

  it('las respuestas del sitio no se pierden cuando el panel guarda con una lista vieja de invitados', async () => {
    // el panel solo envía operaciones sobre SUS cambios: no una lista completa que borraría lo recibido en el medio
    const a = env.client(); await a.post('/api/auth/login', { email: 'p1@correo.com', password: PASSWORD });
    await a.post('/api/wedding/publish');
    const slug = (await a.get('/api/wedding')).body.slug;
    const guest = env.client();
    expect((await guest.post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Nuevo', last: 'Invitado', attending: true, menu: '' }] })).status).toBe(200);
    const w = (await a.get('/api/wedding')).body;
    await a.put('/api/wedding', { baseRevision: w.revision, draft: w.draft, guests: { upsert: [] } });
    expect((await a.get('/api/wedding')).body.guests.map((g: any) => g.first)).toContain('Nuevo');
  });
});

describe('publicación y sitio público', () => {
  it('lo publicado se abre sin sesión desde otro contexto y solo expone lo público', async () => {
    const owner = env.client(); await signUp(owner, 'pub@correo.com');
    await saveDraft(owner, draftFor('Camila', 'Lucas'), { upsert: [{ id: 'inv-x', first: 'Privado', last: 'Secreto', status: 'pending', menu: '', groupId: null, source: 'manual' }] });
    const p = (await owner.post('/api/wedding/publish')).body;
    expect(p.slug).toBe('camila-y-lucas');
    const anon = env.client();
    const r = await anon.get(`/api/public/${p.slug}`);
    expect(r.status).toBe(200);
    expect(r.body.site.names).toBe('Camila & Lucas');
    expect(r.body.site.kind).toBe('app');
    expect(r.body.site.giftsPath).toBe('/sitio/camila-y-lucas/regalos');
    const text = JSON.stringify(r.body);
    expect(text).not.toContain('Privado');
    expect(text).not.toContain('Secreto');
    expect(text).not.toContain('pub@correo.com');
  });

  it('los cambios sin publicar no aparecen hasta publicar de nuevo', async () => {
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'pub@correo.com', password: PASSWORD });
    await saveDraft(owner, draftFor('Camila', 'Lucas', { site: { ...draftFor('a', 'b').site, coverText: 'Texto nuevo sin publicar' } }));
    const anon = env.client();
    expect(JSON.stringify((await anon.get('/api/public/camila-y-lucas')).body)).not.toContain('Texto nuevo sin publicar');
    await owner.post('/api/wedding/publish');
    expect((await anon.get('/api/public/camila-y-lucas')).body.site.coverText).toBe('Texto nuevo sin publicar');
  });

  it('el orden de las secciones que eligió la pareja se guarda y llega a lo publicado', async () => {
    const owner = env.client(); await signUp(owner, 'orden@correo.com');
    const base = draftFor('Olga', 'Raúl');
    await saveDraft(owner, { ...base, site: { ...base.site, order: ['musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos'] } });
    expect((await owner.get('/api/wedding')).body.draft.site.order).toEqual(['fecha', 'musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos', 'mensaje']);   // el orden se normaliza al guardar: «Save the date» entra primero si no estaba
    const slug = (await owner.post('/api/wedding/publish')).body.slug;
    expect((await env.client().get(`/api/public/${slug}`)).body.site.order).toEqual(['fecha', 'musica', 'fotos', 'texto', 'dress', 'rsvp', 'regalos', 'eventos', 'mensaje']);
  });

  it('slug inexistente → 404; despublicada → 410; republicar la vuelve a abrir', async () => {
    const anon = env.client();
    expect((await anon.get('/api/public/no-existe')).status).toBe(404);
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'pub@correo.com', password: PASSWORD });
    expect((await owner.post('/api/wedding/unpublish')).status).toBe(200);
    expect((await anon.get('/api/public/camila-y-lucas')).status).toBe(410);
    expect((await owner.post('/api/wedding/publish')).status).toBe(200);
    expect((await anon.get('/api/public/camila-y-lucas')).status).toBe(200);
  });

  it('dos parejas con los mismos nombres obtienen URLs distintas y estables', async () => {
    const x = env.client(); await signUp(x, 'dup@correo.com');
    await saveDraft(x, draftFor('Camila', 'Lucas'));
    expect((await x.post('/api/wedding/publish')).body.slug).toBe('camila-y-lucas-2');
    expect((await x.post('/api/wedding/publish')).body.slug).toBe('camila-y-lucas-2');
  });

  it('no publica sin nombres ni sin plan; con requirePaidOrder exige una orden pagada', async () => {
    const e2 = makeEnv({ requirePaidOrder: true });
    try {
      const c = e2.client(); await signUp(c, 'pago@correo.com');
      await saveDraft(c, draftFor('', ''));
      expect((await c.post('/api/wedding/publish')).status).toBe(409);
      await saveDraft(c, draftFor('Eva', 'Leo'));
      expect((await c.post('/api/wedding/publish')).status).toBe(402);
      const order = (await c.post('/api/orders', { planId: 'invitacion', status: 'paid' })).body;
      expect(order.status).toBe('pending'); // el cliente no puede mandar «paid»
      expect((await c.post('/api/wedding/publish')).status).toBe(402);
      e2.svc.settleOrder(order.id, 'paid', 'proveedor-de-prueba', 'ref-1');
      const pub = await c.post('/api/wedding/publish');
      expect(pub.status).toBe(200);
      expect(pub.body.planId).toBe('invitacion'); // el plan sale de la orden pagada, no del borrador (completo)
    } finally { e2.close(); }
  });
});

describe('invitados y confirmaciones', () => {
  let slug = '';
  beforeAll(async () => {
    const o = env.client(); await signUp(o, 'rsvp@correo.com');
    await saveDraft(o, draftFor('Rita', 'Santi'));
    slug = (await o.post('/api/wedding/publish')).body.slug;
  });

  it('un invitado confirma sin acceder al panel y el panel lo ve', async () => {
    const g = env.client();
    expect((await g.post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Marta', last: 'Pérez', attending: true, menu: 'celiaco' }] })).status).toBe(200);
    const o = env.client(); await o.post('/api/auth/login', { email: 'rsvp@correo.com', password: PASSWORD });
    const m = (await o.get('/api/wedding')).body.guests.find((x: any) => x.first === 'Marta');
    expect(m).toMatchObject({ status: 'confirmed', source: 'rsvp' });
  });

  it('cambiar la respuesta actualiza a la misma persona (sin duplicar, aunque cambien tildes o mayúsculas)', async () => {
    const g = env.client();
    await g.post(`/api/public/${slug}/rsvp`, { people: [{ first: 'MARTA', last: 'perez', attending: false, menu: '' }] });
    const o = env.client(); await o.post('/api/auth/login', { email: 'rsvp@correo.com', password: PASSWORD });
    const list = (await o.get('/api/wedding')).body.guests.filter((x: any) => x.first.toLowerCase() === 'marta');
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('declined');
    const hist = env.svc.db.prepare('SELECT COUNT(*) AS n FROM rsvp_events WHERE guest_id = ?').get(list[0].id) as { n: number };
    expect(hist.n).toBe(2);
  });

  it('el correo de quien confirma es opcional; las novedades de Weda se guardan solo con correo y casilla tildada', async () => {
    const g = env.client();
    const rsvp = (first: string, contact?: unknown) => g.post(`/api/public/${slug}/rsvp`, { people: [{ first, last: 'Correo', attending: true, menu: '' }], contact });
    expect((await rsvp('Sinmail')).status).toBe(200);
    expect((await rsvp('Conmail', { email: 'lu@correo.com' })).status).toBe(200);
    expect((await rsvp('Optin', { email: 'Sol@Correo.com', marketingOptIn: true })).status).toBe(200);
    expect((await rsvp('Sinmailoptin', { email: '', marketingOptIn: true })).status).toBe(200);
    const mail = (first: string) => (env.svc.db.prepare('SELECT email FROM guests WHERE first = ?').get(first) as { email: string }).email;
    expect([mail('Sinmail'), mail('Conmail'), mail('Optin')]).toEqual(['', 'lu@correo.com', 'sol@correo.com']);
    const c = env.svc.db.prepare("SELECT email, source FROM marketing_consents WHERE source = 'rsvp'").all();
    expect(c).toEqual([{ email: 'sol@correo.com', source: 'rsvp' }]);
  });

  it('el formulario público no devuelve datos de otros invitados', async () => {
    const r = await env.client().post(`/api/public/${slug}/rsvp`, { people: [{ first: 'Marta', last: 'Pérez', attending: true, menu: '' }] });
    expect(r.body).toEqual({ count: 1 });
  });

  it('valida entradas: vacíos, demasiadas personas, sitio inexistente', async () => {
    const g = env.client();
    expect((await g.post(`/api/public/${slug}/rsvp`, { people: [] })).status).toBe(400);
    expect((await g.post(`/api/public/${slug}/rsvp`, { people: [{ first: '', last: 'x', attending: true }] })).status).toBe(400);
    expect((await g.post(`/api/public/${slug}/rsvp`, { people: Array.from({ length: 11 }, () => ({ first: 'a', last: '', attending: true })) })).status).toBe(400);
    expect((await g.post('/api/public/nada/rsvp', { people: [{ first: 'a', last: '', attending: true }] })).status).toBe(404);
  });

  it('no se puede responder en un sitio despublicado', async () => {
    const o = env.client(); await o.post('/api/auth/login', { email: 'rsvp@correo.com', password: PASSWORD });
    await o.post('/api/wedding/unpublish');
    expect((await env.client().post(`/api/public/${slug}/rsvp`, { people: [{ first: 'a', last: '', attending: true }] })).status).toBe(410);
    await o.post('/api/wedding/publish');
  });

  it('el panel borra y edita invitados propios', async () => {
    const o = env.client(); await o.post('/api/auth/login', { email: 'rsvp@correo.com', password: PASSWORD });
    const w = (await o.get('/api/wedding')).body;
    const marta = w.guests.find((x: any) => x.first === 'MARTA' || x.first === 'Marta');
    const r = await o.put('/api/wedding', { baseRevision: w.revision, draft: w.draft, guests: { remove: [marta.id] } });
    expect(r.status).toBe(200);
    expect(r.body.guests.find((x: any) => x.id === marta.id)).toBeUndefined();
  });
});

describe('aportes, comprobantes y órdenes', () => {
  let slug = '';
  const body = (over: Record<string, unknown> = {}) => ({ idempotencyKey: 'key-0000-0001', manageToken: 'token-del-invitado-0001', giverName: 'Tía Nora', giverEmail: 'nora@correo.com', message: '¡Felicitaciones!', how: 'alias', giftIds: ['g1'], receipt: { data: Buffer.from(PNG).toString('base64') }, ...over });
  beforeAll(async () => {
    const o = env.client(); await signUp(o, 'regalos@correo.com');
    await saveDraft(o, draftFor('Gala', 'Pablo'));
    slug = (await o.post('/api/wedding/publish')).body.slug;
  });

  it('el correo de quien regala es obligatorio, llega a la pareja y las novedades de Weda se guardan solo con la casilla tildada', async () => {
    // Casamiento propio: no suma aportes al de las pruebas siguientes.
    const o = env.client(); await signUp(o, 'correos@correo.com');
    await saveDraft(o, draftFor('Ema', 'Leo'));
    const own = (await o.post('/api/wedding/publish')).body.slug;
    const g = env.client();
    const send = (over: Record<string, unknown>) => g.post(`/api/public/${own}/contributions`, body(over));
    expect((await send({ idempotencyKey: 'key-mail-0001', giverEmail: '' })).status).toBe(400);
    expect((await send({ idempotencyKey: 'key-mail-0002', giverEmail: 'no-es-un-correo' })).status).toBe(400);
    const consents = () => env.svc.db.prepare("SELECT email, source, text_version, revoked_at FROM marketing_consents WHERE email = 'ana@correo.com'").all();
    const ok = await send({ idempotencyKey: 'key-mail-0003', manageToken: 'token-del-invitado-mail3', giverEmail: ' Ana@Correo.com ', giftIds: ['g1'] });
    expect(ok.status).toBe(201);
    expect(consents()).toEqual([]); // sin casilla tildada, no entra a la base de novedades
    const mine = (await o.get('/api/contributions')).body.contributions.find((c: any) => c.id === ok.body.id);
    expect(mine.giverEmail).toBe('ana@correo.com');
    const opt = await send({ idempotencyKey: 'key-mail-0004', manageToken: 'token-del-invitado-mail4', giverEmail: 'ana@correo.com', giftIds: ['g2'], marketingOptIn: true });
    expect(opt.status).toBe(201);
    expect(consents()).toEqual([{ email: 'ana@correo.com', source: 'gift', text_version: MARKETING_CONSENT_VERSION, revoked_at: null }]);
  });

  it('constancia al regalar, recordatorio de comprobante (uno por día, con enlace nuevo) y baja de novedades', async () => {
    const o = env.client(); await signUp(o, 'mails@correo.com');
    await saveDraft(o, draftFor('Ivo', 'Mia'));
    const own = (await o.post('/api/wedding/publish')).body.slug;
    const g = env.client();
    const r = await g.post(`/api/public/${own}/contributions`, body({ idempotencyKey: 'key-mails-0001', manageToken: 'token-del-invitado-mails1', giverEmail: 'juan@correo.com', marketingOptIn: true }));
    expect(r.status).toBe(201);
    const log = (kind: string) => env.svc.db.prepare('SELECT to_email, status FROM mail_log WHERE ref = ? AND kind = ?').all(r.body.id, kind);
    expect(log('gift_receipt')).toEqual([{ to_email: 'juan@correo.com', status: 'skipped' }]); // sin proveedor configurado: queda registrado, no se envía
    // Recordatorio: lo pide la pareja dueña; otra pareja recibe 404.
    // Desde ahora no hay regalos sin comprobante: se simula uno viejo (anterior a esta regla) para probar el recordatorio.
    expect((await o.post(`/api/contributions/${r.body.id}/remind`)).body.error).toBe('receipt_already_attached');
    dropReceipt(r.body.id);
    const other = env.client(); await signUp(other, 'ajena@correo.com');
    expect((await other.post(`/api/contributions/${r.body.id}/remind`)).status).toBe(404);
    expect((await o.post(`/api/contributions/${r.body.id}/remind`)).status).toBe(200);
    expect(log('receipt_reminder')).toHaveLength(1);
    expect((await o.post(`/api/contributions/${r.body.id}/remind`)).body.error).toBe('reminder_too_soon');
    // El enlace viejo del invitado deja de servir (el recordatorio manda uno nuevo).
    expect((await g.get(`/api/public/contributions/${r.body.id}`, { 'x-manage-token': 'token-del-invitado-mails1' })).status).toBe(404);
    // Baja: el enlace firmado marca la baja; uno inventado no.
    const live = () => env.svc.db.prepare("SELECT COUNT(*) AS n FROM marketing_consents WHERE email = 'juan@correo.com' AND revoked_at IS NULL").get() as { n: number };
    expect(live().n).toBe(1);
    expect((await g.get('/api/unsubscribe?t=bad.token')).status).toBe(400);
    expect((await g.get(`/api/unsubscribe?t=${unsubscribeToken('secreto-de-prueba', 'juan@correo.com')}`)).status).toBe(200);
    expect(live().n).toBe(0);
  });

  it('sin comprobante no se registra el regalo, y no se puede confirmar uno que no lo tenga', async () => {
    const o = env.client(); await signUp(o, 'sincomp@correo.com');
    await saveDraft(o, draftFor('Ale', 'Bruno'));
    const own = (await o.post('/api/wedding/publish')).body.slug;
    const g = env.client();
    const r = await g.post(`/api/public/${own}/contributions`, body({ idempotencyKey: 'key-sinc-0001', manageToken: 'token-del-invitado-sinc1', receipt: undefined }));
    expect([r.status, r.body.error]).toEqual([400, 'receipt_required']);
    expect((await g.post(`/api/public/${own}/contributions`, body({ idempotencyKey: 'key-sinc-0002', manageToken: 'token-del-invitado-sinc2', receipt: { data: Buffer.from('<script>').toString('base64') } }))).status).toBe(415);
    const n = env.svc.db.prepare('SELECT COUNT(*) AS n FROM contributions c JOIN weddings w ON w.id = c.wedding_id WHERE w.slug = ?').get(own) as { n: number };
    expect(n.n).toBe(0);
    // Un aporte viejo sin comprobante (anterior a esta regla) no se puede confirmar.
    const ok = await g.post(`/api/public/${own}/contributions`, body({ idempotencyKey: 'key-sinc-0003', manageToken: 'token-del-invitado-sinc3' }));
    dropReceipt(ok.body.id);
    const c = await o.patch(`/api/contributions/${ok.body.id}`, { status: 'confirmed' });
    expect([c.status, c.body.error]).toEqual([409, 'receipt_required']);
  });

  it('un aporte queda «pendiente de revisión» (no es dinero recibido) con el monto tomado del servidor', async () => {
    const g = env.client();
    const r = await g.post(`/api/public/${slug}/contributions`, body({ amount: 1, total: 1 }));
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pending_review');
    const o = env.client(); await o.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    const c = (await o.get('/api/contributions')).body.contributions[0];
    expect(c.total).toBe(180000);
    expect(c.status).toBe('pending_review');
    expect(c.history[0]).toMatchObject({ kind: 'created', actor: 'guest' });
  });

  it('reenviar con la misma clave no duplica; otra persona no puede reusar la clave', async () => {
    const g = env.client();
    const again = await g.post(`/api/public/${slug}/contributions`, body());
    expect([again.status, again.body.replay]).toEqual([200, true]);
    expect((await g.post(`/api/public/${slug}/contributions`, body({ manageToken: 'otro-token-distinto-0002' }))).status).toBe(409);
    const n = env.svc.db.prepare('SELECT COUNT(*) AS n FROM contributions c JOIN weddings w ON w.id = c.wedding_id WHERE w.slug = ?').get(slug) as { n: number };
    expect(n.n).toBe(1);
  });

  it('un regalo ya tomado no se puede tomar de nuevo, ni dos envíos simultáneos', async () => {
    const g = env.client();
    const dup = await g.post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0002', manageToken: 'token-del-invitado-0002' }));
    expect(dup.status).toBe(409); expect(dup.body.error).toBe('gift_taken');
    const [x, y] = await Promise.all([
      g.post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0003', manageToken: 'token-del-invitado-0003', giftIds: ['g2'] })),
      env.client().post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0004', manageToken: 'token-del-invitado-0004', giftIds: ['g2'] })),
    ]);
    expect([x.status, y.status].sort()).toEqual([201, 409]);
    expect((await env.client().get(`/api/public/${slug}`)).body.takenGiftIds.sort()).toEqual(['g1', 'g2']);
  });

  it('rechaza regalos inexistentes, tarjeta (sin proveedor) y datos inválidos', async () => {
    const g = env.client();
    expect((await g.post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0005', giftIds: ['nope'] }))).status).toBe(400);
    expect((await g.post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0006', how: 'tarjeta' }))).status).toBe(501);
    expect((await g.post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'x', giftIds: [] }))).status).toBe(400);
  });

  it('comprobante: tipo real validado por contenido, tamaño limitado y archivo privado', async () => {
    const g = env.client();
    const row = env.svc.db.prepare("SELECT id FROM contributions WHERE idempotency_key = 'key-0000-0001'").get() as { id: string };
    const tok = { 'x-manage-token': 'token-del-invitado-0001' };
    expect((await g.put(`/api/public/contributions/${row.id}/receipt`, new TextEncoder().encode('<script>alert(1)</script>'), tok)).status).toBe(415);
    expect((await g.put(`/api/public/contributions/${row.id}/receipt`, PNG, { 'x-manage-token': 'token-equivocado-0000' })).status).toBe(404);
    expect((await g.put(`/api/public/contributions/${row.id}/receipt`, new Uint8Array(5 * 1024 * 1024 + 1).fill(1), tok)).status).toBe(413);
    const ok = await g.put(`/api/public/contributions/${row.id}/receipt`, PNG, tok);
    expect([ok.status, ok.body.mime]).toEqual([200, 'image/png']);
    const files = readdirSync(path.join(env.dir, 'receipts'));
    // Reemplazar el comprobante no deja archivos sueltos: un archivo por cada comprobante registrado.
    const rows = env.svc.db.prepare('SELECT storage_key FROM receipts').all() as { storage_key: string }[];
    expect(files.sort()).toEqual(rows.map(r => r.storage_key).sort());
    const mine = (env.svc.db.prepare('SELECT storage_key FROM receipts WHERE contribution_id = ?').get(row.id) as { storage_key: string }).storage_key;
    files.splice(0, files.length, mine);
    // el comprobante no está en ninguna ruta pública ni estática
    expect(JSON.stringify((await g.get(`/api/public/${slug}`)).body)).not.toContain(files[0]!);
    expect((await g.get(`/api/contributions/${row.id}/receipt`)).status).toBe(401);
  });

  it('solo la pareja dueña ve el comprobante y cambia el estado; otra pareja recibe 404', async () => {
    const row = env.svc.db.prepare("SELECT id FROM contributions WHERE idempotency_key = 'key-0000-0001'").get() as { id: string };
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    const file = await owner.get(`/api/contributions/${row.id}/receipt`);
    expect([file.status, file.headers.get('content-type'), file.headers.get('cache-control')]).toEqual([200, 'image/png', 'private, no-store']);
    const rival = env.client(); await signUp(rival, 'rival@correo.com');
    expect((await rival.get(`/api/contributions/${row.id}/receipt`)).status).toBe(404);
    expect((await rival.patch(`/api/contributions/${row.id}`, { status: 'confirmed' })).status).toBe(404);
    expect((await rival.get('/api/contributions')).body.contributions).toEqual([]);
    expect((await env.client().patch(`/api/contributions/${row.id}`, { status: 'confirmed' })).status).toBe(401);
  });

  it('transiciones de estado válidas, con historial; el invitado no puede confirmar su propio aporte', async () => {
    const row = env.svc.db.prepare("SELECT id FROM contributions WHERE idempotency_key = 'key-0000-0001'").get() as { id: string };
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    expect((await env.client().patch(`/api/contributions/${row.id}`, { status: 'confirmed' }, )).status).toBe(401);
    expect((await owner.patch(`/api/contributions/${row.id}`, { status: 'inexistente' })).status).toBe(400);
    expect((await owner.patch(`/api/contributions/${row.id}`, { status: 'confirmed', note: 'Llegó la transferencia' })).status).toBe(200);
    expect((await owner.patch(`/api/contributions/${row.id}`, { status: 'pending_review' })).status).toBe(409);
    const hist = (await owner.get('/api/contributions')).body.contributions.find((c: any) => c.id === row.id).history.map((h: any) => `${h.actor}:${h.to}`);
    expect(hist).toEqual(['guest:pending_review', 'guest:pending_review', 'owner:confirmed']); // creado, comprobante adjunto, confirmado por la pareja
    const guestView = await env.client().get(`/api/public/contributions/${row.id}`, { 'x-manage-token': 'token-del-invitado-0001' });
    expect(guestView.body.status).toBe('confirmed');
  });

  it('un aporte rechazado libera el regalo', async () => {
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    const row = env.svc.db.prepare("SELECT id FROM contributions WHERE idempotency_key = 'key-0000-0001'").get() as { id: string };
    expect((await owner.patch(`/api/contributions/${row.id}`, { status: 'rejected' })).status).toBe(200);
    expect((await env.client().get(`/api/public/${slug}`)).body.takenGiftIds).not.toContain('g1');
  });

  it('volver a revisar un rechazado solo si sus regalos siguen libres (un regalo nunca queda tomado dos veces)', async () => {
    const owner = env.client(); await owner.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    const row = env.svc.db.prepare("SELECT id FROM contributions WHERE idempotency_key = 'key-0000-0001'").get() as { id: string };
    // Mientras estaba rechazado, otro invitado eligió el mismo regalo.
    const other = await env.client().post(`/api/public/${slug}/contributions`, body({ idempotencyKey: 'key-0000-0007', manageToken: 'token-del-invitado-0007' }));
    expect(other.status).toBe(201);
    const back = await owner.patch(`/api/contributions/${row.id}`, { status: 'pending_review' });
    expect([back.status, back.body.error, back.body.detail]).toEqual([409, 'gift_taken', 'g1']);
    // Si la pareja rechaza el otro, el primero puede volver a revisión.
    expect((await owner.patch(`/api/contributions/${other.body.id}`, { status: 'rejected' })).status).toBe(200);
    expect((await owner.patch(`/api/contributions/${row.id}`, { status: 'pending_review' })).status).toBe(200);
    expect((await env.client().get(`/api/public/${slug}`)).body.takenGiftIds).toContain('g1');
  });

  it('el pago no se puede marcar desde el cliente; el webhook de pagos no está configurado', async () => {
    const c = env.client(); await c.post('/api/auth/login', { email: 'regalos@correo.com', password: PASSWORD });
    const o = (await c.post('/api/orders', { planId: 'completo' })).body;
    expect(o).toMatchObject({ status: 'pending', checkoutUrl: null });
    expect((await c.patch(`/api/orders/${o.id}`, { status: 'paid' })).status).toBe(404);
    expect((await c.post('/api/webhooks/payments', { orderId: o.id, status: 'paid' })).status).toBe(501);
    expect((await c.get('/api/orders')).body.orders.every((x: any) => x.status === 'pending')).toBe(true);
    expect((await c.post('/api/orders', { planId: 'gratis' })).status).toBe(400);
  });

  it('errores internos no filtran detalles ni dejan comprobantes huérfanos', async () => {
    const before = readdirSync(path.join(env.dir, 'receipts')).length;
    const row = env.svc.db.prepare("SELECT id FROM contributions LIMIT 1").get() as { id: string };
    const bad = await env.client().put(`/api/public/contributions/${row.id}/receipt`, new Uint8Array(0), { 'x-manage-token': 'token-del-invitado-0001' });
    expect([400, 404, 409]).toContain(bad.status);
    expect(readdirSync(path.join(env.dir, 'receipts')).length).toBe(before);
  });
});
