import { expect, test as base, type Page } from '@playwright/test';

/** Cada test falla si la consola del navegador registra errores. */
export const test = base.extend<{ consoleErrors: string[]; uniqueAccounts: void }>({
  // Las cuentas ahora son reales (servidor + base de datos): un mismo correo no se puede registrar dos veces. Cada test recibe un sufijo propio en el
  // correo (lucia@example.com → lucia+<tag>@example.com) al registrarse o ingresar, así los recorridos no chocan entre sí ni con corridas anteriores.
  uniqueAccounts: [async ({ context }, use, testInfo) => {
    const tag = `w${testInfo.workerIndex}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    await context.route('**/api/auth/*', async route => {
      const req = route.request();
      if (req.method() !== 'POST') return route.continue();
      try {
        const body = JSON.parse(req.postData() ?? '{}');
        if (typeof body.email === 'string' && body.email.includes('@')) {
          const [local, domain] = body.email.split('@');
          return route.continue({ postData: JSON.stringify({ ...body, email: `${local}+${tag}@${domain}` }) });
        }
      } catch { /* cuerpo que no es JSON: se deja pasar */ }
      return route.continue();
    });
    await use();
  }, { auto: true }],
  consoleErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await use(errors);
    expect(errors, 'errores de consola').toEqual([]);
  }, { auto: true }],
});
export { expect };

/** Registro (solo interfaz) + datos del casamiento de Lucía y Violeta, sin fecha, sin lugar y sin foto. Recorre las tres pantallas actuales del onboarding
 *  (nombres → fecha y lugar → foto) y termina en /panel. Los tests de onboarding recorren la foto de verdad. */
export async function onboard(page: Page, first = 'Lucía', second = 'Violeta') {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', 'lucia@example.com');
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  await fillNamesAndContinue(page, first, second);
  await skipDateAndPlace(page);
  await page.waitForURL(/\/crear\/foto/);
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.waitForURL(/\/panel/);
}
/** Paso 1 del onboarding: nombres y «Continuar». Deja la página en /crear/fecha. */
export async function fillNamesAndContinue(page: Page, first = 'Lucía', second = 'Violeta') {
  await page.fill('#on-first', first);
  await page.fill('#on-second', second);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/fecha/);
}
/** Paso 2 (fecha y lugar): ambos son opcionales; se dejan vacíos y se continúa. Deja la página en /crear/foto. */
export async function skipDateAndPlace(page: Page) {
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/foto/);
}

export const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name });
export const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}'));
/** El iframe de la vista previa (el pop-up «Vista previa»). En «Tu página» hay además la ventana en vivo (`.lc-frame`), por eso no alcanza con `iframe`. */
export const previewFrame = (page: Page) => page.getByRole('dialog').frameLocator('iframe');
/** Texto de la página pública que muestra la vista previa (puede estar en mayúsculas por estilo). */
export const previewText = (page: Page) => previewFrame(page).locator('body').innerText();

/** PNG de 1×1 px: alcanza para probar la carga de una foto. */
export const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** La cabecera del panel abre la vista previa en un pop-up (formato web en compu, celular en el celular). */
export async function openPreview(page: Page) {
  await page.getByRole('button', { name: 'Vista previa', exact: true }).first().click();
  await expect(page.getByRole('dialog').locator('iframe')).toBeVisible();
}
export async function closePreview(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
