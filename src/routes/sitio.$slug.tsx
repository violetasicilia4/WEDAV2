import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppSite } from '@/components/site/site-providers';
import { pageMeta } from '@/lib/site';
import { loadPublicSite } from '@/lib/weda/public-site';

// Página pública de una pareja. Si está publicada en el servidor, se arma con lo publicado (HTML y metadatos de la pareja, también para WhatsApp);
// si no, queda el comportamiento anterior (simulación local del dueño). Las invitaciones siguen con noindex: indexarlas es una decisión de privacidad pendiente.
export const Route = createFileRoute('/sitio/$slug')({
  loader: ({ params }) => loadPublicSite({ data: params.slug }),
  head: ({ loaderData }) => {
    const live = loaderData?.status === 'live' ? loaderData.site : null;
    const names = live?.names ?? '';
    // Una foto subida vive como dato en el borrador (no es una URL): para compartir se usa la tarjeta de Weda hasta tener almacenamiento de archivos.
    const photo = live?.coverPhoto && live.coverPhoto.startsWith('/') ? live.coverPhoto : undefined;
    const { meta } = pageMeta({
      title: names ? `${names} • Casamiento` : 'Sitio de casamiento • Weda',
      description: names ? `Invitación al casamiento de ${names}${live?.dateLabel ? `, el ${live.dateLabel}` : ''}: información del evento, lista de regalos y confirmación de asistencia.` : 'Un casamiento organizado con Weda: fecha, lugares, lista de regalos y confirmación de asistencia.',
      ...(photo ? { image: photo, imageAlt: `${names}` } : {}),
    });
    return {
      meta: [...meta, { name: 'robots', content: 'noindex, nofollow' }],
      links: [{ rel: 'preload', href: '/fonts/cormorant/cormorant-garamond-latin-wght-normal.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' }],
    };
  },
  component: SiteLayout,
});

function SiteLayout() {
  const { slug } = Route.useParams();
  const remote = Route.useLoaderData();
  return <AppSite slug={slug} remote={remote}><Outlet /></AppSite>;
}
