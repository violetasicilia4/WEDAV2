import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap, homeJsonLd, pageMeta, SITEMAP_PATHS } from '@/lib/site';

// Recorre el JSON en todos los niveles y devuelve todas las claves y todos los valores de texto.
const walk = (v: unknown, keys: string[] = [], strings: string[] = []): { keys: string[]; strings: string[] } => {
  if (typeof v === 'string') strings.push(v);
  else if (Array.isArray(v)) v.forEach(x => walk(x, keys, strings));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x, keys, strings); }
  return { keys, strings };
};
const FORBIDDEN_KEYS = ['sameAs', 'address', 'telephone', 'email', 'contactPoint', 'aggregateRating', 'review', 'offers', 'price', 'foundingDate', 'potentialAction'];

describe('SEO', () => {
  it('sin dominio configurado no hay sitemap ni canonical ni og:url (no se inventa un dominio)', () => {
    expect(buildSitemap('')).toBeNull();
    const { meta, links } = pageMeta({ title: 'T', description: 'D', path: '/' });
    expect(links).toEqual([]);
    expect(meta.some(m => m['property'] === 'og:url')).toBe(false);
    expect(buildRobots('')).not.toContain('Sitemap');
  });

  it('con dominio, el sitemap lista solo páginas indexables y robots lo referencia', () => {
    const xml = buildSitemap('https://weda.example')!;
    expect(xml).toContain('<loc>https://weda.example/</loc>');
    expect(SITEMAP_PATHS.every(p => !/^\/(ejemplo|crear|panel|sitio|encontrar)/.test(p))).toBe(true);
    expect(buildRobots('https://weda.example')).toContain('Sitemap: https://weda.example/sitemap.xml');
  });

  it('robots.txt permite rastrear todo para que los buscadores vean el noindex de lo privado', () => {
    expect(buildRobots('')).toMatch(/User-agent: \*\nAllow: \//);
    expect(buildRobots('')).not.toMatch(/Disallow/);
  });

  it('cada página tiene título, descripción e imagen social', () => {
    const { meta } = pageMeta({ title: 'T', description: 'D' });
    for (const k of ['description', 'og:title', 'og:description', 'og:image', 'twitter:image']) {
      expect(meta.some(m => m['name'] === k || m['property'] === k)).toBe(true);
    }
  });

  it('JSON-LD de la home con dominio: Organization y WebSite con URLs absolutas y el publisher apunta a la Organization', () => {
    const [org, site] = homeJsonLd('https://www.weda.app');
    expect(org['@type']).toBe('Organization');
    expect(site['@type']).toBe('WebSite');
    expect(org['url']).toBe('https://www.weda.app/');
    expect(site['url']).toBe('https://www.weda.app/');
    expect(org['logo']).toBe('https://www.weda.app/apple-touch-icon.png');
    expect(org['@id']).toBe('https://www.weda.app/#organization');
    expect((site['publisher'] as Record<string, unknown>)['@id']).toBe(org['@id']);
    expect(site['inLanguage']).toBe('es-AR');
  });

  it('JSON-LD de la home sin dominio: no hay url, logo ni @id, ni rutas relativas ni dominios inventados', () => {
    const blocks = homeJsonLd('');
    expect(blocks.map(b => b['@type'])).toEqual(['Organization', 'WebSite']);
    for (const b of blocks) expect(b['name']).toBe('Weda');
    const { keys, strings } = walk(JSON.parse(JSON.stringify(blocks)));
    for (const k of ['url', 'logo', '@id']) expect(keys).not.toContain(k);
    // '@context' es el vocabulario de schema.org, no una URL del sitio: es lo único que puede empezar con http.
    const own = walk(blocks.map(({ '@context': _c, ...rest }) => rest)).strings;
    expect(own.filter(v => v.startsWith('/') || v.startsWith('http'))).toEqual([]);
    expect(strings).toContain('Weda');
  });

  it('JSON-LD de la home: solo datos reales (sin redes, contacto, precios, reseñas ni búsqueda), con y sin dominio', () => {
    for (const url of ['', 'https://www.weda.app']) {
      const { keys } = walk(homeJsonLd(url));
      expect(keys.filter(k => FORBIDDEN_KEYS.includes(k))).toEqual([]);
      expect(JSON.stringify(homeJsonLd(url))).not.toMatch(/SearchAction/);
    }
  });
});
