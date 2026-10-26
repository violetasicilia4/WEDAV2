import { closePreview, expect, nav, onboard, openPreview, previewFrame, previewText, stored, test } from './helpers';

test.describe('Recorridos del panel en celular (390 px)', () => {
  test.beforeEach(async ({ page }) => { await onboard(page); });

  test('Flujo 1: Inicio → Regalos → catálogo → pack → revisión, sin perder nada', async ({ page }) => {
    // Inicio: una sola acción principal que lleva a elegir los primeros regalos.
    await page.getByRole('link', { name: 'Elegir regalos' }).click();
    await expect(page).toHaveURL(/\/panel\/regalos/);

    // Las cuatro solapas entran en el ancho de la pantalla (sin scroll lateral).
    const tabs = page.getByRole('tablist', { name: 'Lista de regalos' }).getByRole('tab');
    await expect(tabs).toHaveCount(4);
    for (const box of await tabs.evaluateAll(els => els.map(e => e.getBoundingClientRect().right))) expect(box).toBeLessThanOrEqual(390);

    // Catálogo → pack «Luna de miel»: se agregan sus 8 regalos y el aviso ofrece «Deshacer».
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    const pack = page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) });
    await pack.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Agregaste 8 regalos.' })).toBeVisible();
    await expect(pack.getByText('En tu lista')).toBeVisible();

    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    const cards = page.getByRole('list', { name: /Regalos de tu lista/ }).getByRole('listitem');
    await expect(cards).toHaveCount(8);
    await expect(page.getByRole('heading', { name: 'Pasaje luna de miel' })).toBeVisible();

    // Quitar uno actualiza la lista al instante; «Deshacer» lo devuelve.
    await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
    await expect(cards).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'Mis regalos (7)' })).toBeVisible();
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(cards).toHaveCount(8);
    await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
    await expect(cards).toHaveCount(7);

    // La vista previa desde Regalos abre la página de regalos real, con los datos actuales.
    await openPreview(page);
    await expect.poll(() => previewText(page)).toContain('Noche en hotel boutique');
    expect(await previewText(page)).not.toContain('Pasaje luna de miel');
    await closePreview(page);

    await page.reload({ waitUntil: 'networkidle' });
    expect((await stored(page)).gifts.items).toHaveLength(7);
  });

  test('Flujo 2: Regalos → cobro (opcional) → volver a la lista → continuar sin alias', async ({ page }) => {
    await nav(page, 'Regalos').click();
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Hogar', exact: true }) }).getByRole('button', { name: 'Agregar' }).click();
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    // Falta el alias, pero no bloquea: el aviso lo explica y se puede seguir.
    await expect(page.getByRole('status').filter({ hasText: 'Falta un paso para recibir aportes' })).toBeVisible();
    await page.getByRole('tab', { name: /Cobro/ }).click();
    await expect(page.getByRole('region', { name: 'Transferencia bancaria' }).getByText('Sin configurar')).toBeVisible();

    // Se puede seguir sin completar el cobro.
    await nav(page, 'Tu página').click();
    await expect(page.getByRole('heading', { name: 'Tu página' })).toBeVisible();
    await nav(page, 'Regalos').click();

    // El alias se guarda mientras se escribe (sin botón «Guardar»).
    await page.getByRole('tab', { name: /Cobro/ }).click();
    await page.getByRole('region', { name: 'Transferencia bancaria' }).getByRole('button', { name: 'Configurar' }).click();
    await page.getByRole('dialog').getByLabel('Alias').fill('lucia.violeta');
    await page.getByRole('dialog').getByRole('button', { name: 'Listo' }).click();
    await expect(page.getByRole('region', { name: 'Transferencia bancaria' }).getByText('Configurado')).toBeVisible();
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    await expect(page.getByRole('list', { name: /Regalos de tu lista/ }).getByRole('listitem')).toHaveCount(8);
    await expect(page.getByText('Falta un paso para recibir aportes')).toHaveCount(0);
    await expect.poll(async () => (await stored(page)).gifts.alias).toBe('lucia.violeta');   // el guardado local es diferido
    await page.reload({ waitUntil: 'networkidle' });
    expect((await stored(page)).gifts.alias).toBe('lucia.violeta');
  });

  test('Flujo 3: Tu página → elegir Eventos → editar → verlo en la vista previa a pantalla completa → volver sin perder datos', async ({ page }) => {
    await nav(page, 'Tu página').click();
    // Primero la estructura de la invitación; los campos de una sección aparecen recién al elegirla.
    await expect(page.getByRole('heading', { name: 'Tu invitación' })).toBeVisible();
    await expect(page.getByLabel('Nombre del lugar')).toHaveCount(0);
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    // La primera fila de eventos ya viene abierta.
    if ((await page.locator('#sec-ceremonia').getAttribute('aria-expanded')) !== 'true') await page.locator('#sec-ceremonia').click();
    await page.getByLabel('Nombre del evento').fill('Ceremonia');
    await page.getByLabel('Nombre del lugar').fill('Parroquia San Isidro');
    await page.getByLabel('Dirección').fill('Calle 123, Ciudad');
    await expect(page.locator('#sec-ceremonia')).toContainText('Ceremonia');

    // La ventana (la página real, recortada en la sección que se edita) refleja lo escrito; la vista previa abre la página real en un pop-up con salida clara.
    await expect(page.frameLocator('.lc-frame').locator('#dia')).toContainText('Parroquia San Isidro');
    await openPreview(page);
    await expect.poll(() => previewText(page)).toContain('Parroquia San Isidro');
    await closePreview(page);
    await expect(page.getByLabel('Nombre del lugar')).toHaveValue('Parroquia San Isidro');
    await page.reload({ waitUntil: 'networkidle' });
    expect((await stored(page)).site.events[0].name).toBe('Parroquia San Isidro');
  });

  test('Flujo 4: quitar y volver a agregar una sección se refleja en la vista previa, sin perder lo cargado', async ({ page }) => {
    await nav(page, 'Tu página').click();
    const inPreview = async () => { await openPreview(page); await previewFrame(page).locator('.iv-cover-img').waitFor(); const n = await previewFrame(page).locator('#confirmar').count(); await closePreview(page); return n; };
    await expect.poll(inPreview).toBe(1);
    await page.getByRole('button', { name: 'Quitar Confirmación de la invitación' }).click();
    // Pasa a «Para agregar» (reversible) y la página ya no la muestra.
    await expect(page.getByRole('button', { name: 'Agregar Confirmación a la invitación' })).toBeVisible();
    await expect.poll(inPreview).toBe(0);
    await page.getByRole('button', { name: 'Agregar Confirmación a la invitación' }).click();
    await expect(page.getByRole('heading', { name: 'Confirmación de asistencia' })).toBeVisible();
    await expect.poll(inPreview).toBe(1);
  });

  test('Flujo 4b: reordenar secciones cambia el orden de la página y se conserva al recargar', async ({ page }) => {
    await nav(page, 'Tu página').click();
    await page.getByRole('button', { name: 'Agregar Dress code a la invitación' }).click();
    await page.getByLabel('Título').fill('Elegante sport');
    await page.getByRole('button', { name: 'Listo' }).click();
    const order = async () => { await openPreview(page); await previewFrame(page).locator('.iv-cover-img').waitFor(); const ids = await previewFrame(page).locator('#confirmar, #dresscode').evaluateAll(els => els.map(e => e.id)); await closePreview(page); return ids; };
    await expect.poll(order).toEqual(['confirmar', 'dresscode']);
    await page.getByRole('button', { name: 'Subir Dress code' }).click();
    await expect.poll(order).toEqual(['dresscode', 'confirmar']);
    await expect.poll(async () => (await stored(page)).site.order.slice(0, 4)).toEqual(['eventos', 'regalos', 'dress', 'rsvp']);
    await page.reload({ waitUntil: 'networkidle' });
    await expect.poll(order).toEqual(['dresscode', 'confirmar']);
  });

  test('Flujo 4c: dirección corta con «Cómo llegar» a Maps, dress code con colores propios, texto libre y acceso a regalos', async ({ page }) => {
    await page.goto('/panel/regalos', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) }).getByRole('button', { name: 'Agregar' }).click();
    await nav(page, 'Tu página').click();

    // Eventos: la tarjeta muestra solo calle y altura; «Cómo llegar» usa la dirección completa y hay un acceso a Google Maps para fijar el lugar.
    await page.getByRole('button', { name: /^Editar Eventos/ }).click();
    await page.getByLabel('Nombre del evento').fill('Ceremonia');
    await page.getByLabel('Nombre del lugar').fill('Parroquia San Isidro');
    await page.getByLabel('Dirección').fill('Av. del Libertador 1234, C1425 CABA, Argentina');
    await page.getByLabel('Horario').selectOption('18:00');
    await expect(page.getByText('En la tarjeta se ve «Av. del Libertador 1234»')).toBeVisible();
    await expect(page.getByRole('link', { name: /Abrir Google Maps para copiar el enlace/ })).toHaveAttribute('href', /google\.com\/maps\/search/);
    await expect(page.getByLabel('Enlace de Google Maps')).toBeVisible();
    await page.getByRole('button', { name: 'Listo' }).click();

    // Dress code: círculos de colores que se pueden apagar y cuyo color elige la pareja.
    await page.getByRole('button', { name: 'Agregar Dress code a la invitación' }).click();
    await page.getByLabel('Título').fill('Elegante sport');
    await page.getByLabel('Color del círculo 1').evaluate((el: HTMLInputElement) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, '#ff6699');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByLabel('Nombre del círculo 1').fill('Rosa');
    await page.getByRole('button', { name: 'Listo' }).click();

    // Texto libre y sección de regalos.
    await page.getByRole('button', { name: 'Agregar Texto libre a la invitación' }).click();
    await page.getByLabel('Título').fill('Un aviso');
    await page.getByLabel('Mensaje').fill('Habrá estacionamiento en el lugar.');
    await page.getByRole('button', { name: 'Listo' }).click();
    await page.getByRole('button', { name: /^Editar Regalos/ }).click();
    await page.getByLabel('Título').fill('Si querés regalarnos algo');
    await page.getByLabel('Texto del botón').fill('Quiero regalar');
    await page.getByRole('button', { name: 'Listo' }).click();
    await expect.poll(async () => (await stored(page)).site.giftsSection.button).toBe('Quiero regalar');

    await page.goto('/sitio/lucia-y-violeta?borrador', { waitUntil: 'networkidle' });
    await expect(page.locator('.iv-card-addr').first()).toHaveText('Av. del Libertador 1234');
    expect(decodeURIComponent((await page.locator('.iv-card-map').first().getAttribute('href')) ?? '')).toContain('C1425 CABA, Argentina');
    await expect(page.locator('.iv-swatches li')).toHaveCount(4);
    await expect(page.locator('.iv-swatches i').first()).toHaveCSS('background-color', 'rgb(255, 102, 153)');
    await expect(page.locator('#texto')).toContainText('Habrá estacionamiento en el lugar.');
    await expect(page.locator('#regalos h2')).toHaveText('Si querés regalarnos algo');
    await page.getByRole('link', { name: 'Quiero regalar' }).click();
    await expect(page).toHaveURL(/\/sitio\/lucia-y-violeta\/regalos/);

    // Los círculos se pueden apagar y la página los saca.
    await page.goto('/panel/sitio', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Editar Dress code/ }).click();
    await page.getByLabel('Mostrar círculos de colores sugeridos').uncheck();
    await expect.poll(async () => (await stored(page)).site.dressCode.showColors).toBe(false);
    await page.goto('/sitio/lucia-y-violeta?borrador', { waitUntil: 'networkidle' });
    await expect(page.locator('.iv-swatches')).toHaveCount(0);
  });

  test('Tipografía: en la página pública ningún título se parte en dos renglones ni hay scroll horizontal, en celulares angostos y anchos', async ({ page }) => {
    for (const w of [320, 390, 430]) {
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto('/ejemplo', { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const multi = [...document.querySelectorAll('.iv-cover-title, .iv-h2, .iv-dress-title, .iv-playlist-title, .iv-welcome-date')].filter(e => {
          const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 0 && b.height / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2) > 1.5;
        }).map(e => (e as HTMLElement).innerText);
        return { multi, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      expect(r, `ancho ${w}`).toEqual({ multi: [], overflow: false });
    }
  });

  test('Flujo 5: invitados → alta manual → importar (duplicados y errores) → exportar', async ({ page }) => {
    await nav(page, 'Invitados').click();
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Ana');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^\s*1 de 1 invitado/ })).toBeVisible();

    await page.getByRole('button', { name: 'Importar', exact: true }).click();
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
    await expect.poll(async () => (await stored(page)).guests).toHaveLength(2);

    // Un «Deshacer» pendiente no sobrevive a un cambio de pantalla: no puede pisar cambios posteriores.
    await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible();
    await nav(page, 'Inicio').click();
    await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0);

    await nav(page, 'Invitados').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar', exact: true }).click()]);
    expect(download.suggestedFilename()).toBe('invitados-weda.xlsx');
  });

  test('Flujo 6: mesas y grupos → crear y asignar sin ser obligatorio', async ({ page }) => {
    await nav(page, 'Invitados').click();
    await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Marta');
    await page.getByLabel('Apellido').fill('Sosa');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    // Sin crear nada, ya hay una mesa de ejemplo («Mesa 1»): usar mesas no es obligatorio. Se crea otra desde el diálogo.
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    await expect(page.getByRole('heading', { name: 'Mesa 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Crear mesa' }).click();
    await page.getByRole('dialog').getByLabel('Nombre').fill('Familia');
    await page.getByRole('dialog').getByRole('button', { name: 'Crear', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Familia' })).toBeVisible();
    // Asignar desde la lista de invitados: en el celular la fila es compacta y el grupo se cambia desde la hoja de edición.
    await page.getByRole('button', { name: /^Lista de invitados/ }).click();
    await page.getByRole('button', { name: 'Editar a Marta Sosa' }).click();
    await page.getByRole('dialog').getByLabel('Grupo o mesa').selectOption({ label: 'Familia' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' })).toContainText('Familia');
    await expect.poll(async () => (await stored(page)).guests[0].groupId).not.toBeNull();   // el guardado local es diferido
    const state = await stored(page);
    expect(state.groups.map((g: { name: string }) => g.name)).toEqual(['Mesa 1', 'Familia']);
    expect(state.guests[0].groupId).toBe(state.groups[1].id);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    await expect(page.getByRole('list', { name: 'Mesas y grupos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Familia' }) })).toContainText('Marta Sosa');
  });

  test('Publicar → «Ver link» de Invitación y de Completo muestran la sección de regalos con su botón, porque esos planes incluyen la lista', async ({ page }) => {
    await nav(page, 'Regalos').click();
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) }).getByRole('button', { name: 'Agregar' }).click();
    await page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true }).click();
    const links: Record<string, string> = {};
    for (const plan of ['Regalos', 'Invitación', 'Completo']) links[plan] = (await page.getByRole('link', { name: new RegExp(`Ver el link de ${plan}`) }).getAttribute('href'))!;
    await page.keyboard.press('Escape');
    for (const plan of ['Invitación', 'Completo']) {
      await page.goto(links[plan]!, { waitUntil: 'networkidle' });
      const sec = page.locator('#regalos');
      // Solo título, texto y botón: la invitación no muestra regalos de la lista; el botón lleva a la página de regalos.
      await expect(sec.getByRole('heading', { name: '¿Querés regalarnos algo?' })).toBeVisible();
      await expect(sec).not.toContainText('Pasaje luna de miel');
      await expect(sec.getByRole('link', { name: 'Ver lista de regalos' })).toHaveAttribute('href', /\/regalos/);
    }
    // El plan Regalos es solo la lista: el link abre directamente la página de regalos.
    await page.goto(links['Regalos']!, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/regalos/);
    await expect(page.getByText('Pasaje luna de miel')).toBeVisible();
  });

  test('Flujo 7: elegir plan → pagar (simulado) → publicada → mejorar pagando la diferencia → bajar y volver a publicar', async ({ page }) => {
    await page.goto('/panel/vista-previa');
    await expect(page.getByText('Todavía no está publicada')).toBeVisible();
    await page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(page.getByRole('link', { name: /Ver el link de/ })).toHaveCount(3);
    await page.getByRole('button', { name: 'Publicar Invitación' }).click();
    // Revisión: aclara que es un pago de prueba y no cambia nada hasta pagar.
    await expect(page.getByText('No se cobra nada ni se guardan datos de pago.')).toBeVisible();
    expect((await stored(page)).publication).toBeNull();
    await page.getByRole('button', { name: 'Volver', exact: true }).click();
    await page.getByRole('button', { name: 'Publicar Invitación' }).click();
    await page.getByRole('button', { name: /^Pagar / }).click();
    await expect(page.getByRole('heading', { name: '¡Pagaste tu plan Invitación!' })).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => ((await stored(page)) as { planId: string }).planId).toBe('invitacion');
    const first = (await stored(page)) as { planId: string; publication: { live: boolean; planId: string; payments: { kind: string; amount: number }[] } };
    expect(first.planId).toBe('invitacion');
    expect(first.publication.live).toBe(true);
    expect(first.publication.payments).toHaveLength(1);
    await page.getByRole('button', { name: 'Listo' }).click();
    // El botón de la cabecera pasa a «Publicada» y abre la gestión.
    const head = page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true });
    await head.click();
    await expect(page.getByRole('heading', { name: 'Tu publicación' })).toBeVisible();
    // Mejorar a Completo: solo la diferencia.
    await page.getByRole('button', { name: 'Mejorar a Completo' }).click();
    await expect(page.getByText('Pagás la diferencia')).toBeVisible();
    await page.getByRole('button', { name: /^Pagar / }).click();
    await expect(page.getByRole('heading', { name: '¡Pagaste tu plan Completo!' })).toBeVisible({ timeout: 10000 });
    await expect.poll(async () => ((await stored(page)) as { planId: string }).planId).toBe('completo');
    const up = (await stored(page)) as { planId: string; publication: { payments: { kind: string; amount: number }[] } };
    expect(up.planId).toBe('completo');
    expect(up.publication.payments.map(x => x.kind)).toEqual(['publish', 'upgrade']);
    await page.getByRole('button', { name: 'Listo' }).click();
    // Bajar la página (con confirmación) y volver a publicar sin pagar de nuevo.
    await page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true }).click();
    await page.getByRole('button', { name: 'Bajar la página' }).click();
    await page.getByRole('button', { name: 'Sí, bajar la página' }).click();
    // El guardado local es diferido: se espera a que se escriba.
    await expect.poll(async () => ((await stored(page)) as { publication: { live: boolean } }).publication.live).toBe(false);
    await page.getByRole('button', { name: 'Volver a publicar' }).click();
    await expect.poll(async () => ((await stored(page)) as { publication: { live: boolean } }).publication.live).toBe(true);
    expect(((await stored(page)) as { publication: { payments: unknown[] } }).publication.payments).toHaveLength(2);
    // La publicación sobrevive a recargar.
    await page.reload();
    await expect(page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true })).toBeVisible();
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
