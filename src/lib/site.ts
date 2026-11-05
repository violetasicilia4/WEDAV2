// URL pública del sitio y metadatos para compartir. Los metadatos sociales y el canonical necesitan una URL absoluta: se toma de
// VITE_SITE_URL en el build (por ejemplo "https://weda.example"). Si no está definida quedan rutas relativas y no se emite
// canonical ni og:url, que es lo único honesto sin dominio definitivo.
// Un solo dominio canónico (auditoría F-11): `weda.app` redirige con 308 a `www.weda.app`, así que el canonical, `og:url` y el sitemap
// apuntan siempre a la dirección final, aunque la variable del hosting diga el dominio sin «www».
const CANONICAL_ORIGIN = 'https://www.weda.app';
const fromEnv = ((import.meta.env['VITE_SITE_URL'] as string | undefined) ?? '').trim().replace(/\/+$/, '');
export const SITE_URL = fromEnv === 'https://weda.app' ? CANONICAL_ORIGIN : fromEnv;

export const absolute = (path: string) => (SITE_URL && path.startsWith('/') ? `${SITE_URL}${path}` : path);

export const SITE_NAME = 'Weda';
export const DEFAULT_TITLE = 'Weda • Lista de regalos y sitio para tu casamiento';
export const DEFAULT_DESCRIPTION = 'Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar.';
export const SOCIAL_IMAGE = '/og-weda.png';
export const SOCIAL_IMAGE_ALT = 'Weda, la plataforma para casamientos';

type Meta = Record<string, string>;

/** Título, descripción y metadatos sociales de una página. `path` es la ruta pública (con barra inicial) y solo se usa si hay SITE_URL. */
export function pageMeta(o: { title: string; description: string; ogDescription?: string; path?: string; image?: string; imageAlt?: string }): { meta: Meta[]; links: Meta[] } {
  const image = absolute(o.image ?? SOCIAL_IMAGE);
  const alt = o.imageAlt ?? SOCIAL_IMAGE_ALT;
  return {
    meta: [
      { title: o.title },
      { name: 'description', content: o.description },
      { property: 'og:title', content: o.title },
      { property: 'og:description', content: o.ogDescription ?? o.description },
      { property: 'og:image', content: image },
      { property: 'og:image:alt', content: alt },
      { name: 'twitter:image', content: image },
      ...(SITE_URL && o.path ? [{ property: 'og:url', content: absolute(o.path) }] : []),
    ],
    links: SITE_URL && o.path ? [{ rel: 'canonical', href: absolute(o.path) }] : [],
  };
}

/** Páginas públicas que se listan en el sitemap. Solo las indexables: la demo (/ejemplo) lleva noindex y no va. */
export const SITEMAP_PATHS = ['/', '/lista-de-regalos'] as const;

export function buildSitemap(siteUrl: string = SITE_URL): string | null {
  if (!siteUrl) return null;
  const urls = SITEMAP_PATHS.map(p => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** robots.txt: se puede rastrear todo; lo privado se excluye con noindex (meta + X-Robots-Tag), que un rastreador solo ve si puede entrar. */
export function buildRobots(siteUrl: string = SITE_URL): string {
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
}

/** Idioma del sitio para datos estructurados; coincide con `og:locale` (es_AR) del root. */
export const SITE_LANGUAGE = 'es-AR';
/** Logo para buscadores: el único raster cuadrado que hay en public/ (PNG 180×180; Google pide al menos 112 px). */
export const ORGANIZATION_LOGO = '/apple-touch-icon.png';

/**
 * JSON-LD de la home: `Organization` y `WebSite`, solo con datos que el sitio ya tiene (nombre, dominio, ícono).
 * Sin dominio no se emiten `@id`, `url` ni `logo`: una ruta relativa no sirve en datos estructurados y no se inventa un dominio
 * (la misma regla de `pageMeta` con el canonical). No lleva redes, contacto, precios, reseñas ni `SearchAction`: no existen.
 */
export function homeJsonLd(siteUrl: string = SITE_URL): [Record<string, unknown>, Record<string, unknown>] {
  const orgId = `${siteUrl}/#organization`;
  const organization = siteUrl
    ? { '@context': 'https://schema.org', '@type': 'Organization', '@id': orgId, name: SITE_NAME, url: `${siteUrl}/`, logo: `${siteUrl}${ORGANIZATION_LOGO}` }
    : { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME };
  const website = siteUrl
    ? { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${siteUrl}/#website`, name: SITE_NAME, url: `${siteUrl}/`, inLanguage: SITE_LANGUAGE, publisher: { '@id': orgId } }
    : { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, inLanguage: SITE_LANGUAGE, publisher: { '@type': 'Organization', name: SITE_NAME } };
  return [organization, website];
}
