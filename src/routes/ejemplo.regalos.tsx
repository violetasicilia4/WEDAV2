import { createFileRoute } from '@tanstack/react-router';
import { GiftsPage } from '@/components/site/gifts-page';
import { wedding } from '@/lib/demo-wedding';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/ejemplo/regalos')({
  head: () => ({
    ...pageMeta({
      title: 'Lista de regalos • Ignacio & Martina',
      description: 'La lista de regalos de un casamiento ficticio: categorías, búsqueda por monto y un flujo de regalo simulado, creado con Weda.',
      ogDescription: 'La lista de regalos de un casamiento ficticio, creada con Weda.',
      image: wedding.photo,
      imageAlt: `${wedding.couple}, pareja del casamiento de ejemplo`,
    }),
  }),
  component: GiftsPage,
});
