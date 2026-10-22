import { expect, test } from '@playwright/test';

/* Landing en celular: header único, hero, secciones, planes, testimonios y anclas. Emulación de viewport (no dispositivos físicos). */

test.use({ reducedMotion: 'reduce' });
const goLanding = async (page: import('@playwright/test').Page) => { await page.goto('/', { waitUntil: 'networkidle' }); };

test.describe('Landing · celular 390 px', () => {
  test('el header conserva las dos píldoras: transparentes arriba y de vidrio al hacer scroll', async ({ page }) => {
    await goLanding(page);
    const read = () => page.evaluate(() => {
      const nav = document.querySelector('.float-nav')!, pill = nav.querySelector('.float-pill')!, cs = getComputedStyle(pill);
      return { pills: nav.querySelectorAll('.float-pill').length, h: Math.round(pill.getBoundingClientRect().height), bg: cs.backgroundColor, blur: cs.backdropFilter, shadow: cs.boxShadow, navPos: getComputedStyle(nav).position, navTop: Math.round(nav.getBoundingClientRect().top), menuAnchored: getComputedStyle(nav.querySelector('.float-menu')!).position };
    });
    const top = await read();
    expect(top.pills).toBe(2);
    expect(top.bg).toBe('rgba(255, 255, 255, 0)');       // arriba de todo: sobre la foto, sin relleno
    expect(top.navPos).toBe('sticky');
    expect(top.menuAnchored).toBe('fixed');
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThanOrEqual(698);
    await page.waitForTimeout(250);
    const scrolled = await read();
    expect(scrolled.pills).toBe(2);
    expect(scrolled.blur).toContain('blur(20px)');       // al scrollear se arma el «globo» de vidrio
    expect(scrolled.bg).not.toBe('rgba(255, 255, 255, 0)');
    expect(scrolled.navTop).toBe(8);                      // sigue pegada arriba en todo el recorrido
  });

  test('menú: se abre justo debajo de la barra, se cierra con Escape y devuelve el scroll', async ({ page }) => {
    await goLanding(page);
    for (const y of [0, 1800]) {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      const menu = page.locator('#float-menu');
      await expect(menu).toBeVisible();
      const gap = await page.evaluate(() => document.querySelector('#float-menu')!.getBoundingClientRect().top - document.querySelector('.float-bar')!.getBoundingClientRect().bottom);
      expect(gap).toBeGreaterThanOrEqual(0); expect(gap).toBeLessThanOrEqual(12);
      await expect(menu.getByRole('link', { name: /Crear mi evento/ })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    }
  });

  test('las anclas del pie dejan el título de la sección por debajo de la barra', async ({ page }) => {
    await goLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    for (const [name, id] of [['Lista de regalos', 'regalos'], ['Confirmación de asistencia', 'products']] as const) {
      await page.locator('.footer-nav a', { hasText: name }).click();
      await expect.poll(() => page.evaluate(id => Math.round(document.getElementById(id)!.getBoundingClientRect().top), id)).toBeGreaterThanOrEqual(65);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  });

  test('hero: texto centrado en la pantalla, título en uno o dos renglones, botones táctiles y asoma la sección siguiente', async ({ page }) => {
    await goLanding(page);
    const m = await page.evaluate(() => {
      const r = (e: Element) => e.getBoundingClientRect();
      const h1 = document.querySelector('.seed-hero h1')!, btn = document.querySelector('.seed-hero .seed-button')!;
      const link = [...document.querySelectorAll('.seed-hero .hero-actions a')].find(a => !a.classList.contains('seed-button'))!;
      const next = document.querySelector('.feat-head h2')!;
      const copy = document.querySelector('.hero-copy')!;
      return { copyCenter: (r(copy).top + r(copy).bottom) / 2, lines: Math.round(r(h1).height / parseFloat(getComputedStyle(h1).lineHeight)), btnH: r(btn).height, btnR: r(btn).right, linkH: r(link).height, linkR: r(link).right, vw: innerWidth, vh: innerHeight, nextTop: r(next).top, nextBottom: r(next).bottom, copy: document.querySelector('.seed-hero p')!.textContent };
    });
    expect(m.lines).toBeLessThanOrEqual(2);                     // el título (copy actual: «Tu casamiento empieza antes del gran día.») ocupa 1 o 2 renglones, nunca se corta
    expect(Math.abs(m.copyCenter - m.vh / 2)).toBeLessThan(12);   // el bloque de texto queda en el centro de la pantalla
    expect(m.btnH).toBeGreaterThanOrEqual(44); expect(m.linkH).toBeGreaterThanOrEqual(44);
    expect(m.btnR).toBeLessThanOrEqual(m.vw); expect(m.linkR).toBeLessThanOrEqual(m.vw);
    expect(m.nextBottom).toBeLessThanOrEqual(m.vh);          // el título de la sección siguiente se ve…
    expect(m.copy).toContain('regalos');                      // …y los regalos se mencionan desde el primer pantallazo
  });

  test('regalos: copy nuevo, mismo CTA y una foto grande sin deformar', async ({ page }) => {
    await goLanding(page);
    const sec = page.locator('#regalos');
    await expect(sec.getByRole('heading', { name: 'Una lista de regalos hecha para ustedes.' })).toBeVisible();
    await expect(sec.getByRole('link', { name: 'Crear mi lista de regalos' })).toHaveAttribute('href', '/crear/cuenta');
    // La sección tiene una sola foto (antes eran tres): cubre su recuadro sin deformarse y entra en el ancho de la pantalla.
    const imgs = await sec.locator('.duo-photo img').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, fit: getComputedStyle(e).objectFit, vw: innerWidth }; }));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]!.fit).toBe('cover');
    expect(imgs[0]!.w).toBeGreaterThan(imgs[0]!.vw * 0.9);
    expect(imgs[0]!.w).toBeLessThanOrEqual(imgs[0]!.vw);
    expect(imgs[0]!.h).toBeGreaterThan(200);
  });

  test('planes: precios intactos, «Ver todo lo que incluye» se abre y el CTA queda al pie de cada tarjeta', async ({ page }) => {
    await goLanding(page);
    const cards = page.locator('.plan-card');
    await expect(cards).toHaveCount(3);
    const prices = await cards.locator('.plan-price strong').allInnerTexts();
    expect(prices.map(p => p.replace(/\s/g, ' '))).toEqual(['ARS 95.000', 'ARS 180.000', 'ARS 320.000']);
    for (let i = 0; i < 3; i++) {
      const card = cards.nth(i);
      const m = await card.evaluate(c => { const cr = c.getBoundingClientRect(), b = c.querySelector('.seed-button')!.getBoundingClientRect(), s = c.querySelector('summary')!.getBoundingClientRect(); return { gapBottom: cr.bottom - b.bottom, btnH: b.height, btnW: b.width, cardW: cr.width, sumH: s.height, sumAbove: b.top > s.bottom }; });
      expect(m.gapBottom).toBeLessThan(40);                 // el botón es lo último de la tarjeta
      expect(m.btnH).toBeGreaterThanOrEqual(44); expect(m.btnW).toBeGreaterThan(m.cardW * 0.8);
      expect(m.sumH).toBeGreaterThanOrEqual(44); expect(m.sumAbove).toBe(true);
      await expect(card.getByRole('link', { name: 'Crear mi evento gratis' })).toHaveAttribute('href', '/crear/cuenta');
    }
    const more = cards.nth(1).locator('details');
    await cards.nth(1).locator('summary').click();
    await expect(more).toHaveAttribute('open', '');
    await expect(more.locator('h4').first()).toBeVisible();   // el desplegable muestra el detalle de cada plan incluido
    await expect(cards.nth(1).locator('.plan-inherit')).toContainText('Todo lo de Regalos');
    // Funcionalidades de los tres planes presentes (no se elimina ninguna).
    const all = await cards.allInnerTexts();
    for (const t of ['Lista de regalos personalizada', 'Confirmación de asistencia (RSVP)', 'Música de la fiesta', 'Galería de fotos con hashtag e Instagram', 'Mensaje final personalizado']) expect(all.join('\n')).toContain(t);
  });

  test('testimonios: tres tarjetas a la vista, una debajo de la otra en celular, con la cita arriba y la foto y el nombre de la pareja abajo', async ({ page }) => {
    await goLanding(page);
    const cards = page.locator('.tg-card');
    await cards.first().scrollIntoViewIfNeeded();
    await expect(cards).toHaveCount(3);
    await expect(page.locator('.tm, .tm-track, .tm-dots')).toHaveCount(0);                 // sin carrusel ni puntos
    const boxes = await cards.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); const q = e.querySelector('blockquote')!.getBoundingClientRect(); const f = e.querySelector('figcaption')!.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, quoteTop: q.top, capTop: f.top, name: e.querySelector('figcaption strong')!.textContent, hasImg: !!e.querySelector('figcaption img'), figText: e.querySelector('figcaption')!.textContent, vw: innerWidth }; }));
    for (const b of boxes) {
      expect(b.quoteTop).toBeLessThan(b.capTop);                                           // la cita va arriba y la pareja abajo
      expect(b.hasImg).toBe(true);
      expect(b.figText).toBe(b.name);                                                      // solo el nombre de la pareja: sin cargo ni rol
      expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(b.vw);
    }
    expect(boxes[1]!.top).toBeGreaterThan(boxes[0]!.top + 40);                            // en celular quedan en columna
    expect(boxes[2]!.top).toBeGreaterThan(boxes[1]!.top + 40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('Landing · sin scroll horizontal en todos los anchos', () => {
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900]] as const) {
    test(`${w} px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await goLanding(page);
      expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([w, w]);
      await ctx.close();
    });
  }
});

test.describe('Landing · escritorio no cambia', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
  test('la barra conserva sus dos píldoras y el título del hero su tamaño', async ({ page }) => {
    await goLanding(page);
    const m = await page.evaluate(() => { const pills = [...document.querySelectorAll('.float-pill')]; return { n: pills.length, radius: getComputedStyle(pills[0]!).borderRadius, h1: getComputedStyle(document.querySelector('.seed-hero h1')!).fontSize, ws: getComputedStyle(document.querySelector('.seed-hero h1')!).whiteSpace, pad: getComputedStyle(document.querySelector('.products-section')!).paddingTop, weight: getComputedStyle(document.querySelector('.feat-head h2')!).fontWeight, vh: innerHeight }; });
    expect(m.n).toBe(2);
    expect(m.radius).not.toBe('0px');
    expect(m.h1).toBe('64px'); // Display XL (token --t-display-xl)
    expect(m.pad).toBe(`${Math.min(140, Math.max(72, m.vh * 0.12))}px`); // padding de la sección: clamp(72px, 12svh, 140px)
    expect(m.weight).toBe('500'); // Medium
  });
});
