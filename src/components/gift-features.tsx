import { Link } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { BudgetMock, NoFeeMock, ReceivedMock } from '@/components/gift-mocks';

/* Las tres ventajas de la lista de regalos, una debajo de la otra: maqueta y explicación, alternando el lado.
   Se usan en la sección Regalos de la landing (un solo botón, dentro del último bloque) y en /lista-de-regalos (con un botón cada una).
   «Pedí en grande» se sacó (pedido de la dueña, 2026-11-03). Cada bloque entra al bajar con `useReveal` (clase `.gift-feature`). */

type Item = { title: string; text: string; Mock: ComponentType; cta: { label: string; to: '/crear/cuenta' | '/ejemplo/regalos' } };

const ITEMS: Item[] = [
  {
    title: 'Sin comisión: el regalo entero es para ustedes',
    text: 'Tus invitados transfieren directo al alias o CBU que cargaste. Weda no cobra ni mueve el dinero de los regalos.',
    Mock: NoFeeMock, cta: { label: 'Crear mi lista de regalos', to: '/crear/cuenta' },
  },
  {
    title: 'Regalos que se adaptan a cada bolsillo',
    text: 'Armá tu lista de regalos con distintos montos. Tus invitados filtran por precio y encuentran uno que les quede cómodo.',
    Mock: BudgetMock, cta: { label: 'Ver regalos', to: '/ejemplo/regalos' },
  },
  {
    title: 'Sabé quién te regaló qué',
    text: 'Cada regalo llega con el comprobante de la transferencia, el nombre de quien lo hizo y su mensaje. Lo revisás, lo confirmás y te queda la lista para agradecer.',
    Mock: ReceivedMock, cta: { label: 'Crear mi lista de regalos', to: '/crear/cuenta' },
  },
];

/** `withCta`: un botón en cada bloque (/lista-de-regalos). `endCta`: un único botón dentro del último bloque (landing).
 *  `label`: un rótulo chico arriba del primer título, para presentar de qué habla la sección (landing: «Lista de regalos»). */
export function GiftFeatures({ level = 2, withCta = false, endCta, label }: { level?: 2 | 3; withCta?: boolean; endCta?: ReactNode; label?: string }) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className="gift-features">
      {ITEMS.map(({ title, text, Mock, cta }, i) => (
        <article key={title} className={`gift-feature${i % 2 ? ' is-flip' : ''}`}>
          <Mock />
          <div className="gift-feature-copy">
            {label && i === 0 && <p className="gift-feature-label">{label}</p>}
            <H>{title}</H>
            <p>{text}</p>
            {withCta && <Button variant="seed" asChild><Link to={cta.to}>{cta.label}</Link></Button>}
            {endCta && i === ITEMS.length - 1 && endCta}
          </div>
        </article>
      ))}
    </div>
  );
}
