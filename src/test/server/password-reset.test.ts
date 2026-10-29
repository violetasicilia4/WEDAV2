// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeEnv, PASSWORD, signUp, type Env } from './helpers';

let env: Env;
beforeAll(() => { env = makeEnv(); });
afterAll(() => env.close());
const outbox = () => env.cfg.mail.testOutbox!;
const tokenOf = (to: string) => {
  const m = [...outbox()].reverse().find(x => x.kind === 'password_reset' && x.to === to);
  return m ? decodeURIComponent(/token=([^\s]+)/.exec(m.text)![1]!) : null;
};

describe('recuperar la clave', () => {
  it('responde lo mismo exista o no la cuenta, y solo manda correo si existe', async () => {
    const c = env.client(); await signUp(c, 'olvido@correo.com');
    const before = outbox().length;
    const none = await env.client().post('/api/auth/forgot', { email: 'nadie@correo.com' });
    const some = await env.client().post('/api/auth/forgot', { email: 'Olvido@Correo.com' });
    expect([none.status, none.body]).toEqual([200, { ok: true }]);
    expect([some.status, some.body]).toEqual([200, { ok: true }]);
    expect(outbox().length).toBe(before + 1);
    expect(outbox().at(-1)).toMatchObject({ kind: 'password_reset', to: 'olvido@correo.com' });
    expect((await env.client().post('/api/auth/forgot', { email: 'no-es-correo' })).status).toBe(400);
  });

  it('el token no se guarda en texto plano', () => {
    const t = tokenOf('olvido@correo.com')!;
    const rows = env.svc.db.prepare('SELECT token_hash FROM password_resets').all() as { token_hash: string }[];
    expect(rows.some(r => r.token_hash === t)).toBe(false);
    expect(rows.every(r => /^[0-9a-f]{64}$/.test(r.token_hash))).toBe(true);
  });

  it('cambia la clave con el enlace: valida la clave nueva, cierra las sesiones y el enlace sirve una sola vez', async () => {
    const owner = env.client(); await signUp(owner, 'cambio@correo.com');
    expect((await owner.get('/api/me')).body.user).toEqual({ email: 'cambio@correo.com' });
    await env.client().post('/api/auth/forgot', { email: 'cambio@correo.com' });
    const token = tokenOf('cambio@correo.com')!;
    expect((await env.client().post('/api/auth/reset', { token, password: 'corta' })).body.error).toBe('weak_password');
    expect((await env.client().post('/api/auth/reset', { token, password: 'Nueva-clave-2026' })).status).toBe(200);
    expect((await owner.get('/api/me')).body.user).toBeNull();                              // la sesión vieja se cerró
    expect((await env.client().post('/api/auth/login', { email: 'cambio@correo.com', password: PASSWORD })).status).toBe(401);
    expect((await env.client().post('/api/auth/login', { email: 'cambio@correo.com', password: 'Nueva-clave-2026' })).status).toBe(200);
    expect((await env.client().post('/api/auth/reset', { token, password: 'Otra-clave-2026' })).body.error).toBe('invalid_or_expired_token');
  });

  it('un enlace vencido o reemplazado por uno nuevo no sirve', async () => {
    const c = env.client(); await signUp(c, 'vence@correo.com');
    await env.client().post('/api/auth/forgot', { email: 'vence@correo.com' });
    const first = tokenOf('vence@correo.com')!;
    await env.client().post('/api/auth/forgot', { email: 'vence@correo.com' });
    const second = tokenOf('vence@correo.com')!;
    expect(second).not.toBe(first);
    expect((await env.client().post('/api/auth/reset', { token: first, password: 'Nueva-clave-2026' })).body.error).toBe('invalid_or_expired_token');
    env.svc.db.prepare("UPDATE password_resets SET expires_at = '2000-01-01T00:00:00.000Z' WHERE used_at IS NULL").run();
    expect((await env.client().post('/api/auth/reset', { token: second, password: 'Nueva-clave-2026' })).body.error).toBe('invalid_or_expired_token');
    expect((await env.client().post('/api/auth/reset', { token: 'inventado-de-mas-de-veinte-caracteres', password: 'Nueva-clave-2026' })).body.error).toBe('invalid_or_expired_token');
  });

  it('limita los pedidos por correo', async () => {
    const c = env.client(); await signUp(c, 'limite@correo.com');
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await env.client().post('/api/auth/forgot', { email: 'limite@correo.com' })).status;
    expect(last).toBe(429);
  });
});
