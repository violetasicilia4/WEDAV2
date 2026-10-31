// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeEnv, PASSWORD, signUp, type Env } from './helpers';

let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());

describe('cambiar la clave desde el perfil', () => {
  it('sin sesión no se puede', async () => {
    const r = await env.client().post('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'Nueva-clave-2026' });
    expect([r.status, r.body.error]).toEqual([401, 'unauthenticated']);
  });

  it('exige la clave actual correcta y una clave nueva válida, sin cambiar nada si fallan', async () => {
    const c = env.client(); await signUp(c, 'perfil@correo.com');
    expect((await c.post('/api/auth/password', { currentPassword: 'Otra-clave-9', newPassword: 'Nueva-clave-2026' })).body.error).toBe('wrong_password');
    expect((await c.post('/api/auth/password', { newPassword: 'Nueva-clave-2026' })).body.error).toBe('wrong_password');
    expect((await c.post('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'corta' })).body.error).toBe('weak_password');
    expect((await env.client().post('/api/auth/login', { email: 'perfil@correo.com', password: PASSWORD })).status).toBe(200);
  });

  it('cambia la clave, mantiene la sesión actual, cierra las demás y anula los enlaces de recuperación pendientes', async () => {
    const here = env.client(); await signUp(here, 'cambio@correo.com');
    const other = env.client();
    expect((await other.post('/api/auth/login', { email: 'cambio@correo.com', password: PASSWORD })).status).toBe(200);
    await env.client().post('/api/auth/forgot', { email: 'cambio@correo.com' });
    const m = [...env.cfg.mail.testOutbox!].reverse().find(x => x.kind === 'password_reset' && x.to === 'cambio@correo.com')!;
    const resetToken = decodeURIComponent(/token=([^\s]+)/.exec(m.text)![1]!);

    const r = await here.post('/api/auth/password', { currentPassword: PASSWORD, newPassword: 'Nueva-clave-2026' });
    expect([r.status, r.body]).toEqual([200, { ok: true }]);
    expect((await here.get('/api/me')).body.user).toEqual({ email: 'cambio@correo.com' });
    expect((await other.get('/api/me')).body.user).toBeNull();
    expect((await env.client().post('/api/auth/login', { email: 'cambio@correo.com', password: PASSWORD })).status).toBe(401);
    expect((await env.client().post('/api/auth/login', { email: 'cambio@correo.com', password: 'Nueva-clave-2026' })).status).toBe(200);
    expect((await env.client().post('/api/auth/reset', { token: resetToken, password: 'Otra-clave-2026' })).body.error).toBe('invalid_or_expired_token');
  });

  it('limita los intentos con la clave actual equivocada', async () => {
    const c = env.client(); await signUp(c, 'fuerza@correo.com');
    let last = 0;
    for (let i = 0; i < 9; i++) last = (await c.post('/api/auth/password', { currentPassword: `Mala-clave-${i}`, newPassword: 'Nueva-clave-2026' })).status;
    expect(last).toBe(429);
  });
});
