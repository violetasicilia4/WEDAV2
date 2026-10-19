import { expect, test as base, type Page } from '@playwright/test';

/** Cada test falla si la consola del navegador registra errores. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await use(errors);
    expect(errors, 'errores de consola').toEqual([]);
  }, { auto: true }],
});
export { expect };

/** Registro (solo interfaz) + datos del casamiento de Lucía y Violeta, sin fecha, sin foto. Termina en /panel. */
export async function onboard(page: Page, first = 'Lucía', second = 'Violeta') {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', 'lucia@example.com');
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  await page.fill('#on-first', first);
  await page.fill('#on-second', second);
  await page.getByRole('switch', { name: 'Todavía no tenemos fecha' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  // Paso de la foto: acá se omite; los tests de onboarding lo recorren con foto.
  await page.waitForURL(/\/crear\/foto/);
  await page.getByRole('button', { name: 'Ahora no, la subo después' }).click();
  await page.waitForURL(/\/panel/);
}

export const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name });
export const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}'));
/** Texto de la página pública que muestra el iframe de la vista previa (puede estar en mayúsculas por estilo). */
export const previewText = (page: Page) => page.frameLocator('iframe').locator('body').innerText();

/** PNG de 1×1 px: alcanza para probar la carga de una foto. */
export const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** En el celular la vista previa del editor se abre a pantalla completa con «Vista previa»; en escritorio ya está al lado. */
export async function openPreview(page: Page) {
  const btn = page.getByRole('button', { name: 'Vista previa', exact: true });
  if (await btn.isVisible().catch(() => false)) await btn.click();
  await expect(page.locator('iframe')).toBeVisible();
}
