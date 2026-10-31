import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { PasswordForm } from '@/components/panel/password-form';
import { makeEnv, PASSWORD, signUp, type Client, type Env } from './server/helpers';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup() {
  const onDone = vi.fn();
  const onCancel = vi.fn();
  render(<PasswordForm onDone={onDone} onCancel={onCancel} />);
  const fill = (current: string, next: string, again = next) => {
    fireEvent.change(screen.getByLabelText('Clave actual'), { target: { value: current } });
    fireEvent.change(screen.getByLabelText('Clave nueva'), { target: { value: next } });
    fireEvent.change(screen.getByLabelText('Repetí la clave nueva'), { target: { value: again } });
  };
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar la clave' }));
  return { onDone, onCancel, fill, submit };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('formulario para cambiar la clave', () => {
  it('abre con el foco en la clave actual y «Cancelar» lo cierra sin llamar al servidor', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { onCancel } = setup();
    expect(document.activeElement).toBe(screen.getByLabelText('Clave actual'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('valida en el navegador antes de enviar: actual vacía, nueva débil, igual a la actual y repetición distinta', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { fill, submit } = setup();
    fill('', 'Nueva-clave-2026'); submit();
    expect(screen.getByText('Escribí tu clave actual.')).toBeInTheDocument();
    fill(PASSWORD, 'corta'); submit();
    expect(screen.getByText(/Usá 8 o más caracteres/)).toBeInTheDocument();
    fill(PASSWORD, PASSWORD); submit();
    expect(screen.getByText('La clave nueva tiene que ser distinta de la actual.')).toBeInTheDocument();
    fill(PASSWORD, 'Nueva-clave-2026', 'Nueva-clave-2027'); submit();
    expect(screen.getByText('Las dos claves tienen que ser iguales.')).toBeInTheDocument();
    expect(screen.getByLabelText('Repetí la clave nueva')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envía a POST /api/auth/password, muestra «Un momento…» mientras espera y avisa al terminar', async () => {
    let resolve!: (r: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(r => { resolve = r; })); vi.stubGlobal('fetch', fetch);
    const { fill, submit, onDone } = setup();
    fill(PASSWORD, 'Nueva-clave-2026'); submit();
    const busy = await screen.findByRole('button', { name: 'Un momento…' });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/auth/password');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: PASSWORD, newPassword: 'Nueva-clave-2026' });
    await act(async () => { resolve(reply(200, { ok: true })); });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('clave actual equivocada: el error va en su campo, que se vacía; no se cierra el formulario', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(400, { error: 'wrong_password' })));
    const { fill, submit, onDone } = setup();
    fill('Otra-clave-1', 'Nueva-clave-2026'); submit();
    expect(await screen.findByText('La clave actual no es correcta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Clave actual')).toHaveValue('');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('demasiados intentos, sesión vencida o sin conexión: aviso general con un texto comprensible', async () => {
    const cases: [() => Promise<Response>, RegExp][] = [
      [async () => reply(429, { error: 'too_many_attempts' }), /Demasiados intentos/],
      [async () => reply(401, { error: 'unauthenticated' }), /Tu sesión venció/],
      [async () => { throw new TypeError('offline'); }, /No hay conexión con Weda/],
    ];
    for (const [impl, text] of cases) {
      vi.stubGlobal('fetch', vi.fn(impl));
      const { fill, submit } = setup();
      fill(PASSWORD, 'Nueva-clave-2026'); submit();
      expect((await screen.findByRole('alert')).textContent).toMatch(text);
      cleanup();
    }
  });
});

/* Integración: el formulario contra la API real (handleApi + SQLite temporal), con la cookie de sesión de un navegador. */
describe('formulario + servidor', () => {
  let env: Env;
  let browser: Client;
  beforeAll(async () => { env = makeEnv(); browser = env.client(); await signUp(browser, 'perfil-ui@correo.com'); });
  afterAll(() => env.close());
  const bridge = (c: Client) => vi.fn(async (url: string, init: RequestInit) => (await c.call(init.method ?? 'GET', url, JSON.parse(init.body as string))).raw);

  it('con sesión cambia la clave de verdad: la vieja deja de servir y la nueva entra', async () => {
    vi.stubGlobal('fetch', bridge(browser));
    const { fill, submit, onDone } = setup();
    fill(PASSWORD, 'Nueva-clave-2026'); submit();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect((await browser.get('/api/me')).body.user).toEqual({ email: 'perfil-ui@correo.com' });
    expect((await env.client().post('/api/auth/login', { email: 'perfil-ui@correo.com', password: PASSWORD })).status).toBe(401);
    expect((await env.client().post('/api/auth/login', { email: 'perfil-ui@correo.com', password: 'Nueva-clave-2026' })).status).toBe(200);
  });

  it('sin sesión el servidor lo rechaza y el formulario lo dice sin cambiar nada', async () => {
    vi.stubGlobal('fetch', bridge(env.client()));
    const { fill, submit, onDone } = setup();
    fill('Nueva-clave-2026', 'Otra-clave-2027'); submit();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Tu sesión venció/);
    expect(onDone).not.toHaveBeenCalled();
    expect((await env.client().post('/api/auth/login', { email: 'perfil-ui@correo.com', password: 'Nueva-clave-2026' })).status).toBe(200);
  });
});
