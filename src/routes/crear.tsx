import { createFileRoute } from '@tanstack/react-router';
import { CreateLayout } from '@/components/panel/create-layout';

export const Route = createFileRoute('/crear')({
  head: () => ({
    meta: [
      { title: 'Crear mi evento • Weda' },
      // Es una demo con datos locales: no debe indexarse.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: CreateLayout,
});
