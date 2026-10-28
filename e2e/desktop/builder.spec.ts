import { expect, nav, onboard, test } from '../helpers';

/* Constructor «Tu página» en compu (1024, 1280 y 1440 px): edición a la izquierda y la invitación siempre a la vista a la derecha,
   con proporciones útiles (ni el formulario angosto ni la invitación reducida a una miniatura). */

const preview = (page: import('@playwright/test').Page) => page.frameLocator('iframe[title^="Vista previa de tu invitación"]');

for (const width of [1024, 1280, 1440]) {
  test.describe(`Constructor en compu a ${width} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 860 });
      await onboard(page);
      await nav(page, 'Tu página').click();
      await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    });

    test('dos columnas: editor y vista previa a la vez, con anchos útiles y sin scroll lateral', async ({ page }) => {
      const side = (await page.locator('.ed-side').boundingBox())!;
      const view = (await page.locator('.ed-view').boundingBox())!;
      expect(side.width).toBeGreaterThanOrEqual(340);
      expect(view.width).toBeGreaterThanOrEqual(300);
      expect(view.x).toBeGreaterThan(side.x + side.width - 1);           // al lado, no debajo
      expect(view.y).toBeLessThan(side.y + 120);
      await expect(page.getByRole('button', { name: 'Cómo queda' })).toBeHidden();   // en compu no hace falta alternar
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });

    test('abrir una sección la marca en la vista previa; «Listo» queda a la vista con el formulario largo; tocar otra sección en la vista previa la abre', async ({ page }) => {
      // La sección que se edita queda marcada en la invitación (Confirmación existe desde el primer día).
      await page.getByRole('button', { name: /^Editar Confirmación/ }).click();
      await expect(preview(page).locator('#confirmar.ed-on')).toHaveCount(1);
      await page.getByRole('button', { name: 'Volver a Tu invitación' }).click();
      // Eventos tiene el formulario más largo.
      await page.getByRole('button', { name: /^Editar Eventos/ }).click();
      if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(250);
      const d = (await page.getByRole('button', { name: 'Listo', exact: true }).boundingBox())!;
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y + d.height).toBeLessThanOrEqual(860);
      // La vista previa sigue a la vista mientras se scrollea el formulario.
      const v = (await page.locator('.ed-view').boundingBox())!;
      expect(v.y).toBeLessThan(860);
      expect(v.y + v.height).toBeGreaterThan(200);
      await preview(page).locator('.iv-cover').click();
      await expect(page.getByLabel('Tu nombre')).toBeVisible();
      await expect(preview(page).locator('.iv-cover.ed-on')).toHaveCount(1);
    });
  });
}

test('pasar de celular a compu con una sección abierta la mantiene abierta y suma la vista previa al costado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  await nav(page, 'Tu página').click();
  await page.getByRole('button', { name: /^Editar Confirmación/ }).click();
  await expect(page.locator('.ed-now')).toContainText('Confirmación');
  await page.setViewportSize({ width: 1280, height: 860 });
  await expect(page.getByRole('heading', { name: 'Confirmación de asistencia' })).toBeVisible();
  await expect(page.locator('.ed-view')).toBeVisible();
  await expect(preview(page).locator('#confirmar.ed-on')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Confirmación de asistencia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver a Tu invitación' })).toBeVisible();
});
