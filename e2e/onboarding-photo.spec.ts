import { expect, fillNamesAndContinue, openPreview, PNG_1PX, previewFrame, previewText, skipDateAndPlace, stored, test } from './helpers';

/** Alta del evento hasta el paso de la foto (/crear/foto). */
async function untilPhotoStep(page: import('@playwright/test').Page) {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', 'lucia@example.com');
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  await fillNamesAndContinue(page);
  await skipDateAndPlace(page);
}

test.describe('Onboarding: foto de la pareja', () => {
  test('se pide la foto, se sube y queda como identidad de la página', async ({ page }) => {
    await untilPhotoStep(page);
    await expect(page.getByRole('progressbar', { name: 'Paso 3 de 3' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sumá una foto de ustedes' })).toBeVisible();
    // Antes de subirla: la foto de muestra es el botón para elegir una, y omitirla es secundario.
    await expect(page.getByRole('button', { name: /^Subir foto/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Omitir por ahora' })).toBeVisible();

    await page.setInputFiles('input[type=file]', { name: 'nosotras.png', mimeType: 'image/png', buffer: PNG_1PX });
    await expect(page.getByText('Listo, así se ve tu portada.')).toBeAttached();
    await expect(page.getByRole('img', { name: 'Tu foto de portada' })).toHaveAttribute('src', /^data:image\/jpeg/);
    await expect(page.getByRole('button', { name: 'Omitir por ahora' })).toHaveCount(0);   // ya no hace falta omitir
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(/\/panel/);

    await expect.poll(async () => (await stored(page)).photo.kind).toBe('upload');   // el guardado local es diferido
    const saved = await stored(page);
    expect(saved.onboarded).toBe(true);

    // La página del casamiento usa esa foto como portada.
    await page.getByRole('link', { name: /Tu página/ }).click();
    await openPreview(page);
    await expect.poll(() => previewText(page)).toMatch(/luc[ií]a (y|&) violeta/i);
    const cover = await previewFrame(page).locator('.iv-cover-img').getAttribute('src');
    expect(cover).toBe(saved.photo.src);
  });

  test('el texto del paso es claro y no usa jerga técnica', async ({ page }) => {
    await untilPhotoStep(page);
    const body = await page.getByRole('region', { name: 'Sumá una foto de ustedes' }).innerText();
    expect(body).not.toMatch(/navegador|servidor|JPG, PNG|\bMB\b/i);
    await expect(page.getByText('Podés cambiarla cuando quieras.')).toBeVisible();
  });

  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]] as const) {
    test(`en celular (${w} px): una sola pantalla sin scroll, con la foto centrada y los botones a la vista`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await untilPhotoStep(page);
      await page.getByRole('heading', { name: 'Sumá una foto de ustedes' }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const measure = () => page.evaluate(() => {
        const r = (e: Element) => e.getBoundingClientRect();
        const d = document.documentElement, photo = document.querySelector('.ob-photo')!, next = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Continuar')!;
        return { scrollable: d.scrollHeight > innerHeight + 1, sw: d.scrollWidth, vw: innerWidth, vh: innerHeight, nextBottom: r(next).bottom, nextTop: r(next).top,
          photoCx: (r(photo).left + r(photo).right) / 2, photoLeft: r(photo).left, photoRight: r(photo).right, photoBottom: r(photo).bottom };
      });
      const check = (m: Awaited<ReturnType<typeof measure>>) => {
        expect(m.scrollable).toBe(false);                      // todo entra en una pantalla
        expect(m.sw).toBe(m.vw);                               // sin scroll lateral
        expect(m.nextBottom).toBeLessThanOrEqual(m.vh);        // «Continuar» a la vista
        expect(m.photoLeft).toBeGreaterThanOrEqual(0);
        expect(m.photoRight).toBeLessThanOrEqual(m.vw);
        expect(Math.abs(m.photoCx - m.vw / 2)).toBeLessThan(2);  // la foto está centrada en la pantalla
        expect(m.photoBottom).toBeLessThanOrEqual(m.nextTop + 1); // y no pisa los botones
      };
      check(await measure());
      await page.setInputFiles('input[type=file]', { name: 'nosotras.png', mimeType: 'image/png', buffer: PNG_1PX });
      await page.getByRole('img', { name: 'Tu foto de portada' }).waitFor();
      check(await measure());                                  // y también con la foto ya subida
    });
  }

  test('se puede seguir sin foto: queda la imagen de muestra y se sube después', async ({ page }) => {
    await untilPhotoStep(page);
    await page.getByRole('button', { name: 'Omitir por ahora' }).click();
    await page.waitForURL(/\/panel/);
    await expect.poll(async () => (await stored(page)).photo.kind).toBe('none');
  });

  test('un archivo que no es una foto muestra el motivo y no cambia nada', async ({ page }) => {
    await untilPhotoStep(page);
    await page.setInputFiles('input[type=file]', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });
    await expect(page.getByRole('alert')).toContainText('Ese formato no sirve');
    expect((await stored(page)).photo.kind).toBe('none');
    await expect(page.getByRole('button', { name: /^Subir foto/ })).toBeVisible();
  });

  test('sin los nombres cargados se vuelve al paso anterior', async ({ page }) => {
    await page.goto('/crear/foto', { waitUntil: 'networkidle' });
    await page.waitForURL(/\/crear$/);
  });
});
