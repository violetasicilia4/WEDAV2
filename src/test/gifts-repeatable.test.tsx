import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { GiftsPage } from '@/components/site/gifts-page';
import { demoSiteData, SiteProvider, type SiteActions } from '@/lib/weda/site-model';

// La página de regalos fuera del router: alcanza con un enlace común y un RSVP vacío.
vi.mock('@tanstack/react-router', () => ({ Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }));
vi.mock('@/components/rsvp-dialog', () => ({ useRsvp: () => ({ open: () => {} }) }));

const first = demoSiteData.gifts[0]!;
const actions: SiteActions = { given: [{ id: first.id, name: 'Ana', message: '', how: 'alias' }], recordGift: () => {}, recordRsvp: () => {} };
const card = () => screen.getByRole('heading', { name: first.name }).closest('article')!;

afterEach(cleanup);

describe('regalos repetibles en la página pública (BR-19)', () => {
  it('en una página publicada, un regalo ya regalado se sigue ofreciendo', () => {
    render(<SiteProvider data={{ ...demoSiteData, kind: 'app' }} actions={actions}><GiftsPage /></SiteProvider>);
    expect(within(card()).getByRole('button', { name: 'Regalar' })).toBeEnabled();
    expect(screen.queryByText('Ya elegido')).toBeNull();
  });

  it('tampoco cambia para la misma persona: en el ejemplo, lo que ya regaló este navegador se puede regalar otra vez', () => {
    render(<SiteProvider data={demoSiteData} actions={actions}><GiftsPage /></SiteProvider>);
    expect(within(card()).getByRole('button', { name: 'Regalar' })).toBeEnabled();
    for (const word of ['Ya elegido', 'Elegido por vos', 'Agotado', 'Reservado']) expect(screen.queryByText(word)).toBeNull();
  });
});
