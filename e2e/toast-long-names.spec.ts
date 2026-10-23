import { expect, nav, onboard, stored, test } from './helpers';

/* Regresión (hallazgo de las secuencias exploratorias, 2026-10-23): el aviso «Quitaste «…»» con «Deshacer» ponía el botón fuera de la pantalla cuando el nombre
   era una sola palabra larga (50 letras sin espacios): el texto no se partía y empujaba la acción. Sin «Deshacer» a la vista no se puede deshacer. */

const LONG = 'A'.repeat(50);

for (const width of [320, 390, 1280]) {
  test.describe(`Aviso con acción y nombres largos (${width} px)`, () => {
    test.beforeEach(async ({ page }) => { await page.setViewportSize({ width, height: 800 }); await onboard(page); });

    const insideViewport = async (page: import('@playwright/test').Page, name: string) => {
      const toast = page.locator('.pn-toast');
      await expect(toast).toBeVisible();
      const undo = toast.getByRole('button', { name });
      await expect(undo).toBeVisible();
      const [u, t] = await Promise.all([undo.boundingBox(), toast.boundingBox()]);
      expect(u!.x, 'el botón empieza dentro de la pantalla').toBeGreaterThanOrEqual(0);
      expect(u!.x + u!.width, 'el botón termina dentro de la pantalla').toBeLessThanOrEqual(width);
      expect(u!.x + u!.width, 'el botón queda dentro del aviso').toBeLessThanOrEqual(t!.x + t!.width + 1);
      expect(t!.x + t!.width).toBeLessThanOrEqual(width);
    };

    test('quitar un regalo de nombre largo: «Deshacer» queda a la vista y lo devuelve', async ({ page }) => {
      await nav(page, 'Regalos').click();
      await page.getByRole('button', { name: 'Crear regalo' }).first().click();
      const dlg = page.getByRole('dialog');
      await dlg.getByLabel(/Nombre/).first().fill(LONG);
      await dlg.getByLabel(/Monto|Valor/).first().fill('45000');
      await dlg.getByRole('button', { name: /Crear|Guardar|Agregar/ }).last().click();
      await expect(dlg).toHaveCount(0);
      await page.getByRole('tab', { name: /Mis regalos/ }).click();
      await page.getByRole('button', { name: `Quitar ${LONG}` }).click();
      await insideViewport(page, 'Deshacer');
      await page.locator('.pn-toast').getByRole('button', { name: 'Deshacer' }).click();      // un clic real: falla si el botón está fuera de la pantalla
      await expect.poll(async () => (await stored(page)).gifts.items.map((g: { name: string }) => g.name)).toContain(LONG);
    });

    test('eliminar un invitado de nombre largo: «Deshacer» queda a la vista y lo devuelve', async ({ page }) => {
      await nav(page, 'Invitados').click();
      await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
      await page.getByLabel('Nombre', { exact: true }).fill('B'.repeat(38));
      await page.getByLabel('Apellido').fill('C'.repeat(38));
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
      await expect.poll(async () => (await stored(page)).guests.length).toBe(1);
      await page.getByRole('button', { name: /^Eliminar a / }).first().click();
      await insideViewport(page, 'Deshacer');
      await page.locator('.pn-toast').getByRole('button', { name: 'Deshacer' }).click();
      await expect.poll(async () => (await stored(page)).guests.length).toBe(1);
    });
  });
}
