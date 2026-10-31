import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublishDialog } from '@/components/panel/publish-dialog';
import { publishPaid } from '@/lib/weda/payments';
import { reset, update } from '@/lib/weda/store';
import { emptyState } from '@/lib/weda/logic';

// El estado del servidor (sesión, publicación y «cambios sin publicar») se fija acá; el resto del módulo es el real.
const remote = vi.hoisted(() => ({
  state: { settled: true, user: { email: 'pareja@correo.com' }, save: 'saved', error: null, notice: null, payments: null, publication: null as null | Record<string, unknown> },
  publish: vi.fn(),
}));
vi.mock('@/lib/weda/remote', async orig => ({ ...(await orig<typeof import('@/lib/weda/remote')>()), useRemote: () => remote.state, publishRemote: remote.publish }));

const publication = (pendingChanges?: boolean) => ({ status: 'live', planId: 'completo', version: 1, publishedAt: '2026-10-01T00:00:00.000Z', pendingChanges });

beforeEach(() => {
  reset();
  update(() => publishPaid({ ...emptyState(), onboarded: true, couple: { first: 'Ana', second: 'Leo' }, slug: 'ana-y-leo' }, 'completo'));
});
afterEach(() => { cleanup(); remote.publish.mockReset(); });

describe('aviso de cambios sin publicar en «Tu publicación»', () => {
  it('con cambios: lo dice y ofrece publicarlos', async () => {
    remote.state.publication = publication(true);
    remote.publish.mockImplementation(async () => { remote.state.publication = publication(false); return { ok: true, slug: 'ana-y-leo' }; });
    render(<PublishDialog open onClose={() => {}} />);
    expect(screen.getByText('Publicada, con cambios sin publicar')).toBeInTheDocument();
    expect(screen.getByText(/Tenés cambios guardados que todavía no se ven en tu página/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publicar los cambios' })); });
    await waitFor(() => expect(screen.getByText('Listo: tu página ya muestra los cambios.')).toBeInTheDocument());
    expect(remote.publish).toHaveBeenCalledOnce();
  });

  it('al día: lo dice y no ofrece volver a publicar lo mismo', () => {
    remote.state.publication = publication(false);
    render(<PublishDialog open onClose={() => {}} />);
    expect(screen.getByText('Publicada')).toBeInTheDocument();
    expect(screen.getByText(/Tu página ya muestra todo lo que guardaste/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar los cambios' })).toBeNull();
  });

  it('sin el dato del servidor: mantiene el botón, sin afirmar nada', () => {
    remote.state.publication = publication(undefined);
    render(<PublishDialog open onClose={() => {}} />);
    expect(screen.queryByText(/Tenés cambios guardados/)).toBeNull();
    expect(screen.queryByText(/Tu página ya muestra todo/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Publicar los cambios' })).toBeInTheDocument();
  });
});
