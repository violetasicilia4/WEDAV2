import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { GiftsPage } from '@/components/site/gifts-page';
import { contributionsFromServer, emptyState, FREE_GIFT_ID, freeAmountMin, validateFreeAmount } from '@/lib/weda/logic';
import { demoSiteData, siteFromState, SiteProvider, type SiteActions } from '@/lib/weda/site-model';
import { sanitize } from '@/lib/weda/store';

// GIFT-09 · Aporte de importe libre: la tarjeta de la página pública, su renglón en el carrito y el saneamiento del borrador.
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));
vi.mock('@/components/rsvp-dialog', () => ({ useRsvp: () => ({ open: () => {} }) }));

const actions: SiteActions = { given: [], recordGift: () => {}, recordRsvp: () => {} };
const page = (enabled: boolean, min = 1000) => render(<SiteProvider data={{ ...demoSiteData, kind: 'app', freeAmount: { enabled, min } }} actions={actions}><GiftsPage /></SiteProvider>);
const freeCard = () => screen.getByRole('heading', { name: 'Aporte libre' }).closest('article')!;

afterEach(cleanup);

describe('aporte libre en la página pública', () => {
  it('no aparece si la pareja no lo habilitó, ni en /ejemplo (CA-3, CA-13)', () => {
    page(false);
    expect(screen.queryByRole('heading', { name: 'Aporte libre' })).toBeNull();
    cleanup();
    render(<SiteProvider data={demoSiteData} actions={actions}><GiftsPage /></SiteProvider>);
    expect(screen.queryByRole('heading', { name: 'Aporte libre' })).toBeNull();
  });

  it('valida el monto contra el mínimo y lo suma al regalo como un solo renglón que se puede cambiar', () => {
    page(true, 20000);
    const input = within(freeCard()).getByLabelText('Elegí cuánto querés regalar');
    expect(within(freeCard()).getByText(/Mínimo/)).toHaveTextContent('20.000');
    fireEvent.change(input, { target: { value: '5000' } });
    fireEvent.click(within(freeCard()).getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('El monto mínimo es');
    fireEvent.change(input, { target: { value: '35.000' } });
    fireEvent.click(within(freeCard()).getByRole('button', { name: 'Agregar' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Aporte libre')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/35\.000/).length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button', { name: 'Cambiar el monto del aporte libre' })).toBeInTheDocument();
  });

  it('se oculta mientras se busca un regalo', () => {
    page(true);
    fireEvent.change(screen.getAllByPlaceholderText('Buscar un regalo')[0]!, { target: { value: 'cena' } });
    expect(screen.queryByRole('heading', { name: 'Aporte libre' })).toBeNull();
  });
});

describe('aporte libre en el borrador y en lo publicado', () => {
  it('viene apagado para parejas nuevas y para borradores anteriores (CA-1)', () => {
    expect(emptyState().gifts.freeAmount).toEqual({ enabled: false, min: null });
    const old = { ...emptyState(), gifts: { ...emptyState().gifts, freeAmount: undefined } };
    expect(sanitize(old).gifts.freeAmount).toEqual({ enabled: false, min: null });
  });

  it('el mínimo guardado es un entero entre $ 1.000 y $ 100.000.000, o nulo (CA-2)', () => {
    const with_ = (min: unknown) => sanitize({ ...emptyState(), gifts: { ...emptyState().gifts, freeAmount: { enabled: true, min } } }).gifts.freeAmount;
    expect(with_(20000)).toEqual({ enabled: true, min: 20000 });
    for (const bad of [999, 1500.5, 100_000_001, '20000', -1]) expect(with_(bad).min).toBeNull();
    expect(freeAmountMin(null)).toBe(1000);
    expect(freeAmountMin(500)).toBe(1000);
  });

  it('solo se publica si la lista tiene regalos (D5)', () => {
    const s = { ...emptyState(), planId: 'regalos' as const, gifts: { ...emptyState().gifts, freeAmount: { enabled: true, min: 30000 } } };
    expect(siteFromState(s).freeAmount.enabled).toBe(false);
    const withGift = { ...s, gifts: { ...s.gifts, items: [{ id: 'g1', name: 'Cena', text: '', amount: 100000, category: 'Experiencias' as const, icon: 'utensils' as const }] } };
    expect(siteFromState(withGift).freeAmount).toEqual({ enabled: true, min: 30000 });
    expect(FREE_GIFT_ID).toBe('aporte-libre');
  });

  it('el monto del panel y de la página usan la misma validación: pesos enteros entre el mínimo y $ 100.000.000 (CA-2)', () => {
    expect(validateFreeAmount('20.000', 1000)).toBeNull();
    expect(validateFreeAmount('999', 1000)).toContain('mínimo');
    expect(validateFreeAmount('15000', 20000)).toContain('20.000');
    expect(validateFreeAmount('abc')).toContain('solo con números');
    expect(validateFreeAmount('100000001')).toContain('máximo');
  });

  it('en la revisión de aportes el renglón libre se llama «Aporte libre» (CA-10)', () => {
    const [c] = contributionsFromServer([{ id: 'apo_1', giverName: 'Nora', status: 'pending_review', total: 50000, items: [{ kind: 'free', giftId: '', giftName: '', amount: 50000 }] }]);
    expect(c!.gifts).toEqual([{ name: 'Aporte libre', amount: 50000 }]);
  });
});
