import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSite } from '@/components/site/site-providers';

// Página pública SIMULADA de una pareja (la que se arma desde el panel). No está publicada en Internet: vive en el navegador
// de quien la creó. Es la misma página que /ejemplo, con los datos de la pareja.
export const Route = createFileRoute('/sitio/$slug')({
  head: () => ({
    meta: [
      { title: 'Sitio de casamiento • Weda' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SiteLayout,
});

function SiteLayout() {
  const { slug } = Route.useParams();
  return <AppSite slug={slug}><Outlet /></AppSite>;
}
