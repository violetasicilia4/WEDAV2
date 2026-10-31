import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContributionReview } from '@/components/panel/contribution-review';
import type { Contribution } from '@/lib/weda/logic';

// El aviso real (ToastProvider) depende del router del panel; acá alcanza con ver qué texto se avisó.
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/panel/ui', () => ({ useToast: () => toast }));

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const base: Contribution = { id: 'apo_1', giver: 'Ana', email: 'ana@correo.com', gifts: [{ name: 'Cena', amount: 100 }], total: 100, at: null, message: '', how: 'alias', receipt: '/api/contributions/apo_1/receipt', status: 'pending_review' };
const renderReview = (over: Partial<Contribution> = {}) => {
  const onChange = vi.fn();
  render(<ContributionReview r={{ ...base, ...over }} onChange={onChange} />);
  return onChange;
};
const button = (name: string) => screen.queryByRole('button', { name });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); toast.mockReset(); });
const toasted = (text: string | RegExp, kind: 'ok' | 'error') => waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(text), kind));

describe('revisión manual de un aporte', () => {
  it('ofrece solo lo que el servidor permite según el estado y el comprobante', () => {
    renderReview();
    expect(button('Confirmar')).not.toBeNull(); expect(button('Rechazar')).not.toBeNull();
    cleanup(); renderReview({ receipt: 'missing' });
    expect(button('Confirmar')).toBeNull(); expect(button('Rechazar')).not.toBeNull();
    cleanup(); renderReview({ status: 'confirmed' });
    expect(button('Confirmar')).toBeNull(); expect(button('Rechazar')).not.toBeNull();
    cleanup(); renderReview({ status: 'rejected' });
    expect(button('Volver a revisar')).not.toBeNull(); expect(button('Rechazar')).toBeNull();
    cleanup(); renderReview({ status: null });
    expect(screen.queryByRole('group')).toBeNull(); // aporte solo de este navegador
  });

  it('confirmar manda PATCH con el estado nuevo y avisa', async () => {
    const fetch = vi.fn(async () => reply(200, { id: 'apo_1', status: 'confirmed' })); vi.stubGlobal('fetch', fetch);
    const onChange = renderReview();
    fireEvent.click(button('Confirmar')!);
    await toasted(/^Confirmaste el aporte de Ana\.$/, 'ok');
    expect(fetch).toHaveBeenCalledWith('/api/contributions/apo_1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) }));
    expect(onChange).toHaveBeenCalledWith('confirmed');
  });

  it('rechazar pide confirmación; «Cancelar» no llama al servidor', async () => {
    const fetch = vi.fn(async () => reply(200, { id: 'apo_1', status: 'rejected' })); vi.stubGlobal('fetch', fetch);
    const onChange = renderReview();
    fireEvent.click(button('Rechazar')!);
    expect(screen.getByText(/Sus regalos vuelven a quedar libres/)).toBeInTheDocument();
    fireEvent.click(button('Cancelar')!);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(button('Rechazar')!);
    fireEvent.click(button('Sí, rechazar')!);
    await toasted(/^Rechazaste el aporte de Ana/, 'ok');
    expect(onChange).toHaveBeenCalledWith('rejected');
  });

  it('volver a revisar con un regalo ya tomado: explica el motivo y no cambia el estado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(409, { error: 'gift_taken', detail: 'g1' })));
    const onChange = renderReview({ status: 'rejected' });
    fireEvent.click(button('Volver a revisar')!);
    await toasted(/^No se puede volver a revisar: otro invitado ya eligió uno de esos regalos\.$/, 'error');
    expect(onChange).not.toHaveBeenCalled();
  });
});
