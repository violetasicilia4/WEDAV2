// Lectura pública para el renderizado del servidor (título, imagen y contenido del sitio de una pareja). Solo datos publicados.
import type { SiteData } from '@/lib/weda/site-model';
import { getService } from './api';
import { loadConfig } from './config';
import { ApiError } from './errors';

export type PublicLookup =
  | { status: 'live'; site: SiteData }
  | { status: 'unpublished' }
  | { status: 'expired' }
  | { status: 'missing' };

export function lookupPublicSite(slug: string): PublicLookup {
  try {
    const r = getService(loadConfig()).getPublicSite(slug);
    return { status: 'live', site: r.site };
  } catch (e) {
    if (e instanceof ApiError && e.status === 410) return { status: e.code === 'site_expired' ? 'expired' : 'unpublished' };
    if (e instanceof ApiError && e.status === 404) return { status: 'missing' };
    // Sin base de datos (hosting sin disco persistente) no hay sitios publicados: la página sigue con su comportamiento local.
    console.error('No se pudo leer el sitio publicado:', e);
    return { status: 'missing' };
  }
}
