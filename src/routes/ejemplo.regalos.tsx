import { createFileRoute } from '@tanstack/react-router';
import { GiftsPage } from '@/components/site/gifts-page';
import { wedding } from '@/lib/demo-wedding';

export const Route = createFileRoute('/ejemplo/regalos')({
  head: () => ({
    meta: [
      { title: 'Lista de regalos • Ignacio & Martina' },
      { name: 'description', content: 'La lista de regalos de un casamiento ficticio: categorías, búsqueda por monto y un flujo de regalo simulado, creado con Weda.' },
      { property: 'og:title', content: 'Lista de regalos • Ignacio & Martina' },
      { property: 'og:description', content: 'La lista de regalos de un casamiento ficticio, creada con Weda.' },
      { property: 'og:image', content: wedding.photo },
    ],
  }),
  component: GiftsPage,
});
