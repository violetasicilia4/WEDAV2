import { expect, test } from '@playwright/test';

/* Regresión: el mosaico de fotos de la página pública en celular. Con 3 a 6 fotos, las reglas de escritorio (span 2 o 3 y filas dobles) ganaban a las de celular y dejaban
   fotos de 0 px de alto o más anchas que la grilla de 2 columnas: las fotos parecían «apiladas». Para cada cantidad (1–8) y ancho, cada foto tiene tamaño real,
   queda dentro del mosaico y no se superpone con otra. */

const PHOTOS = ['/ejemplo-foto-1.webp', '/ejemplo-foto-3.webp', '/ejemplo-foto-4.webp', '/ejemplo-foto-1.webp', '/ejemplo-foto-3.webp', '/ejemplo-foto-4.webp', '/ejemplo-foto-1.webp', '/ejemplo-foto-3.webp'];
const state = (n: number) => JSON.stringify({
  version: 2, onboarded: true, couple: { first: 'Ana', second: 'Beto' }, date: '2030-05-18', planId: null,
  site: { gallery: { enabled: true, hashtag: '#AnaYBeto', handle: '', photos: PHOTOS.slice(0, n).map((src, i) => ({ id: `p${i}`, src, alt: `Foto ${i + 1}` })) } },
});

for (const width of [320, 390, 700, 701, 1280]) {
  test(`Mosaico de fotos: de 1 a 8 fotos, todas con tamaño real, dentro del mosaico y sin superponerse (${width} px)`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    for (let n = 1; n <= 8; n++) {
      await page.addInitScript(s => { localStorage.setItem('weda-app', s); }, state(n));
      await page.goto('/sitio/ana-y-beto', { waitUntil: 'networkidle' });
      const mosaic = page.locator('.iv-mosaic');
      await expect(mosaic.locator('.iv-shot')).toHaveCount(n);
      const m = await mosaic.evaluate(el => {
        const box = el.getBoundingClientRect();
        return { box: { l: box.left, r: box.right, t: box.top, b: box.bottom, w: box.width }, shots: [...el.querySelectorAll('.iv-shot')].map(s => { const r = s.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; }), page: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      const tag = `${width}px · ${n} fotos`;
      expect(m.page, `${tag}: sin scroll horizontal`).toBeLessThanOrEqual(m.cw);
      m.shots.forEach((a, i) => {
        expect(a.w, `${tag}: foto ${i + 1} con ancho`).toBeGreaterThan(80);
        expect(a.h, `${tag}: foto ${i + 1} con alto (antes 0 px)`).toBeGreaterThan(80);
        expect(a.l, `${tag}: foto ${i + 1} dentro del mosaico`).toBeGreaterThanOrEqual(m.box.l - 1);
        expect(a.r, `${tag}: foto ${i + 1} dentro del mosaico`).toBeLessThanOrEqual(m.box.r + 1);
        expect(a.b, `${tag}: foto ${i + 1} dentro del mosaico`).toBeLessThanOrEqual(m.box.b + 1);
        m.shots.forEach((b, j) => { if (j > i) expect(a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1, `${tag}: fotos ${i + 1} y ${j + 1} no se superponen`).toBe(false); });
      });
      if (width <= 700) {
        // Celular: grilla de 2 columnas; ninguna foto es más ancha que el mosaico y solo la primera (cantidad impar) o la única ocupa todo el ancho.
        m.shots.forEach((a, i) => { if (a.w > m.box.w * 0.6) expect([0].includes(i) || n === 1 ? true : false, `${tag}: solo la primera foto puede ir a todo el ancho (foto ${i + 1})`).toBe(true); });
      }
    }
  });
}
