import { closePreview, expect, onboard, openPreview, previewFrame, stored, test } from './helpers';

const WIDTHS = [320, 360, 390, 430];

for (const w of WIDTHS) {
  test.describe(`Panel · mejora visual (${w} px)`, () => {
    test.use({ viewport: { width: w, height: 844 } });
    test.beforeEach(async ({ page }) => { await onboard(page); });

    test('Regalos: el catálogo no tiene scroll lateral, el botón «En tu lista» y los botones de cada pack entran en su tarjeta', async ({ page }) => {
      await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
      // La vista previa carga los estilos de la página pública: el panel no debe romperse después de abrirla (antes, «En tu lista» se descolocaba).
      await openPreview(page);
      await closePreview(page);
      await page.getByRole('tab', { name: 'Catálogo' }).click();
      const pack = page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) });
      await pack.getByRole('button', { name: 'Agregar' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Agregaste 8 regalos.' })).toBeVisible();
      const chip = pack.getByText('En tu lista');
      await expect(chip).toBeVisible();
      const m = await pack.evaluate(card => {
        const r = (e: Element) => e.getBoundingClientRect();
        const c = r(card), chipEl = [...card.querySelectorAll('.rg-pack-chip')][0]!, cover = card.querySelector('.rg-pack-cover')!;
        return { chipH: r(chipEl).height, chipTop: r(chipEl).top - r(cover).top, chipLeft: r(chipEl).left - r(cover).left,
          buttonsInside: [...card.querySelectorAll('.rg-pack-actions .pn-btn')].every(b => r(b).right <= c.right + 0.5 && r(b).left >= c.left - 0.5), sw: document.documentElement.scrollWidth - innerWidth };
      });
      expect(m.chipH).toBeLessThan(40);                    // una sola línea (no ícono arriba y texto abajo)
      expect(m.chipTop).toBeLessThan(20);                  // arriba a la izquierda de la portada del pack, no sobre el título
      expect(m.chipLeft).toBeLessThan(20);
      expect(m.buttonsInside).toBe(true);                  // «Ver qué incluye» y «Quitar pack» nunca se recortan
      expect(m.sw).toBeLessThanOrEqual(0);
    });

    test('Regalos: «Ver qué incluye» abre una hoja a pantalla casi completa, con nombres en un renglón y scroll propio', async ({ page }) => {
      await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Catálogo' }).click();
      await page.getByRole('button', { name: 'Ver qué incluye el pack Luna de miel' }).click();
      const dlg = page.getByRole('dialog');
      await expect(dlg.getByRole('heading', { name: 'Luna de miel' })).toBeVisible();
      const m = await dlg.evaluate(d => {
        const r = d.getBoundingClientRect(), list = d.querySelector('.rg-pack-minis')!;
        return { x: r.x, bottom: r.bottom, h: r.height, vh: innerHeight, oneLine: [...d.querySelectorAll('.rg-mini-name')].every(n => n.scrollHeight <= n.clientHeight + 1), scrolls: list.scrollHeight >= list.clientHeight };
      });
      expect(m.x).toBe(0);
      expect(Math.round(m.bottom)).toBe(m.vh);
      expect(m.h).toBeGreaterThan(m.vh * 0.8);
      expect(m.oneLine).toBe(true);
      expect(m.scrolls).toBe(true);
      await expect(dlg.getByRole('button', { name: 'Agregar pack' })).toBeInViewport();
    });

    test('Regalos: un pack agregado se marca «En tu lista» y «Mis regalos» deja editar y quitar', async ({ page }) => {
      await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Catálogo' }).click();
      const pack = page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) });
      await pack.getByRole('button', { name: 'Agregar' }).click();
      await expect(pack.getByText('En tu lista')).toBeVisible();
      await expect(pack.getByRole('button', { name: 'Quitar pack' })).toBeVisible();
      await page.getByRole('tab', { name: /Mis regalos/ }).click();
      await page.getByRole('button', { name: 'Editar Pasaje luna de miel' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
      await expect.poll(async () => (await stored(page)).gifts.items.length).toBe(7);
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
    const row = page.getByRole('list', { name: 'Lista de invitados' }).getByRole('listitem').first();
    const h = (await row.boundingBox())!.height;
    expect(h).toBeGreaterThanOrEqual(44);                    // objetivo táctil
    expect(h).toBeLessThanOrEqual(140);                      // tarjeta del invitado: nombre, respuesta, grupo, menú y origen sin ocupar media pantalla
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Pendiente');
    await page.getByRole('button', { name: 'Editar a Marta Sosa' }).click();
    const sheet = page.locator('.pn-dialog.is-sheet');
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);
    await page.getByRole('dialog').getByLabel('Asistencia').selectOption({ label: 'Confirmado' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Confirmado');
    await expect.poll(async () => (await stored(page)).guests[0].status).toBe('confirmed');
  });

  test('Mesas: resumen de lugares, quién queda sin mesa y asignación desde el selector de cada mesa', async ({ page }) => {
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel('Apellido').fill('Paz');
    await page.getByRole('button', { name: 'Agregar' }).last().click();
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    // «Mesa 1» ya viene de ejemplo: usar mesas no obliga a crear nada.
    const summary = page.getByRole('list', { name: 'Resumen de mesas' });
    const mesa = page.getByRole('list', { name: 'Mesas y grupos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Mesa 1' }) });
    await expect(summary.getByRole('listitem').filter({ hasText: 'Sin mesa asignada' })).toContainText('1');
    await expect(summary.getByRole('listitem').filter({ hasText: 'Invitados sentados' })).toContainText('0');
    await expect(mesa).toContainText('Mesa vacía');
    await mesa.getByLabel('Sentar un invitado en Mesa 1').selectOption({ label: 'Ana Paz' });
    await expect(mesa).toContainText('Ana Paz');
    await expect(mesa).toContainText('1 persona');
    await expect(summary.getByRole('listitem').filter({ hasText: 'Sin mesa asignada' })).toContainText('0');
    await expect(summary.getByRole('listitem').filter({ hasText: 'Invitados sentados' })).toContainText('1');
    await expect.poll(async () => (await stored(page)).guests[0].groupId).not.toBeNull();
    // Sacarla de la mesa vuelve a dejarla sin mesa.
    await mesa.getByRole('button', { name: 'Sacar a Ana Paz de Mesa 1' }).click();
    await expect(summary.getByRole('listitem').filter({ hasText: 'Sin mesa asignada' })).toContainText('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('Editor: la estructura primero, una sección a la vez con su estado, campos sin tapar por la barra inferior y vista previa que se abre y se cierra', async ({ page }) => {
    await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar Portada/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar Eventos/ })).toBeVisible();
    // Las secciones que no están se ofrecen para agregar, con su propósito.
    await expect(page.getByRole('button', { name: 'Agregar Dress code a la invitación' })).toBeVisible();
    await page.getByRole('button', { name: /Editar Portada/ }).click();
    await expect(page.getByLabel('Tu nombre')).toBeVisible();
    await page.getByRole('button', { name: /Tu invitación/ }).click();
    await page.getByRole('button', { name: 'Agregar Dress code a la invitación' }).click();
    // Solo los campos de la sección elegida.
    await expect(page.getByLabel('Tu nombre')).toHaveCount(0);
    await page.getByLabel('Título').fill('Elegante sport');
    // El campo en edición queda por encima de la barra inferior.
    const field = (await page.getByLabel('Título').boundingBox())!;
    const bottomNav = (await page.locator('.pn-side').boundingBox())!;
    expect(field.y + field.height).toBeLessThanOrEqual(bottomNav.y);
    await expect.poll(async () => (await stored(page)).site.dressCode.title).toBe('Elegante sport'); // el guardado local es diferido (se vuelca al ocultar o cerrar la pestaña)
    // La ventana (página real) ya muestra el título; la vista previa es la página real en un pop-up y se cierra con Escape.
    await expect(page.frameLocator('.lc-frame').locator('#dresscode')).toContainText('Elegante sport');
    await openPreview(page);
    await expect.poll(() => previewFrame(page).locator('#dresscode').count()).toBe(1);
    await closePreview(page);
    await expect(page.getByLabel('Título')).toHaveValue('Elegante sport');
    // «Cómo queda»: la página completa en el propio editor, con la sección que se edita marcada.
    await page.getByRole('button', { name: 'Cómo queda' }).click();
    await expect(page.frameLocator('iframe[title^="Vista previa de tu invitación"]').locator('#dresscode')).toContainText('Elegante sport');
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await page.getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByRole('button', { name: /Editar Dress code. Completa/ })).toBeVisible();
  });

  test('Diálogos: «Datos del casamiento» deja sus botones a la vista aunque el contenido sea largo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/panel', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Editar datos/ }).click();
    const save = page.getByRole('dialog').getByRole('button', { name: 'Guardar' });
    const b = (await save.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(640);
  });

  test('Regalos: un regalo individual del catálogo se agrega y se quita desde su tarjeta (las categorías ya no son un filtro)', async ({ page }) => {
    await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.getByRole('button', { name: 'Regalos individuales' }).click();
    await page.getByRole('button', { name: 'Agregar Excursión en barco a tu lista' }).click();
    await expect.poll(async () => (await stored(page)).gifts.items.map((g: { name: string }) => g.name)).toEqual(['Excursión en barco']);
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    await expect(page.getByRole('heading', { name: 'Excursión en barco' })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar Excursión en barco' }).click();
    await expect.poll(async () => (await stored(page)).gifts.items).toHaveLength(0);
  });

  test('Invitados: se elimina desde la hoja de edición y se puede deshacer', async ({ page }) => {
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Lola');
    await page.getByLabel('Apellido').fill('Mora');
    await page.getByRole('button', { name: 'Agregar' }).last().click();
    await page.getByRole('button', { name: 'Editar a Lola Mora' }).click();
    await page.getByRole('button', { name: 'Eliminar invitado' }).click();
    await expect.poll(async () => (await stored(page)).guests).toHaveLength(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect.poll(async () => (await stored(page)).guests).toHaveLength(1);
  });

  test('Publicar: tres productos con precio y «Ver link», y todos los diálogos son hojas con botones a la vista', async ({ page }) => {
    await page.goto('/panel/vista-previa', { waitUntil: 'networkidle' });
    await page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('heading', { name: '¿Qué querés publicar?' })).toBeVisible();
    await expect(dlg.getByRole('link', { name: /Ver el link de/ })).toHaveCount(3);
    await expect(dlg.getByText('Publicada 1 año')).toHaveCount(3);
    const box = (await dlg.boundingBox())!;
    expect(box.x).toBe(0);
    expect(Math.round(box.y + box.height)).toBe(844);
    await expect(dlg.getByRole('button', { name: 'Cerrar' })).toBeVisible();
  });
});
