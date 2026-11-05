import { expect, test } from '@playwright/test';

/* Landing en celular: header único, hero, secciones, planes, «Por qué Weda» y anclas. Emulación de viewport (no dispositivos físicos). */

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
    // El vidrio entra con una transición: se espera a que esté armado en vez de un tiempo fijo (con la máquina cargada, 250 ms a veces no alcanzaban).
    await expect.poll(async () => (await read()).blur, { timeout: 3000 }).toContain('blur(20px)');   // al scrollear se arma el «globo» de vidrio
    const scrolled = await read();
    expect(scrolled.pills).toBe(2);
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

  test('el ancla del pie deja el título de la sección por debajo de la barra', async ({ page }) => {
    await goLanding(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    for (const [name, id] of [['Confirmación de asistencia', 'products']] as const) {
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
      return { copyCenter: (r(copy).top + r(copy).bottom) / 2, lines: Math.round(r(h1).height / parseFloat(getComputedStyle(h1).lineHeight)), btnH: r(btn).height, btnW: r(btn).width, btnFs: getComputedStyle(btn).fontSize, linkFs: getComputedStyle(link).fontSize, btnR: r(btn).right, linkH: r(link).height, linkR: r(link).right, vw: innerWidth, vh: innerHeight, nextTop: r(next).top, nextBottom: r(next).bottom, copy: document.querySelector('.seed-hero p')!.textContent };
    });
    expect(m.lines).toBeLessThanOrEqual(2);                     // el título (copy actual: «Tu casamiento empieza antes del gran día.») ocupa 1 o 2 renglones, nunca se corta
    expect(Math.abs(m.copyCenter - m.vh / 2)).toBeLessThan(12);   // el bloque de texto queda en el centro de la pantalla
    expect(m.btnH).toBeGreaterThanOrEqual(44); expect(m.linkH).toBeGreaterThanOrEqual(44); expect(m.linkFs).toBe(m.btnFs); // botones táctiles y «Ver ejemplo» con la misma letra que «Crear mi evento»
    expect(m.btnR).toBeLessThanOrEqual(m.vw); expect(m.linkR).toBeLessThanOrEqual(m.vw);
    expect(m.nextTop).toBeLessThanOrEqual(m.vh - 24);        // el título de la sección siguiente asoma en la primera pantalla…
    expect(m.copy).toContain('regalos');                      // …y los regalos se mencionan desde el primer pantallazo
  });

  test('regalos: sin título de sección, tres ventajas apiladas y el botón dentro de la última', async ({ page }) => {
    await goLanding(page);
    const sec = page.locator('#regalos');
    await expect(sec.getByRole('heading', { name: 'Una lista de regalos hecha para ustedes.' })).toHaveCount(0);   // se sacó: la sección arranca en «Sin comisión»
    await expect(sec.locator('.gift-feature').last().getByRole('link', { name: 'Crear mi lista de regalos' })).toHaveAttribute('href', '/crear/cuenta');   // el botón cierra el último bloque
    const blocks = sec.locator('.gift-feature');
    await expect(blocks).toHaveCount(3);                                                   // sin comisión, cada bolsillo y quién te regaló («Pedí en grande» se sacó)
    await expect(blocks.locator('.mk')).toHaveCount(3);
    for (const t of ['Sin comisión: el regalo entero es para ustedes', 'Regalos que se adaptan a cada bolsillo', 'Sabé quién te regaló qué']) await expect(sec.getByRole('heading', { name: t })).toBeVisible();
    const tops = await blocks.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
    expect(tops[0]! < tops[1]! && tops[1]! < tops[2]!).toBe(true);                       // uno debajo del otro
  });

  test('planes: dos tarjetas (Regalos y Celebración) con todo lo que incluyen a la vista, «Empezar» al pie y «Más elegido» en Celebración', async ({ page }) => {
    await goLanding(page);
    const cards = page.locator('.pl-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.locator('h3')).toHaveText(['Regalos', 'Celebración']);
    const prices = await cards.locator('.pl-price strong').allInnerTexts();
    expect(prices.map(p => p.replace(/\s/g, ' '))).toEqual(['ARS 95.000', 'ARS 140.000']);
    const [b0, b1] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    expect(b1!.y).toBeLessThan(b0!.y);                     // en celular Celebración se ve primero
    for (let i = 0; i < 2; i++) {
      const card = cards.nth(i);
      const cta = card.getByRole('link', { name: 'Empezar', exact: true });
      await expect(cta).toHaveAttribute('href', '/crear/cuenta');
      const m = await card.evaluate(c => { const cr = c.getBoundingClientRect(), b = c.querySelector('.pl-cta')!.getBoundingClientRect(); return { gapBottom: cr.bottom - b.bottom, btnH: b.height, btnW: b.width, cardW: cr.width }; });
      expect(m.gapBottom).toBeLessThan(40);                 // «Empezar» cierra la tarjeta
      expect(m.btnH).toBeGreaterThanOrEqual(44); expect(m.btnW).toBeGreaterThan(m.cardW * 0.8);   // a todo el ancho en celular
    }
    await expect(cards.locator('.pl-badge')).toHaveCount(1);
    await expect(cards.nth(1).locator('.pl-badge')).toHaveText('Más elegido');
    await expect(page.getByRole('button', { name: 'Ver lo que incluye' })).toHaveCount(0);   // nada que abrir: todo a la vista
    await expect(cards.nth(1).locator('.pl-inherit')).toContainText('Todo lo de Regalos');
    const all = await cards.allInnerTexts();
    for (const t of ['Lista de regalos', 'Sitio con tu invitación', 'Confirmación de asistencia', 'Invitados y mesas', 'Música, fotos y mensaje final', 'Pago único', 'Publicada 1 año']) expect(all.join('\n')).toContain(t);
  });

  test('Testimonios: una cita a la vez sobre blanco, con la foto y el contador de la pareja y flechas a la derecha', async ({ page }) => {
    await goLanding(page);
    const tq = page.locator('.tq');
    await tq.scrollIntoViewIfNeeded();
    await expect(page.getByText('Por qué Weda')).toHaveCount(0);
    expect(await page.locator('#por-que-weda').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');   // fondo blanco, sin foto
    await expect(tq.locator('blockquote.on')).toHaveCount(1);
    await expect(tq.locator('.tq-who strong')).toHaveText('Camila & Lucas');
    await expect(tq.locator('.tq-who span')).toHaveText('01 / 04');
    await tq.getByRole('button', { name: 'Testimonio siguiente' }).click();
    await expect(tq.locator('.tq-who span')).toHaveText('02 / 04');
    await tq.getByRole('button', { name: 'Testimonio anterior' }).click();
    await tq.getByRole('button', { name: 'Testimonio anterior' }).click();
    await expect(tq.locator('.tq-who span')).toHaveText('04 / 04');                                // da la vuelta
    const nav = await tq.locator('.tq-nav').boundingBox(), foot = await tq.locator('.tq-foot').boundingBox();
    expect(Math.abs(nav!.x + nav!.width - (foot!.x + foot!.width))).toBeLessThan(2);              // flechas a la derecha
    const btn = await tq.getByRole('button', { name: 'Testimonio siguiente' }).boundingBox();
    expect(btn!.width).toBeGreaterThanOrEqual(44); expect(btn!.height).toBeGreaterThanOrEqual(44);
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
    expect(m.h1).toBe('72px'); // hero: clamp(52px, 5vw, 76px)
    expect(m.pad).toBe('60px'); // espaciado de sección como The Knot: 60 px en compu (40 px en celular)
    expect(m.weight).toBe('500'); // Medium
  });
});

test.describe('Landing · datos estructurados para buscadores', () => {
  test('la home tiene exactamente un Organization y un WebSite, y los bloques parsean sin error', async ({ page }) => {
    await goLanding(page);
    const types = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent!)['@type'] as string));
    expect(types.filter(t => t === 'Organization')).toHaveLength(1);
    expect(types.filter(t => t === 'WebSite')).toHaveLength(1);
  });
});

test.describe('Página de la lista de regalos (/lista-de-regalos)', () => {
  test('se llega desde el pie, tiene un solo h1, preguntas que se despliegan y datos estructurados para buscadores', async ({ page }) => {
    await goLanding(page);
    await page.locator('.seed-footer').getByRole('link', { name: 'Lista de regalos' }).click();
    await expect(page).toHaveURL(/\/lista-de-regalos$/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/Lista de regalos/);
    const types = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent!)['@type']));
    expect(types).toContain('FAQPage');
    expect(types).toContain('WebPage');
    expect(types).not.toContain('Organization'); // los de la home no quedan pegados al navegar del lado del cliente
    const first = page.locator('.lr-faq details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
    await expect(page.locator('.float-nav a', { hasText: 'Lista de regalos' })).toHaveCount(0); // no figura en el menú de arriba
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
