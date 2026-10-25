import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap, pageMeta, SITEMAP_PATHS } from '@/lib/site';

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
});
