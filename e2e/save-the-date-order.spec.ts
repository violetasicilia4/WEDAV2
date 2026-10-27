import { expect, test, type Page } from '@playwright/test';

/* «Save the date» (la fecha con su cuenta regresiva) es una sección más del orden de la invitación: la pareja la sube y la baja en «Tu invitación».
   La portada queda siempre primera. Estas pruebas parten de un estado local (sin cuenta) cargado antes de abrir la página. */

const initial = (date: string | null) => JSON.stringify({
  version: 2, onboarded: true, couple: { first: 'Ana', second: 'Beto' }, date, planId: null,
  site: { events: [{ key: 'ceremonia', enabled: true, title: 'Ceremonia', name: 'Jardín de los Olivos', address: 'Calle 1', time: '18:00', note: '', mapsUrl: '' }] },
  gifts: { items: [{ id: 'g1', name: 'Cena frente al mar', text: '', amount: 30000, category: 'Hogar', icon: 'chef', custom: true }] },
});
/** Solo si todavía no hay nada guardado: así una recarga no pisa lo que hizo la pareja. */
const seed = (page: Page, date: string | null) => page.addInitScript(s => { if (!localStorage.getItem('weda-app')) localStorage.setItem('weda-app', s); }, initial(date));
const rows = (page: Page) => page.locator('li.ed-row[data-section]').evaluateAll(els => els.map(e => e.getAttribute('data-section')));
const publicOrder = (page: Page) => page.evaluate(() => [...document.querySelectorAll('main > section')].map(s => s.id || s.className.split(' ')[0]));
const fecha = (page: Page, name: string) => page.getByRole('button', { name: `${name} Save the date` });

for (const width of [390, 1280]) {
  test.describe(`«Save the date» movible (${width} px)`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize({ width, height: 900 }); });

    test('aparece en «Tu invitación» debajo de la portada; sube y baja entre las secciones y se refleja en la página pública', async ({ page }) => {
      await seed(page, '2030-05-18');
      await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
      await expect(page.locator('li.ed-row[data-section="fecha"]')).toBeVisible();
      expect(await rows(page)).toEqual(['portada', 'fecha', 'eventos', 'regalos', 'rsvp', 'mensaje']);
      // Es lo primero que se puede mover (no tiene dónde subir) y no se puede quitar: solo se elige su lugar.
      await expect(fecha(page, 'Subir')).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Quitar Save the date de la invitación' })).toHaveCount(0);
      // La portada ni sube ni baja: dice que es siempre primera.
      await expect(page.locator('li.ed-row[data-section="portada"]').getByText('Siempre primera')).toBeVisible();

      const pub = await page.context().newPage();
      const readPublic = async () => { await pub.goto('/sitio/ana-y-beto', { waitUntil: 'networkidle' }); return publicOrder(pub); };
      expect((await readPublic()).slice(0, 4)).toEqual(['top', 'save-the-date', 'dia', 'regalos']);

      await fecha(page, 'Bajar').click();
      expect(await rows(page)).toEqual(['portada', 'eventos', 'fecha', 'regalos', 'rsvp', 'mensaje']);
      await expect(fecha(page, 'Subir')).toBeEnabled();
      expect((await readPublic()).slice(0, 4)).toEqual(['top', 'dia', 'save-the-date', 'regalos']);

      // Bajar hasta el final de lo movible: queda antes del mensaje final, que siempre cierra, y la portada sigue primera y única.
      for (let i = 0; i < 6 && await fecha(page, 'Bajar').isEnabled(); i++) await fecha(page, 'Bajar').click();
      await expect(fecha(page, 'Bajar')).toBeDisabled();
      expect(await rows(page)).toEqual(['portada', 'eventos', 'regalos', 'rsvp', 'fecha', 'mensaje']);
      const last = await readPublic();
      expect(last[0]).toBe('top');
      expect(last.filter(x => x === 'top')).toHaveLength(1);
      expect(last.filter(x => x === 'save-the-date')).toHaveLength(1);
      expect(last.indexOf('save-the-date')).toBeGreaterThan(last.indexOf('confirmar'));
      expect(last[last.length - 1]).toBe('iv-closing');

      // Y volver a subir lo deja donde estaba por defecto.
      for (let i = 0; i < 6 && await fecha(page, 'Subir').isEnabled(); i++) await fecha(page, 'Subir').click();
      expect(await rows(page)).toEqual(['portada', 'fecha', 'eventos', 'regalos', 'rsvp', 'mensaje']);
      expect((await readPublic()).slice(0, 3)).toEqual(['top', 'save-the-date', 'dia']);
      await pub.close();
    });

    test('el lugar elegido se conserva al recargar', async ({ page }) => {
      await seed(page, '2030-05-18');
      await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
      await fecha(page, 'Bajar').click();
      await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}').site?.order))).toEqual(expect.arrayContaining(['fecha']));
      await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}').site.order.indexOf('fecha')))).toBe(1);
      await page.reload({ waitUntil: 'networkidle' });
      expect(await rows(page)).toEqual(['portada', 'eventos', 'fecha', 'regalos', 'rsvp', 'mensaje']);
    });

    test('su panel cambia la cuenta regresiva y la página pública lo muestra', async ({ page }) => {
      await seed(page, '2030-05-18');
      await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
      await page.locator('li.ed-row[data-section="fecha"] .ed-main').click();
      const check = page.getByLabel('Mostrar la cuenta regresiva');
      await expect(check).toBeChecked();
      await check.uncheck();
      await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}').site.countdown))).toBe(false);
      const pub = await page.context().newPage();
      await pub.goto('/sitio/ana-y-beto', { waitUntil: 'networkidle' });
      await expect(pub.locator('#save-the-date .iv-welcome-date')).toBeVisible();
      await expect(pub.locator('#save-the-date .iv-count')).toHaveCount(0);
      await pub.close();
    });

    test('sin fecha no hay «Save the date»: no está en la lista, ni en «Para agregar», ni en la página pública', async ({ page }) => {
      await seed(page, null);
      await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
      expect(await rows(page)).toEqual(['portada', 'eventos', 'regalos', 'rsvp', 'mensaje']);
      await expect(page.getByRole('button', { name: /Agregar Save the date/ })).toHaveCount(0);
      const pub = await page.context().newPage();
      await pub.goto('/sitio/ana-y-beto', { waitUntil: 'networkidle' });
      expect(await publicOrder(pub)).not.toContain('save-the-date');
      expect((await publicOrder(pub))[0]).toBe('top');
      await pub.close();
    });
  });
}
