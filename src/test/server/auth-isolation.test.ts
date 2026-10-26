// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- respuestas JSON de la API, sin esquema compartido todavía */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { draftFor, makeEnv, PASSWORD, saveDraft, signUp, type Env } from './helpers';

let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());

describe('cuentas y sesiones', () => {
  it('registra, abre sesión con cookie httpOnly y /api/me la reconoce', async () => {
    const a = env.client();
    const r = await a.post('/api/auth/register', { email: 'Ana@Correo.com', password: PASSWORD });
    expect(r.status).toBe(201);
    const cookie = r.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect((await a.get('/api/me')).body.user.email).toBe('ana@correo.com');
  });

  it('rechaza claves débiles, correos inválidos y correos repetidos', async () => {
    const c = env.client();
    expect((await c.post('/api/auth/register', { email: 'x@y.com', password: 'corta' })).body.error).toBe('weak_password');
    expect((await c.post('/api/auth/register', { email: 'no-es-correo', password: PASSWORD })).body.error).toBe('invalid_email');
    expect((await c.post('/api/auth/register', { email: 'ANA@correo.com', password: PASSWORD })).status).toBe(409);
  });

  it('login correcto e incorrecto; no distingue correo inexistente de clave mala', async () => {
    const c = env.client();
    const bad = await c.post('/api/auth/login', { email: 'ana@correo.com', password: 'Otra12345' });
    const none = await c.post('/api/auth/login', { email: 'nadie@correo.com', password: 'Otra12345' });
    expect([bad.status, none.status]).toEqual([401, 401]);
    expect(bad.body).toEqual(none.body);
    expect((await c.post('/api/auth/login', { email: 'ana@correo.com', password: PASSWORD })).status).toBe(200);
  });

  it('limita los intentos de login repetidos', async () => {
    const c = env.client();
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await c.post('/api/auth/login', { email: 'fuerza@bruta.com', password: 'Mala12345' })).status;
    expect(last).toBe(429);
  });

  it('logout invalida la sesión en el servidor (la cookie vieja ya no sirve)', async () => {
    const c = env.client();
    await c.post('/api/auth/login', { email: 'ana@correo.com', password: PASSWORD });
    const old = c.cookie;
    await c.post('/api/auth/logout');
    const replay = env.client(); replay.cookie = old;
    expect((await replay.get('/api/wedding')).status).toBe(401);
  });

  it('la clave se guarda con scrypt, nunca en claro', () => {
    const row = env.svc.db.prepare("SELECT password_hash FROM users WHERE email = 'ana@correo.com'").get() as { password_hash: string };
    expect(row.password_hash.startsWith('scrypt$')).toBe(true);
    expect(row.password_hash).not.toContain(PASSWORD);
  });

  it('rutas privadas sin sesión → 401', async () => {
    const c = env.client();
    for (const [m, u] of [['GET', '/api/wedding'], ['PUT', '/api/wedding'], ['POST', '/api/wedding/publish'], ['GET', '/api/contributions'], ['GET', '/api/orders']] as const) {
      expect((await c.call(m, u, m === 'PUT' ? {} : undefined)).status).toBe(401);
    }
  });

  it('rechaza escrituras con Origin ajeno (CSRF)', async () => {
    const c = env.client();
    const r = await c.post('/api/auth/login', { email: 'ana@correo.com', password: PASSWORD }, { origin: 'https://malo.example' });
    expect(r.status).toBe(403);
  });
});

describe('aislamiento entre parejas', () => {
  it('dos usuarios crean casamientos independientes y cada uno solo ve el suyo', async () => {
    const a = env.client(), b = env.client();
    await signUp(a, 'a1@correo.com'); await signUp(b, 'b1@correo.com');
    await saveDraft(a, draftFor('Ana', 'Luis'), { upsert: [{ id: 'inv-a', first: 'Invitado', last: 'De Ana', status: 'pending', menu: '', groupId: null, source: 'manual' }] });
    await saveDraft(b, draftFor('Bea', 'Tomás'), { upsert: [{ id: 'inv-b', first: 'Invitado', last: 'De Bea', status: 'pending', menu: '', groupId: null, source: 'manual' }] });
    const wa = (await a.get('/api/wedding')).body, wb = (await b.get('/api/wedding')).body;
    expect(wa.draft.couple.first).toBe('Ana'); expect(wb.draft.couple.first).toBe('Bea');
    expect(wa.guests.map((g: any) => g.id)).toEqual(['inv-a']);
    expect(wb.guests.map((g: any) => g.id)).toEqual(['inv-b']);
    expect(wa.id).not.toBe(wb.id);
  });

  it('A no puede tocar invitados de B aunque conozca su id', async () => {
    const a = env.client(); await a.post('/api/auth/login', { email: 'a1@correo.com', password: PASSWORD });
    const w = (await a.get('/api/wedding')).body;
    // intento de pisar al invitado de B y de borrarlo
    const r = await a.put('/api/wedding', { baseRevision: w.revision, draft: w.draft, guests: { upsert: [{ id: 'inv-b', first: 'Hackeado', last: '', status: 'confirmed', menu: '', groupId: null, source: 'manual' }] } });
    expect(r.status).toBe(409);
    const w2 = (await a.get('/api/wedding')).body;
    await a.put('/api/wedding', { baseRevision: w2.revision, draft: w2.draft, guests: { remove: ['inv-b'] } });
    const b = env.client(); await b.post('/api/auth/login', { email: 'b1@correo.com', password: PASSWORD });
    const wb = (await b.get('/api/wedding')).body;
    expect(wb.guests).toHaveLength(1);
    expect(wb.guests[0].first).toBe('Invitado');
  });

  it('el id del casamiento no se acepta desde el cliente: no hay ruta /api/wedding/:id', async () => {
    const a = env.client(); await a.post('/api/auth/login', { email: 'a1@correo.com', password: PASSWORD });
    const wb = env.svc.db.prepare("SELECT id FROM weddings WHERE draft LIKE '%Bea%'").get() as { id: string };
    expect((await a.get(`/api/wedding/${wb.id}`)).status).toBe(404);
  });
});
