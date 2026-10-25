import { createFileRoute } from '@tanstack/react-router';
import { Invitation } from '@/components/site/invitation';
import { wedding } from '@/lib/demo-wedding';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/ejemplo/')({
  head: () => ({
    ...pageMeta({
      title: `${wedding.couple} • Casamiento`,
      description: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda: sitio, lista de regalos y confirmación de asistencia.',
      ogDescription: 'Un casamiento ficticio para recorrer cómo se ve y cómo funciona un evento creado con Weda.',
      image: wedding.photo,
      imageAlt: `${wedding.couple}, pareja del casamiento de ejemplo`,
    }),
  }),
  component: Invitation,
});
