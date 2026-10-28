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
  it('muestra los tres planes con su precio, leído de la configuración central', async () => {
    await renderPlans();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    PLANS.forEach((plan, i) => {
      const card = within(cards[i]!);
      expect(card.getByRole('heading', { level: 3, name: plan.name })).toBeTruthy();
      expect(card.getByText(formatPrice(plan.price))).toBeTruthy();
      expect(card.getByText('Pago único')).toBeTruthy();
      expect(card.getByText(plan.product)).toBeTruthy();
    });
    expect(screen.getByText(/Armá tu casamiento gratis/)).toBeTruthy();
  });

  it('cada tarjeta lleva al registro con el mismo CTA gratuito, sin elegir plan', async () => {
    await renderPlans();
    const ctas = screen.getAllByRole('link', { name: 'Empezar gratis' });
    expect(ctas).toHaveLength(3);
    ctas.forEach(a => expect(a.getAttribute('href')).toBe('/crear/cuenta'));
  });

  it('cada plan despliega el detalle y los planes siguientes muestran lo heredado', async () => {
    await renderPlans();
    expect(screen.getAllByText('Ver lo que incluye')).toHaveLength(3);
    const [, invitacion, completo] = screen.getAllByRole('article').map(a => within(a));
    expect(invitacion!.getByText('Todo lo de Regalos')).toBeTruthy();
    expect(completo!.getByText('Todo lo de Celebración')).toBeTruthy();
  });

  it('destaca el pago único y que la página queda publicada seis meses, sin hablar de suscripción', async () => {
    await renderPlans();
    expect(screen.getAllByText('Publicada 6 meses')).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/suscripci|por mes|mensual/i);
  });
});
