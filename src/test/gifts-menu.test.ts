// «Regalá» en el menú del sitio: aparece en todo plan que incluye la lista de regalos, aunque todavía no tenga regalos
// (la página muestra «Esta lista todavía se está armando»). Antes solo aparecía con al menos un regalo y, con el plan Celebración
// y la lista vacía, la vista previa no mostraba la lista.
import { describe, expect, it } from 'vitest';
import { emptyState } from '@/lib/weda/logic';
import { demoSiteData, hasGiftsPage, siteFromState } from '@/lib/weda/site-model';
import type { AppState, ListGift } from '@/lib/weda/types';

const withPlan = (planId: AppState['planId'], items = 0): AppState => {
  const s = emptyState();
  return {
    ...s, planId, couple: { ...s.couple, first: 'Ana', second: 'Leo' },
    gifts: { ...s.gifts, items: Array.from({ length: items }, (_, i) => ({ id: `g${i}`, name: `Regalo ${i}`, text: '', amount: 100000, category: 'Luna de miel', icon: 'compass' }) as ListGift) },
  };
};

describe('«Regalá» en el menú del sitio', () => {
  it('con el plan Celebración y la lista vacía, el menú igual lleva a la lista', () => {
    expect(hasGiftsPage(siteFromState(withPlan('invitacion')))).toBe(true);
  });

  it('con el plan Regalos y la lista vacía, también', () => {
    expect(hasGiftsPage(siteFromState(withPlan('regalos')))).toBe(true);
  });

  it('con regalos cargados se ve, como siempre', () => {
    expect(hasGiftsPage(siteFromState(withPlan('invitacion', 2)))).toBe(true);
  });

  it('una publicación guardada antes de este cambio (sin giftsPage) decide por la cantidad de regalos', () => {
    const old = siteFromState(withPlan('invitacion'));
    delete old.blocks.giftsPage;
    expect(hasGiftsPage(old)).toBe(false);
    expect(hasGiftsPage({ ...old, gifts: demoSiteData.gifts })).toBe(true);
  });

  it('el sitio de ejemplo muestra la lista', () => {
    expect(hasGiftsPage(demoSiteData)).toBe(true);
  });
});
