import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSite } from '@/components/site/site-providers';
import { pageMeta } from '@/lib/site';

// Página pública SIMULADA de una pareja (la que se arma desde el panel). No está publicada en Internet: vive en el navegador
// de quien la creó. Es la misma página que /ejemplo, con los datos de la pareja.
export const Route = createFileRoute('/sitio/$slug')({
  head: () => ({
    // El HTML de este sitio es igual para todas las parejas: sus datos viven en el navegador de quien lo creó (ver docs/frontend-production-readiness.md).
    meta: [
      ...pageMeta({ title: 'Sitio de casamiento • Weda', description: 'Un casamiento organizado con Weda: fecha, lugares, lista de regalos y confirmación de asistencia.' }).meta,
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [
      { rel: 'preload', href: '/fonts/cormorant/cormorant-garamond-latin-wght-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
    ],
  }),
  component: SiteLayout,
});

function SiteLayout() {
  const { slug } = Route.useParams();
  return <AppSite slug={slug}><Outlet /></AppSite>;
}
