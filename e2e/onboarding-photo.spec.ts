import { expect, openPreview, PNG_1PX, previewText, stored, test } from './helpers';

/** Alta del evento hasta el paso de la foto (/crear/foto). */
async function untilPhotoStep(page: import('@playwright/test').Page) {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', 'lucia@example.com');
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  await page.fill('#on-first', 'Lucía');
  await page.fill('#on-second', 'Violeta');
  await page.getByRole('switch', { name: 'Todavía no tenemos fecha' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/foto/);
}

test.describe('Onboarding: foto de la pareja', () => {
  test('se pide la foto con la portada a la vista y queda como identidad de la página', async ({ page }) => {
    await untilPhotoStep(page);
    await expect(page.getByRole('heading', { name: 'Sumá una foto de ustedes' })).toBeVisible();
    await expect(page.locator('.pn-cover-names')).toHaveText('Lucía y Violeta');
    await expect(page.locator('.pn-cover-date')).toHaveText('Fecha a confirmar');
    // La acción principal es subir la foto; omitirla es secundario.
    await expect(page.getByRole('button', { name: 'Subir una foto de ustedes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);

    await page.setInputFiles('input[type=file]', { name: 'nosotras.png', mimeType: 'image/png', buffer: PNG_1PX });
    await expect(page.getByText('Listo, así se ve tu portada.')).toBeVisible();
    await expect(page.locator('.pn-cover-preview img')).toHaveAttribute('src', /^data:image\/jpeg/);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(/\/panel/);

    const saved = await stored(page);
    expect(saved.photo.kind).toBe('upload');
    expect(saved.onboarded).toBe(true);

    // La página del casamiento usa esa foto como portada.
    await page.getByRole('link', { name: /Tu página/ }).click();
    await openPreview(page);
    await expect.poll(() => previewText(page)).toMatch(/luc[ií]a y violeta/i);
    const cover = await page.frameLocator('iframe').locator('.iv-cover-img').getAttribute('src');
    expect(cover).toBe(saved.photo.src);
  });

  test('no se muestran los textos de «se queda en tu navegador» ni «es lo primero que ven tus invitados»', async ({ page }) => {
    await untilPhotoStep(page);
    await page.locator('.pn-photo-step h1').waitFor();
    const body = await page.locator('.pn-photo-step').innerText();
    expect(body).not.toMatch(/navegador|servidor|JPG, PNG/i);
    expect(body).not.toMatch(/lo primero que ven/i);
    await expect(page.getByText('Podés cambiarla cuando quieras.')).toBeVisible();
  });

  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]] as const) {
    test(`en celular (${w} px): una sola pantalla sin scroll, título en un renglón y portada como la del micrositio`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await untilPhotoStep(page);
      await page.locator('.pn-photo-step h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const measure = () => page.evaluate(() => {
        const r = (e: Element) => e.getBoundingClientRect();
        const h1 = document.querySelector('.pn-photo-step h1')!, fig = document.querySelector('.pn-cover-preview')!, btn = document.querySelector('.pn-photo-step .pn-btn.pn-block')!, names = document.querySelector('.pn-cover-names')!, copy = document.querySelector('.pn-cover-copy')!;
        const d = document.documentElement;
        return { scrollable: d.scrollHeight > innerHeight + 1, lines: Math.round(r(h1).height / parseFloat(getComputedStyle(h1).lineHeight)), center: (r(h1).left + r(h1).right) / 2, vw: innerWidth, figL: r(fig).left, figR: r(fig).right, btnL: r(btn).left, btnR: r(btn).right, btnBottom: r(btn).bottom, vh: innerHeight, sw: d.scrollWidth, namesFont: getComputedStyle(names).fontFamily, namesCx: (r(names).left + r(names).right) / 2, copyCy: (r(copy).top + r(copy).bottom) / 2, figCx: (r(fig).left + r(fig).right) / 2, figCy: (r(fig).top + r(fig).bottom) / 2 };
      });
      const check = (m: Awaited<ReturnType<typeof measure>>) => {
        expect(m.scrollable).toBe(false);                    // todo entra en una pantalla
        expect(m.btnBottom).toBeLessThanOrEqual(m.vh);
        expect(m.sw).toBe(m.vw);
        expect(Math.abs(m.figL - m.btnL)).toBeLessThan(1);   // la portada tiene el ancho del botón
        expect(Math.abs(m.figR - m.btnR)).toBeLessThan(1);
        expect(m.namesFont).toContain('Geist Variable'); // misma tipografía que toda la app
        expect(Math.abs(m.namesCx - m.figCx)).toBeLessThan(2);
        expect(Math.abs(m.copyCy - m.figCy)).toBeLessThan(2); // bloque centrado en la portada
      };
      const before = await measure();
      expect(before.lines).toBe(1);
      expect(Math.abs(before.center - before.vw / 2)).toBeLessThan(2);
      check(before);
      await page.setInputFiles('input[type=file]', { name: 'nosotras.png', mimeType: 'image/png', buffer: PNG_1PX });
      await page.getByRole('button', { name: 'Continuar' }).waitFor();
      check(await measure());                                 // y también con la foto ya subida
    });
  }

  test('se puede seguir sin foto: queda la imagen de muestra y se sube después', async ({ page }) => {
    await untilPhotoStep(page);
    await page.getByRole('button', { name: 'Ahora no, la subo después' }).click();
    await page.waitForURL(/\/panel/);
    expect((await stored(page)).photo.kind).toBe('none');
  });

  test('un archivo que no es una foto muestra el motivo y no cambia nada', async ({ page }) => {
    await untilPhotoStep(page);
    await page.setInputFiles('input[type=file]', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
    await expect(page.getByRole('alert')).toContainText('Ese formato no sirve');
    expect((await stored(page)).photo.kind).toBe('none');
    await expect(page.getByRole('button', { name: 'Subir una foto de ustedes' })).toBeVisible();
  });

  test('sin los nombres cargados se vuelve al paso anterior', async ({ page }) => {
    await page.goto('/crear/foto', { waitUntil: 'networkidle' });
    await page.waitForURL(/\/crear$/);
  });
});
