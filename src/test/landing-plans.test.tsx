import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingPlans } from '@/components/landing-plans';
import { formatPrice, PLANS } from '@/lib/weda/plans';

// Router mínimo: la sección de planes solo necesita poder armar enlaces a /crear/cuenta.
async function renderPlans() {
  const root = createRootRoute();
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/', component: LandingPlans }),
      createRoute({ getParentRoute: () => root, path: '/crear/cuenta', component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

describe('Planes en la landing', () => {
  it('muestra los dos planes (Regalos y Celebración) con su precio, leído de la configuración central', async () => {
    await renderPlans();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(PLANS.map(p => [p.name, p.price])).toEqual([['Regalos', 95000], ['Celebración', 140000]]);
    PLANS.forEach((plan, i) => {
      const card = within(cards[i]!);
      expect(card.getByRole('heading', { level: 3, name: plan.name })).toBeTruthy();
      expect(card.getByText(formatPrice(plan.price))).toBeTruthy();
      expect(card.getByText('Pago único')).toBeTruthy();
      expect(card.getByText(plan.product)).toBeTruthy();
    });
    expect(screen.getByText(/Armá tu casamiento gratis/)).toBeTruthy();
    // PAY-07: 14 días gratis y pago único sin renovaciones; ninguna duración de publicación (BR-65).
    expect(screen.getByText(/14 días para crear todo gratis, sin tarjeta/)).toBeTruthy();
    expect(screen.getAllByText(/sin renovaciones/)).toHaveLength(2);
    expect(screen.queryByText(/Publicada|1 año|vence/i)).toBeNull();
  });

  it('cada plan lleva su «Empezar» al registro, y Celebración lleva el cartel «Recomendado»', async () => {
    await renderPlans();
    const ctas = screen.getAllByRole('link', { name: 'Empezar' });
    expect(ctas).toHaveLength(2);
    ctas.forEach(a => { expect(a.getAttribute('href')).toBe('/crear/cuenta'); expect(a.closest('.pl-card')).not.toBeNull(); });
    expect(screen.queryByText('Más elegido')).toBeNull();          // no se afirma una popularidad sin medir
    const badges = screen.getAllByText('Recomendado');
    expect(badges).toHaveLength(1);
    expect(badges[0]!.closest('.pl-card')?.querySelector('h3')?.textContent).toBe('Celebración');
  });

  it('todo lo que incluye cada plan se ve sin abrir nada; Celebración muestra que incluye lo de Regalos', async () => {
    await renderPlans();
    expect(screen.queryByText('Ver lo que incluye')).toBeNull();
    const [basico, celebracion] = screen.getAllByRole('article').map(a => within(a));
    PLANS[0]!.highlights.forEach(h => expect(basico!.getByText(h.label)).toBeTruthy());
    PLANS[1]!.highlights.forEach(h => expect(celebracion!.getByText(h.label)).toBeTruthy());
    expect(celebracion!.getByText('Todo lo de Regalos')).toBeTruthy();
    for (const t of ['Sitio con tu invitación', 'Confirmación de asistencia', 'Invitados y mesas', 'Música, fotos y mensaje final']) expect(celebracion!.getByText(t)).toBeTruthy();
  });

  it('destaca el pago único sin renovaciones (BR-65), sin hablar de suscripción ni de vencimiento', async () => {
    await renderPlans();
    expect(screen.getAllByText(/Pago único/)).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/suscripci|por mes|mensual|Publicada \d|vencimiento|vence/i);
  });
});
