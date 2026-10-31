// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeEnv, PASSWORD, signUp, type Env } from './helpers';

let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());
const login = async (email: string) => { const c = env.client(); await c.post('/api/auth/login', { email, password: PASSWORD }); return c; };

describe('sesiones abiertas', () => {
  it('sin sesión no se pueden consultar ni cerrar', async () => {
    const anon = env.client();
    expect((await anon.get('/api/auth/sessions')).status).toBe(401);
    expect((await anon.post('/api/auth/sessions/close-others')).status).toBe(401);
  });

  it('cuenta solo las demás sesiones vigentes, sin exponer ids ni tokens', async () => {
    const here = env.client(); await signUp(here, 'varias@correo.com');
    expect((await here.get('/api/auth/sessions')).body).toEqual({ others: 0 });
    await login('varias@correo.com'); await login('varias@correo.com');
    expect((await here.get('/api/auth/sessions')).body).toEqual({ others: 2 });
    // una sesión vencida no cuenta
    env.svc.db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE rowid = (SELECT MAX(rowid) FROM sessions)").run();
    expect((await here.get('/api/auth/sessions')).body).toEqual({ others: 1 });
  });

  it('cierra las demás sesiones y mantiene la actual', async () => {
    const here = env.client(); await signUp(here, 'cierre@correo.com');
    const phone = await login('cierre@correo.com');
    const laptop = await login('cierre@correo.com');
    const r = await here.post('/api/auth/sessions/close-others');
    expect([r.status, r.body]).toEqual([200, { closed: 2 }]);
    expect((await here.get('/api/me')).body.user).toEqual({ email: 'cierre@correo.com' });
    expect((await phone.get('/api/me')).body.user).toBeNull();
    expect((await laptop.get('/api/me')).body.user).toBeNull();
    expect((await here.get('/api/auth/sessions')).body).toEqual({ others: 0 });
  });

  it('rechaza el cierre con Origin ajeno (CSRF)', async () => {
    const here = env.client(); await signUp(here, 'csrf-ses@correo.com');
    await login('csrf-ses@correo.com');
    expect((await here.post('/api/auth/sessions/close-others', {}, { origin: 'https://otro.sitio' })).status).toBe(403);
    expect((await here.get('/api/auth/sessions')).body).toEqual({ others: 1 });
  });
});
