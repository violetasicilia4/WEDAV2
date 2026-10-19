import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DemoSite } from '@/components/site/site-providers';

export const Route = createFileRoute('/ejemplo')({
  head: () => ({
    meta: [
      // La demo no debe indexarse. robots.txt no la bloquea, para que los buscadores puedan leer esta directiva.
      { name: 'robots', content: 'noindex, nofollow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'es_AR' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => <DemoSite><Outlet /></DemoSite>,
});
