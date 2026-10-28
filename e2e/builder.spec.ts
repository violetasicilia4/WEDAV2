import type { Page } from '@playwright/test';
import { expect, nav, onboard, stored, test } from './helpers';

/* Constructor «Tu página» en el celular (iteración 2026-10-28): orientación mientras se edita.
   Mientras se edita una sección, una barra fija dice dónde estás (ícono + nombre), cómo volver (flecha) y «Listo»; la ventana en vivo
   va pegada debajo, en el mismo bloque fijo y opaco. Estas pruebas miden posiciones reales en pantalla, no solo que los elementos existan. */

const stick = (page: Page) => page.locator('.ed-stick');
const back = (page: Page) => page.getByRole('button', { name: 'Volver a Tu invitación' });
const done = (page: Page) => page.getByRole('button', { name: 'Listo', exact: true });

/** ¿El elemento está dentro de la pantalla visible? */
async function onScreen(page: Page, loc: ReturnType<Page['locator']>) {
  const b = await loc.boundingBox();
  const vh = page.viewportSize()!.height;
  return !!b && b.y >= 0 && b.y + b.height <= vh;
}

test.describe('Constructor en el celular: barra fija, contexto y vista previa', () => {
  test.beforeEach(async ({ page }) => {
    await onboard(page);
    await nav(page, 'Tu página').click();
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
  });

  test('al editar una sección larga, volver y «Listo» siguen a la vista al final del formulario, y nada del formulario asoma sobre la ventana', async ({ page }) => {
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    await expect(stick(page)).toContainText('Eventos');
    expect(await onScreen(page, back(page))).toBe(true);
    expect(await onScreen(page, done(page))).toBe(true);
    // Al final del formulario (el lugar donde antes había que ir a buscar «Listo»).
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(250);
    expect(await onScreen(page, back(page))).toBe(true);
    expect(await onScreen(page, done(page))).toBe(true);
    // Sobre la ventana en vivo hay barra (opaca), no texto del formulario pasando por detrás.
    const live = (await page.locator('.ed-live .lc-window').boundingBox())!;
    const above = await page.evaluate(y => { const el = document.elementFromPoint(20, y); return el?.closest('.ed-form') ? 'formulario' : el?.closest('.ed-stick') ? 'barra' : 'otro'; }, Math.max(1, live.y - 4));
    expect(above).toBe('barra');
    // «Listo» vuelve a la estructura, arriba de todo y con la sección en su lugar.
    await done(page).click();
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Editar Eventos/ })).toBeVisible();
  });

  test('editar no prende ni apaga la sección; quitar es una acción aparte, reversible, y no borra lo cargado', async ({ page }) => {
    const rsvpOn = async () => (await stored(page)).site.rsvp.enabled as boolean;
    expect(await rsvpOn()).toBe(true);
    await page.getByRole('button', { name: /^Editar Confirmación/ }).click();
    await expect(stick(page)).toContainText('Confirmación');
    await done(page).click();
    expect(await rsvpOn()).toBe(true);                         // entrar y salir de la edición no cambia si se muestra

    // Agregar Texto libre abre su edición; escribir, quitarla y volver a agregarla conserva el texto.
    await page.getByRole('button', { name: 'Agregar Texto libre a la invitación' }).click();
    await page.getByLabel('Título').fill('Un aviso');
    // «Quitar de la invitación» está al pie, lejos de «Listo».
    const remove = page.getByRole('button', { name: 'Quitar de la invitación' });
    const r = (await remove.boundingBox())!, d = (await done(page).boundingBox())!;
    expect(r.y - (d.y + d.height)).toBeGreaterThan(100);
    await remove.click();
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    await expect.poll(async () => (await stored(page)).site.note.enabled).toBe(false);
    await page.getByRole('button', { name: 'Agregar Texto libre a la invitación' }).click();
    await expect(page.getByLabel('Título')).toHaveValue('Un aviso');
  });

  test('un texto largo se ve en la ventana y en «Cómo queda»; «Seguir editando» vuelve a la misma sección con lo escrito', async ({ page }) => {
    await page.getByRole('button', { name: 'Agregar Texto libre a la invitación' }).click();
    const long = 'Les pedimos llegar temprano porque el camino de tierra se pone difícil de noche. '.repeat(10).trim();
    await page.getByLabel('Mensaje').fill(long);
    await expect(page.frameLocator('.lc-frame').locator('#texto')).toContainText('camino de tierra');
    // La página completa en el propio editor (la sección queda marcada) y vuelta directa a la edición.
    await page.getByRole('button', { name: 'Cómo queda' }).click();
    const preview = page.frameLocator('iframe[title^="Vista previa de tu invitación"]');
    await expect(preview.locator('#texto')).toContainText('camino de tierra');
    await expect(preview.locator('#texto.ed-on')).toHaveCount(1);
    await page.getByRole('button', { name: 'Seguir editando Texto libre' }).click();
    await expect(page.getByLabel('Mensaje')).toHaveValue(long);
    await expect(stick(page)).toContainText('Texto libre');
    // Sin scroll lateral con el texto largo.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('con un campo enfocado (como al pasar de campo con el teclado), el campo queda a la vista y no tapado por el bloque fijo', async ({ page }) => {
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
    for (const label of ['Nombre del lugar', 'Dirección', 'Enlace de Google Maps']) {
      const field = page.getByLabel(label);
      await field.focus();
      await page.waitForTimeout(250);
      const b = (await field.boundingBox())!;
      const s = (await stick(page).boundingBox())!;
      expect(b.y, `«${label}» debajo del bloque fijo`).toBeGreaterThanOrEqual(s.y + s.height - 1);
      expect(b.y + b.height, `«${label}» dentro de la pantalla`).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
  });

  test('recargar en medio de la edición conserva lo escrito y vuelve a la estructura', async ({ page }) => {
    await page.getByRole('button', { name: 'Agregar Dress code a la invitación' }).click();
    await page.getByLabel('Título').fill('Elegante sport');
    await expect.poll(async () => (await stored(page)).site.dressCode.title).toBe('Elegante sport');
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Editar Dress code/ })).toContainText('Completa');
  });

  for (const width of [320, 360, 430]) {
    test(`a ${width} px: los nombres de las secciones no se cortan, la barra entra y no hay scroll lateral`, async ({ page }) => {
      // Sin recargar: el diseño responde al ancho (recargar justo después del alta cortaba a veces un guardado en curso y dejaba un error en consola).
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(300);
      const cut = await page.locator('.ed-rows:not(.is-add) .ed-text strong').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent));
      expect(cut).toEqual([]);
      await page.getByRole('button', { name: /^Editar Confirmación/ }).click();
      for (const b of [back(page), done(page)]) { const r = (await b.boundingBox())!; expect(r.x + r.width).toBeLessThanOrEqual(width); expect(r.height).toBeGreaterThanOrEqual(44); }
      await expect(page.locator('.ed-now')).toContainText('Confirmación');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });
  }
});
