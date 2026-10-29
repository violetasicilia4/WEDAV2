import { expect, onboard, stored, test } from './helpers';
import type { Page } from '@playwright/test';

/* Auditoría UX y conversión (2026-10-28). Escenarios ejecutados de docs/auditoria-ux-conversion/personas-and-scenarios.md que no cubría otra prueba.
   Los IDs de cada test coinciden con el inventario. */

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('Persona P · invitado que llega sin link (/encontrar)', () => {
  test('P-02/P-05: texto que no es un link → explica qué pegar; un link de invitación abre esa invitación', async ({ page }) => {
    await page.goto('/encontrar', { waitUntil: 'networkidle' });
    // Ya no hay parejas inventadas que parezcan reales.
    await expect(page.getByRole('link', { name: /Ver su lista/ })).toHaveCount(0);
    const field = page.getByLabel('Link de la invitación');
    await field.fill('Ana y Leo');
    await page.getByRole('button', { name: 'Abrir la invitación' }).click();
    await expect(page.getByRole('alert')).toContainText('Pegá el link completo');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await field.fill('https://weda.app/sitio/no-existe-todavia');
    await page.getByRole('button', { name: 'Abrir la invitación' }).click();
    await expect(page).toHaveURL(/\/sitio\/no-existe-todavia$/);
    await expect(page.getByRole('heading', { name: 'Este sitio no está disponible' })).toBeVisible();
  });
});

test.describe('Persona D · celular: sin scroll lateral en las medidas del brief', () => {
  const WIDTHS: [number, number][] = [[320, 568], [360, 800], [390, 844], [430, 932], [768, 1024], [1280, 800], [1440, 900]];
  const PUBLIC = ['/', '/ejemplo', '/ejemplo/regalos', '/crear/cuenta', '/encontrar', '/privacidad', '/comprobante'];
  for (const [w, h] of WIDTHS) {
    test(`D-05 · ${w}×${h}: páginas públicas`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: w, height: h });
      for (const path of PUBLIC) {
        // «load» y no «networkidle»: el video de la landing mantiene la red ocupada.
        await page.goto(path, { waitUntil: 'load' });
        await page.locator('main, #main, body').first().waitFor();
        expect(await noSideScroll(page), `${path} a ${w} px`).toBeLessThanOrEqual(0);
      }
    });
  }
  for (const [w, h] of [[320, 568], [768, 1024], [1440, 900]] as [number, number][]) {
    test(`D-05 · ${w}×${h}: panel (Inicio, Regalos, Tu página, Invitados, Vista previa)`, async ({ page }) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width: w, height: h });
      await onboard(page);
      for (const path of ['/panel', '/panel/regalos', '/panel/sitio', '/panel/invitados', '/panel/vista-previa']) {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(await noSideScroll(page), `${path} a ${w} px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('Persona K · publicar cuanto antes: el camino mínimo, contado', () => {
  test('K-01: de la landing a la página publicada — acciones contadas', async ({ page }) => {
    let actions = 0;
    const act = async (fn: () => Promise<unknown>) => { await fn(); actions += 1; };
    await page.goto('/', { waitUntil: 'networkidle' });
    await act(() => page.getByRole('link', { name: 'Crear mi evento' }).first().click());
    await page.waitForURL(/\/crear\/cuenta/);
    await act(() => page.fill('#ac-email', 'apurada@example.com'));
    await act(() => page.fill('#ac-pass', 'Clave1234'));
    await act(() => page.getByRole('button', { name: 'Registrarme', exact: true }).click());
    await page.waitForURL(/\/crear$/);
    await act(() => page.fill('#on-first', 'Ana'));
    await act(() => page.fill('#on-second', 'Leo'));
    await act(() => page.getByRole('button', { name: 'Continuar' }).click());
    await page.waitForURL(/\/crear\/fecha/);
    // La fecha se puede dejar vacía: no hace falta tildar nada.
    await act(() => page.getByRole('button', { name: 'Continuar' }).click());
    await page.waitForURL(/\/crear\/foto/);
    await act(() => page.getByRole('button', { name: 'Omitir por ahora' }).click());
    await page.waitForURL(/\/panel/);
    await act(() => page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true }).click());
    await act(() => page.getByRole('button', { name: 'Publicar Celebración', exact: true }).click());
    await act(() => page.getByRole('dialog').getByRole('button', { name: 'Publicar', exact: true }).click());
    await expect(page.getByRole('heading', { name: '¡Tu página está publicada!' })).toBeVisible({ timeout: 15_000 });
    // Medido el 2026-10-28: 12 acciones (4 campos escritos y 8 toques), 5 pantallas (cuenta, nombres, fecha, foto, panel) + el diálogo. Si cambia, actualizar conversion-and-friction.md.
    expect(actions).toBe(12);
    await expect.poll(async () => (await stored(page)).slug).toMatch(/^ana-y-leo/); // el guardado local es diferido
  });
});

test.describe('Persona T · pareja con la página publicada que vuelve a editar', () => {
  test('T-02: lo editado después de publicar se ve recién con «Publicar los cambios», y el link no cambia', async ({ page, context }) => {
    await onboard(page, 'Lucía', 'Violeta');
    const top = page.locator('.pn-top');
    await top.getByRole('button', { name: 'Publicar', exact: true }).click();
    await page.getByRole('button', { name: 'Publicar Celebración', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.getByRole('heading', { name: '¡Tu página está publicada!' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Listo' }).click();
    const slug = (await stored(page)).slug as string;
    // Cambiar los nombres en el panel.
    await page.goto('/panel?editar=datos', { waitUntil: 'networkidle' });
    const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' });
    await dlg.getByLabel('Nombre de tu pareja').fill('Vera');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect.poll(async () => (await stored(page)).couple.second).toBe('Vera');
    // La pública sigue mostrando lo publicado.
    const guest = await context.newPage();
    await guest.goto(`/sitio/${slug}`, { waitUntil: 'networkidle' });
    await expect(guest.locator('body')).toContainText(/Violeta/);
    // «Publicar los cambios» la actualiza, con el mismo link.
    await top.getByRole('button', { name: 'Publicada', exact: true }).click();
    await page.getByRole('button', { name: 'Publicar los cambios' }).click();
    await expect(page.getByText('Listo: tu página ya muestra los cambios.')).toBeVisible({ timeout: 15_000 });
    expect((await stored(page)).slug).toBe(slug);
    await guest.reload({ waitUntil: 'networkidle' });
    await expect(guest.locator('body')).toContainText(/Vera/);
  });
});
