import { expect, nav, onboard, openPreview, previewText, stored, test } from './helpers';

test.describe('Recorridos del panel en celular (390 px)', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('Flujo 1: Inicio → Regalos → selección → revisión, sin perder nada', async ({ page }) => {
    // Inicio: una sola acción principal que lleva a elegir los primeros regalos.
    await page.getByRole('link', { name: /Elegir regalos/ }).click();
    await expect(page).toHaveURL(/\/panel\/regalos/);

    // Las cuatro solapas entran en el ancho de la pantalla (sin scroll lateral).
    const edges = await page.$$eval('.pn-tabs button', bs => bs.map(b => b.getBoundingClientRect().right));
    expect(edges).toHaveLength(4);
    for (const e of edges) expect(e).toBeLessThanOrEqual(390);

    await page.getByRole('button', { name: /Luna de miel, 8 regalos/ }).click();
    await page.getByRole('button', { name: /8 regalos elegidos/ }).click();
    // El aviso «Deshacer» no tapa los botones del diálogo: el clic llega a «Revisar mi lista».
    await page.getByRole('button', { name: 'Revisar mi lista' }).click();
    await expect(page.getByRole('tab', { name: /Mi lista/ })).toHaveAttribute('aria-selected', 'true');

    const cards = page.getByRole('list', { name: 'Regalos de tu lista' }).getByRole('listitem');
    await expect(cards).toHaveCount(8);
    await expect(page.getByText('Pasaje luna de miel')).toBeVisible();

    // Quitar uno actualiza la lista y el resumen al instante; «Deshacer» lo devuelve.
    await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
    await expect(cards).toHaveCount(7);
    await expect(page.getByRole('status').filter({ hasText: /7 regalos ·/ })).toBeVisible();
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(cards).toHaveCount(8);
    await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
    await expect(cards).toHaveCount(7);

    // La representación visual integrada usa los datos reales: la página de regalos se abre en la misma pantalla.
    await page.getByRole('button', { name: 'Ver cómo la ven tus invitados' }).click();
    await expect(page.getByRole('button', { name: 'Ocultar la página de regalos' })).toBeVisible();
    await expect.poll(() => previewText(page)).toContain('Noche en hotel boutique');
    expect(await previewText(page)).not.toContain('Pasaje luna de miel');

    await page.reload({ waitUntil: 'networkidle' });
    expect((await stored(page)).gifts.items).toHaveLength(7);
  });

  test('Flujo 2: Regalos → cobro (opcional) → volver a la lista → continuar sin alias', async ({ page }) => {
    await nav(page, 'Regalos').click();
    await page.getByRole('button', { name: /Hogar, 8 regalos/ }).click();
    await page.getByRole('tab', { name: /Aportes/ }).click();
    await expect(page.getByText('No es obligatorio para seguir armando tu casamiento')).toBeVisible();
    await expect(page.getByText('Estado: sin configurar. Podés dejarlo para después.')).toBeVisible();

    // Se puede seguir sin completar el cobro.
    await nav(page, 'Tu página').click();
    await expect(page.getByRole('heading', { name: 'Tu página' })).toBeVisible();
    await nav(page, 'Regalos').click();

    await page.getByRole('tab', { name: /Aportes/ }).click();
    await page.getByLabel('Tu alias bancario').fill('lucia.violeta');
    await expect(page.getByText('Estado: configurado.')).toBeVisible();
    await expect(page.locator('.pn-alias-card code')).toHaveText('lucia.violeta');
    await page.getByRole('tab', { name: /Mi lista/ }).click();
    await expect(page.getByRole('list', { name: 'Regalos de tu lista' }).getByRole('listitem')).toHaveCount(8);
    expect((await stored(page)).gifts.alias).toBe('lucia.violeta');
  });

  test('Flujo 3: Tu página → elegir Eventos → editar → verlo en la vista previa a pantalla completa → volver sin perder datos', async ({ page }) => {
    await nav(page, 'Tu página').click();
    // Una sola sección a la vez: solo se ven los campos de la portada, no los de los eventos.
    await expect(page.getByRole('navigation', { name: 'Secciones de tu página' })).toBeVisible();
    await expect(page.getByLabel('Nombre del lugar')).toHaveCount(0);
    await page.locator('#sec-eventos').click();
    // La primera fila de eventos ya viene abierta.
    if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
    await page.getByLabel('Nombre del evento').fill('Ceremonia');
    await page.getByLabel('Nombre del lugar').fill('Parroquia San Isidro');
    await page.getByLabel('Dirección').fill('Calle 123, Ciudad');
    await expect(page.locator('#sec-ceremonia')).toContainText('Ceremonia');

    // La vista previa se abre a pantalla completa con los datos reales y tiene una salida clara.
    await page.getByRole('button', { name: 'Vista previa', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Vista previa de tu página' })).toBeVisible();
    await expect.poll(() => previewText(page)).toContain('Parroquia San Isidro');
    await page.getByRole('button', { name: 'Volver a editar' }).click();
    await expect(page.getByRole('dialog', { name: 'Vista previa de tu página' })).toHaveCount(0);
    await expect(page.getByLabel('Nombre del lugar')).toHaveValue('Parroquia San Isidro');
    await page.reload({ waitUntil: 'networkidle' });
    expect((await stored(page)).site.events[0].name).toBe('Parroquia San Isidro');
  });

  test('Flujo 4: mostrar y ocultar secciones se refleja en la vista previa', async ({ page }) => {
    await nav(page, 'Tu página').click();
    await page.locator('#sec-rsvp').click();
    const toggle = page.getByRole('checkbox', { name: 'Mostrar' });
    const inPreview = async () => { await openPreview(page); await page.frameLocator('iframe').locator('.iv-cover-img').waitFor(); const n = await page.frameLocator('iframe').locator('#confirmar').count(); await page.getByRole('button', { name: 'Volver a editar' }).click().catch(() => {}); return n; };
    await expect.poll(inPreview).toBe(1);
    await toggle.uncheck();
    await expect(page.locator('.pn-spanel .pn-sec-status')).toContainText('Oculta');
    await expect.poll(inPreview).toBe(0);
    await toggle.check();
    await expect.poll(inPreview).toBe(1);
  });

  test('Flujo 5: invitados → alta manual → importar (duplicados y errores) → exportar', async ({ page }) => {
    await nav(page, 'Invitados').click();
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^\s*1 de 1 invitado/ })).toBeVisible();

    await page.getByRole('button', { name: /Importar desde Excel/ }).click();
    const csv = 'Nombre,Apellido,Asistencia,Restricción alimentaria\nAna,Pérez,Pendiente,\nBeto,Sosa,Confirmado,\nCarla,,Pendiente,\nDiego,Luna,Quizás,\n';
    await page.setInputFiles('input[type=file]', { name: 'invitados.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    const result = page.locator('.pn-import-result');
    await expect(result).toContainText('1 invitado listo para importar');
    await expect(result).toContainText('Ana Pérez');                 // duplicado nombrado
    await expect(result).toContainText('Fila 4: Escribí el apellido');
    await expect(result).toContainText('Fila 5: No entendemos la asistencia');
    // Nada cambió hasta confirmar.
    expect((await stored(page)).guests).toHaveLength(1);
    await page.getByRole('button', { name: 'Importar 1' }).click();
    expect((await stored(page)).guests).toHaveLength(2);

    // Un «Deshacer» pendiente no sobrevive a un cambio de pantalla: no puede pisar cambios posteriores.
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
    await nav(page, 'Inicio').click();
    await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);

    await nav(page, 'Invitados').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
    expect(download.suggestedFilename()).toBe('invitados-weda.xlsx');
  });

  test('Flujo 6: mesas y grupos → crear y asignar sin ser obligatorio', async ({ page }) => {
    await nav(page, 'Invitados').click();
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Marta');
    await page.getByLabel('Apellido').fill('Sosa');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.getByRole('button', { name: /Mesas y grupos/ }).click();
    await page.getByLabel('Nuevo grupo o mesa').fill('Mesa 1');
    await page.getByRole('button', { name: 'Crear' }).click();
    await expect(page.getByRole('heading', { name: 'Mesa 1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sin grupo' })).toBeVisible();
    // Asignar desde la lista de invitados.
    await page.getByRole('button', { name: /^Invitados/ }).click();
    // En el celular la fila es compacta: el grupo se cambia desde la hoja de edición.
    await page.getByRole('button', { name: 'Editar a Marta Sosa' }).click();
    await page.getByLabel('Grupo o mesa').selectOption({ label: 'Mesa 1' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Mesa 1');
    const state = await stored(page);
    expect(state.groups.map((g: { name: string }) => g.name)).toEqual(['Mesa 1']);
    expect(state.guests[0].groupId).toBe(state.groups[0].id);
    await page.getByRole('button', { name: /Mesas y grupos/ }).click();
    await expect(page.getByRole('heading', { name: 'Mesa 1' })).toBeVisible();
    await expect(page.locator('.pn-group', { has: page.getByRole('heading', { name: 'Mesa 1' }) })).toContainText('Marta Sosa');
  });

  test('Flujo 7: vista previa → plan → resumen de publicación, sin simular pagos', async ({ page }) => {
    // La cabecera ahora abre la vista previa en un pop-up; esta pantalla completa sigue en su ruta.
    await page.goto('/panel/vista-previa');
    await expect(page.getByText('Todavía no está publicada')).toBeVisible();
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    await page.getByRole('radio', { name: /Invitación/ }).check({ force: true });
    await page.getByRole('button', { name: 'Ver resumen con Invitación' }).click();
    await expect(page.getByText('La publicación y el pago todavía no están conectados.')).toBeVisible();
    const pay = page.getByRole('button', { name: /Pagar y publicar/ });
    await expect(pay).toBeDisabled();
    // Mirar el resumen no cambia el sitio ni el plan guardado.
    expect((await stored(page)).planId).toBeNull();
    await page.getByRole('button', { name: 'Cambiar de plan' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Ver como invitado' })).toBeVisible();
  });
});

test.describe('Responsive: sin scroll horizontal', () => {
  for (const width of [320, 360, 390, 430]) {
    test(`${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await onboard(page);
      for (const route of ['/panel', '/panel/regalos', '/panel/invitados', '/panel/invitados?vista=mesas', '/panel/sitio', '/panel/vista-previa']) {
        await page.goto(route, { waitUntil: 'networkidle' });
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        expect(m.sw, route).toBeLessThanOrEqual(m.cw);
      }
    });
  }
});
