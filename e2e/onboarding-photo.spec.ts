import { expect, PNG_1PX, previewText, stored, test } from './helpers';

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
    await expect(page.locator('.pn-cover-preview figcaption')).toHaveText('Lucía y Violeta');
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
    await expect.poll(() => previewText(page)).toMatch(/luc[ií]a y violeta/i);
    const cover = await page.frameLocator('iframe').locator('.iv-cover-img').getAttribute('src');
    expect(cover).toBe(saved.photo.src);
  });

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
