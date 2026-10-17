import { createFileRoute } from '@tanstack/react-router';
import { Invitation } from '@/components/site/invitation';
import { wedding } from '@/lib/demo-wedding';

export const Route = createFileRoute('/ejemplo/')({
  head: () => ({
    meta: [
      { title: `${wedding.couple} • Casamiento` },
      { name: 'description', content: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda: sitio, lista de regalos y confirmación de asistencia.' },
      { property: 'og:title', content: `${wedding.couple} • Casamiento` },
      { property: 'og:description', content: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda.' },
      { property: 'og:image', content: wedding.photo },
    ],
  }),
  component: Invitation,
});
