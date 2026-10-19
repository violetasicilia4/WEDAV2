import { expect, onboard, stored, test } from './helpers';

const WIDTHS = [320, 360, 390, 430];

for (const w of WIDTHS) {
  test.describe(`Panel · mejora visual (${w} px)`, () => {
    test.use({ viewport: { width: w, height: 844 } });
    test.beforeEach(async ({ page }) => { await onboard(page); });

    test('Regalos: la barra de selección no tapa el final de «Elegir» y no hay scroll lateral', async ({ page }) => {
      await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Luna de miel, 8 regalos/ }).click();
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const bar = await page.locator('.pn-selbar').boundingBox();
      const last = await page.locator('.pn-status-line').boundingBox();
      expect(last!.y + last!.height, `fin del contenido ${JSON.stringify(last)} vs barra ${JSON.stringify(bar)}`).toBeLessThanOrEqual(bar!.y);
      // La barra conserva cantidad y monto sin cortarse.
      const txt = page.locator('.pn-selbar-text');
      await expect(txt).toContainText('8 regalos elegidos · $');
      expect(await txt.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    });

    test('Regalos: seleccionado se distingue con tilde y «Mi lista» deja editar y quitar', async ({ page }) => {
      await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Luna de miel, 8 regalos/ }).click();
      await expect(page.locator('.pn-settile.is-on .pn-gcheck')).toBeVisible();
      await expect(page.locator('.pn-gcard.is-in .pn-gcheck').first()).toBeVisible();
      await page.getByRole('tab', { name: /Mi lista/ }).click();
      await page.getByRole('button', { name: 'Editar Pasaje luna de miel' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
      expect((await stored(page)).gifts.items).toHaveLength(7);
    });
  });
}

test.describe('Panel · invitados, mesas y editor (390 px)', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('Invitados: filas compactas, edición en hoja inferior y la hoja entra en pantalla', async ({ page }) => {
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Marta');
    await page.getByLabel('Apellido').fill('Sosa');
    await page.getByRole('button', { name: 'Agregar' }).last().click();
    const row = page.locator('.pn-table tbody tr').first();
    const h = (await row.boundingBox())!.height;
    expect(h).toBeGreaterThanOrEqual(60);
    expect(h).toBeLessThanOrEqual(76);
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Pendiente');
    await page.getByRole('button', { name: 'Editar a Marta Sosa' }).click();
    const sheet = page.locator('.pn-dialog.is-sheet');
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);
    await page.getByRole('dialog').getByLabel('Asistencia').selectOption({ label: 'Confirmado' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Confirmado');
    expect((await stored(page)).guests[0].status).toBe('confirmed');
  });

  test('Mesas: conteos por mesa, quién queda sin lugar y asignación desde el selector compacto', async ({ page }) => {
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel('Apellido').fill('Paz');
    await page.getByRole('button', { name: 'Agregar' }).last().click();
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    await page.getByLabel('Nuevo grupo o mesa').fill('Mesa 1');
    await page.getByRole('button', { name: 'Crear' }).click();
    const nav = page.getByRole('navigation', { name: 'Ir a una mesa o grupo' });
    await expect(nav.getByRole('link', { name: /Sin lugar 1/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Mesa 1 0/ })).toBeVisible();
    await page.getByLabel('Mover a Ana Paz').selectOption({ label: 'Mesa 1' });
    await expect(nav.getByRole('link', { name: /Mesa 1 1/ })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Sin lugar 0/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('Editor: una sección a la vez con su estado, campos sin tapar por la barra inferior y vista previa que se abre y se cierra', async ({ page }) => {
    await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
    const snav = page.getByRole('navigation', { name: 'Secciones de tu página' });
    await expect(snav.getByRole('button', { name: /Portada/ })).toHaveAttribute('aria-current', 'true');
    await expect(snav.getByRole('button', { name: /Eventos · Sin eventos|Eventos/ })).toBeVisible();
    // Solo los campos de la sección elegida.
    await expect(page.getByLabel('Tu nombre')).toBeVisible();
    await snav.getByRole('button', { name: /Dress code/ }).click();
    await expect(page.getByLabel('Tu nombre')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Mostrar' }).check();
    await page.getByLabel('Título').fill('Elegante sport');
    // El campo en edición queda por encima de la barra inferior.
    const field = (await page.getByLabel('Título').boundingBox())!;
    const bottomNav = (await page.locator('.pn-side').boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual(bottomNav.y);
    await expect(snav.getByRole('button', { name: /Dress code/ })).toContainText('Completa');
    expect((await stored(page)).site.dressCode.title).toBe('Elegante sport');
    // La vista previa es la página real y se cierra con «Volver a editar».
    await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
    await expect.poll(() => page.frameLocator('iframe').locator('#dresscode').count()).toBe(1);
    await page.getByRole('button', { name: 'Volver a editar' }).click();
    await expect(page.getByLabel('Título')).toHaveValue('Elegante sport');
  });

  test('Diálogos: «Datos del casamiento» deja sus botones a la vista aunque el contenido sea largo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/panel', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Editar datos/ }).click();
    const save = page.getByRole('dialog').getByRole('button', { name: 'Guardar' });
    const b = (await save.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(640);
  });

  test('Regalos: las categorías son píldoras seleccionables y filtran el catálogo', async ({ page }) => {
    await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
    const total = await page.locator('.pn-status-line').innerText();
    const chip = page.getByRole('group', { name: 'Categoría' }).getByRole('button').nth(1);
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.locator('.pn-status-line').innerText()).not.toBe(total);
    await page.getByRole('group', { name: 'Categoría' }).getByRole('button', { name: 'Todas' }).click();
    await expect.poll(() => page.locator('.pn-status-line').innerText()).toBe(total);
  });

  test('Invitados: se elimina desde la hoja de edición y se puede deshacer', async ({ page }) => {
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Lola');
    await page.getByLabel('Apellido').fill('Mora');
    await page.getByRole('button', { name: 'Agregar' }).last().click();
    await page.getByRole('button', { name: 'Editar a Lola Mora' }).click();
    await page.getByRole('button', { name: 'Eliminar invitado' }).click();
    expect((await stored(page)).guests).toHaveLength(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    expect((await stored(page)).guests).toHaveLength(1);
  });

  test('Planes: el botón deshabilitado explica por qué y todos los diálogos son hojas con botones a la vista', async ({ page }) => {
    await page.goto('/panel/vista-previa', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('button', { name: 'Elegí un plan' })).toBeDisabled();
    await expect(dlg.getByText('Elegí uno de los tres planes')).toBeVisible();
    const box = (await dlg.boundingBox())!;
    expect(box.x).toBe(0);
    expect(Math.round(box.y + box.height)).toBe(844);
    await expect(dlg.getByRole('button', { name: 'Cerrar' })).toBeVisible();
  });
});
