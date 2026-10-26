// Carga del sitio publicado de una pareja, en el servidor (SSR) o por RPC desde el navegador. El código del servidor no llega al bundle del cliente.
import { createServerFn } from '@tanstack/react-start';
import type { PublicLookup } from '@/server/public';

export type { PublicLookup };

export const loadPublicSite = createServerFn({ method: 'GET' })
  .inputValidator((slug: string) => String(slug).slice(0, 120))
  .handler(async ({ data }): Promise<PublicLookup> => {
    const { lookupPublicSite } = await import('@/server/public');
    return lookupPublicSite(data);
  });
