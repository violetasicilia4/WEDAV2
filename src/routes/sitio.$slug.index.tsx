import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Invitation } from '@/components/site/invitation';
import { useSite } from '@/lib/weda/site-model';

export const Route = createFileRoute('/sitio/$slug/')({ component: SiteHome });

function SiteHome() {
  const site = useSite();
  // El plan Regalos no incluye el sitio del casamiento: solo existe la lista de regalos.
  if (!site.blocks.invitation) return <Navigate to={site.giftsPath as never} replace />;
  return <Invitation />;
}
