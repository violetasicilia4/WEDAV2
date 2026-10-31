import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionsRow } from '@/components/panel/sessions-row';

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const renderRow = () => render(<dl><SessionsRow /></dl>);

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('fila «Sesiones» del perfil', () => {
  it('sin otras sesiones lo dice y no ofrece cerrar nada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, { others: 0 })));
    renderRow();
    expect(await screen.findByText('Solo en este dispositivo')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con otras sesiones las cierra con POST /api/auth/sessions/close-others y confirma', async () => {
    const fetch = vi.fn(async (url: string) => (url.endsWith('close-others') ? reply(200, { closed: 2 }) : reply(200, { others: 2 })));
    vi.stubGlobal('fetch', fetch);
    renderRow();
    expect(await screen.findByText('Abierta también en 2 lugares más')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar las demás' }));
    expect(await screen.findByText('Listo: cerramos las demás. Acá seguís adentro.')).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith('/api/auth/sessions/close-others', expect.objectContaining({ method: 'POST' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('si la sesión venció, lo avisa sin inventar un número', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(401, { error: 'unauthenticated' })));
    renderRow();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Tu sesión venció/);
    expect(screen.getByText('No pudimos consultarlas')).toBeInTheDocument();
  });
});
