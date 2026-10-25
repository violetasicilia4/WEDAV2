import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DemoSite } from '@/components/site/site-providers';

export const Route = createFileRoute('/ejemplo')({
  head: () => ({
    meta: [
      // La demo no debe indexarse. robots.txt no la bloquea, para que los buscadores puedan leer esta directiva.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      { rel: 'preload', href: '/fonts/cormorant/cormorant-garamond-latin-wght-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    ],
  }),
  component: () => <DemoSite><Outlet /></DemoSite>,
});
