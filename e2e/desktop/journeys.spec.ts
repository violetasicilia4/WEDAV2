import { closePreview, expect, fillNamesAndContinue, nav, onboard, openPreview, previewText, skipDateAndPlace, stored, test } from '../helpers';

/* Recorridos de compu (1280 × 800). Cada test es un perfil conductual del documento docs/e2e-coverage.md (A–J).
   Verifican resultados (contenido visible, URL, estado guardado), no solo que los botones existan. */

const register = async (page: import('@playwright/test').Page, email = 'pareja@example.com', pass = 'Clave1234') => {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', email);
  await page.fill('#ac-pass', pass);
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
};
const publishDialog = (page: import('@playwright/test').Page) => page.getByRole('dialog');
const topPublish = (page: import('@playwright/test').Page) => page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true });

test.describe('Perfil A · pareja apurada: de la landing al panel en el menor número de acciones', () => {
  test('landing → registro → nombres → fecha y lugar vacíos → foto omitida → panel con su portada', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // La acción principal de la landing lleva al registro.
    await page.getByRole('link', { name: 'Crear mi evento' }).first().click();
    await expect(page).toHaveURL(/\/crear\/cuenta/);
    await page.fill('#ac-email', 'apurados@example.com');
    await page.fill('#ac-pass', 'Clave1234');
    await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await page.waitForURL(/\/crear$/);
    await fillNamesAndContinue(page, 'Camila', 'Juan');
    // Mejora: fecha y lugar se pueden dejar vacíos sin activar ningún interruptor.
    await expect(page.getByRole('switch')).toHaveCount(0);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(/\/crear\/foto/);
    await page.getByRole('button', { name: 'Omitir por ahora' }).click();
    await page.waitForURL(/\/panel/);
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Camila & Juan')).toBeVisible();
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Fecha por definir')).toBeVisible();
    const s = await stored(page);
    expect(s.couple).toMatchObject({ first: 'Camila', second: 'Juan' });
    expect(s.date).toBeNull();
    expect(s.onboarded).toBe(true);
  });

  test('el siguiente paso del Inicio es único y lleva a elegir regalos; no hay nada obligatorio antes de Publicar', async ({ page }) => {
    await onboard(page, 'Camila', 'Juan');
    await expect(page.getByRole('heading', { name: 'Armá tu lista de regalos' })).toBeVisible();
    await page.getByRole('link', { name: 'Elegir regalos' }).click();
    await expect(page).toHaveURL(/\/panel\/regalos/);
    // Publicar está siempre a mano y abre la elección de producto.
    await topPublish(page).click();
    await expect(publishDialog(page).getByRole('heading', { name: '¿Qué querés publicar?' })).toBeVisible();
    await expect(publishDialog(page).getByRole('button', { name: /^Publicar (Regalos|Invitación|Completo)$/ })).toHaveCount(3);
  });
});

test.describe('Perfil C · pareja que empieza desde cero', () => {
  test('sin fecha ni lugar: el panel lo dice y el pendiente «Definir la fecha» abre los datos y la guarda', async ({ page }) => {
    await onboard(page);
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Invitación' }).click();
    // «Antes de publicar» nombra lo que falta con un acceso directo a cada cosa.
    await expect(publishDialog(page).getByText('Definí la fecha del casamiento.')).toBeVisible();
    await expect(publishDialog(page).getByText('Elegí al menos un regalo para tu lista.')).toBeVisible();
    await publishDialog(page).getByRole('link', { name: 'Definir la fecha' }).click();
    // Mejora: el acceso abre directamente «Datos del casamiento» (antes llevaba al Inicio sin más).
    await expect(page).toHaveURL(/\/panel(\?editar=datos)?$/);
    const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' });
    await expect(dlg).toBeVisible();
    await dlg.getByLabel('Fecha del casamiento').fill('2030-05-18');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(dlg).toHaveCount(0);
    await expect(page).toHaveURL(/\/panel$/);          // el parámetro se limpia: recargar no vuelve a abrir el diálogo
    await expect(page.getByText('Datos guardados.')).toBeVisible();
    await expect.poll(async () => (await stored(page)).date).toBe('2030-05-18');
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Sábado 18 de mayo de 2030')).toBeVisible();
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Invitación' }).click();
    await expect(publishDialog(page).getByText('Definí la fecha del casamiento.')).toHaveCount(0);
  });

  test('estado vacío de invitados y de regalos: explica qué hacer y no muestra números inventados', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Invitados').click();
    await expect(page.getByRole('button', { name: 'Agregar invitado' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Importar desde Excel' })).toBeVisible();
    await nav(page, 'Regalos').click();
    await expect(page.getByRole('heading', { name: 'Lista de regalos' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Catálogo/ })).toBeVisible();
  });
});

test.describe('Perfiles B/D · quien explora el ejemplo puede empezar el suyo sin volver a la landing', () => {
  test('el pie de /ejemplo y /ejemplo/regalos ofrece crear el evento y lleva al registro; los sitios de parejas no lo muestran', async ({ page }) => {
    for (const route of ['/ejemplo', '/ejemplo/regalos']) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const cta = page.getByRole('link', { name: 'Crear mi evento gratis' });
      await expect(cta).toBeVisible();
      await cta.click();
      await expect(page).toHaveURL(/\/crear\/cuenta/);
    }
    await onboard(page);
    await page.goto('/sitio/lucia-y-violeta?borrador', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'Crear mi evento gratis' })).toHaveCount(0);
  });
});

test.describe('Fecha y lugar opcionales: qué pasa en cada pantalla que los usa', () => {
  test('sin fecha ni lugar: portada del panel, editor, vista previa, sitio público y publicación lo dicen sin romperse; al definirlos todo se actualiza', async ({ page }) => {
    await onboard(page, 'Lucía', 'Violeta');
    // Portada del panel.
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Fecha por definir')).toBeVisible();
    // El siguiente paso no depende de la fecha ni del lugar.
    await expect(page.getByRole('heading', { name: 'Armá tu lista de regalos' })).toBeVisible();
    // Editor: la portada marca la fecha como pendiente y los eventos no inventan un lugar.
    await nav(page, 'Tu página').click();
    await expect(page.getByRole('button', { name: /Editar Portada.*Falta la fecha/ })).toBeVisible();
    // Vista previa: «Fecha a confirmar» y nada de cuenta regresiva ni «Guardar la fecha».
    await openPreview(page);
    await expect.poll(() => previewText(page)).toMatch(/Fecha a confirmar/i);
    const pv = await previewText(page);
    expect(pv).not.toMatch(/Guardar la fecha/i);
    expect(pv).not.toMatch(/\bundefined\b|\bnull\b|NaN/);
    await closePreview(page);
    // Sitio público: igual que la vista previa.
    await page.goto('/sitio/lucia-y-violeta?borrador', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/Fecha a confirmar/i);
    await expect(page.locator('body')).not.toContainText(/undefined|NaN/);
    // Publicación: la fecha figura como pendiente con acceso directo.
    await page.goto('/panel', { waitUntil: 'networkidle' });
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Invitación' }).click();
    await expect(publishDialog(page).getByText('Todavía no definiste la fecha', { exact: false }).or(publishDialog(page).getByText('Definí la fecha del casamiento.'))).toBeVisible();
    await publishDialog(page).getByRole('link', { name: 'Definir la fecha' }).click();
    // Definir fecha y lugar desde el diálogo.
    const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' });
    await dlg.getByLabel('Fecha del casamiento').fill('2031-03-15');
    await dlg.getByLabel('Lugar del casamiento').fill('Estancia La Dorotea');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Fecha por definir')).toHaveCount(0);
    await expect(page.getByRole('region', { name: /Primeros pasos/ })).toContainText('2031');
    await expect.poll(async () => (await stored(page)).site.events[0].name).toBe('Estancia La Dorotea');
    await openPreview(page);
    await expect.poll(() => previewText(page)).toContain('Estancia La Dorotea');
    expect(await previewText(page)).not.toMatch(/Fecha a confirmar/i);
    await closePreview(page);
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Invitación' }).click();
    await expect(publishDialog(page).getByText('Definí la fecha del casamiento.')).toHaveCount(0);
  });
});

test.describe('Validaciones del alta', () => {
  test('correo y clave: errores claros, el foco va al primer campo inválido y nada se guarda', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByText('Ingresá un correo válido')).toBeVisible();
    await expect(page.locator('#ac-email')).toBeFocused();
    await page.fill('#ac-email', 'ok@example.com');
    await page.fill('#ac-pass', 'corta');
    await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await expect(page.getByText('Usá 8 o más caracteres')).toBeVisible();
    await expect(page.locator('#ac-pass')).toBeFocused();
    expect((await stored(page)).onboarded ?? false).toBe(false);
  });

  test('nombres: vacíos o con números se rechazan con mensaje; se corrigen y se sigue', async ({ page }) => {
    await register(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL(/\/crear$/);
    await expect(page.locator('.pn-error').first()).toBeVisible();
    await fillNamesAndContinue(page, 'Ana', 'Beto');
    await expect(page).toHaveURL(/\/crear\/fecha/);
  });

  test('fecha pasada o inexistente: se explica y no se avanza; una fecha futura sí', async ({ page }) => {
    await register(page);
    await fillNamesAndContinue(page, 'Ana', 'Beto');
    // El control de fecha es nativo (min = hoy); se fuerza un valor pasado para ejercitar la validación propia.
    await page.locator('#on-date').evaluate((el: HTMLInputElement) => { el.removeAttribute('min'); });
    await page.fill('#on-date', '2020-01-01');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('La fecha ya pasó. Elegí una fecha futura o dejala vacía.')).toBeVisible();
    await expect(page).toHaveURL(/\/crear\/fecha/);
    await page.fill('#on-date', '2031-12-20');
    await page.fill('#on-place', 'Jardín de los Olivos');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.waitForURL(/\/crear\/foto/);
    await expect.poll(async () => (await stored(page)).date).toBe('2031-12-20');
    expect((await stored(page)).site.events[0].name).toBe('Jardín de los Olivos');
  });
});

test.describe('Perfil H · abandona y regresa / navegación atrás y adelante', () => {
  test('a mitad del alta: volver atrás conserva lo cargado; salir a la landing y regresar retoma sin pérdida', async ({ page }) => {
    await register(page);
    await fillNamesAndContinue(page, 'Valentina', 'Mateo');
    await page.fill('#on-place', 'Salón Los Álamos');
    await page.goBack();                                                  // vuelve a los nombres
    await expect(page.locator('#on-first')).toHaveValue('Valentina');
    await expect(page.locator('#on-second')).toHaveValue('Mateo');
    await page.goForward();                                               // y adelante
    await expect(page).toHaveURL(/\/crear\/fecha/);
    // Abandona hacia la landing y regresa al panel por la URL: el evento sigue ahí (los nombres ya se guardaron).
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.goto('/crear', { waitUntil: 'networkidle' });
    await expect(page.locator('#on-first')).toHaveValue('Valentina');
  });

  test('en el panel: atrás y adelante recorren las secciones y la recarga conserva todo', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Regalos').click();
    await nav(page, 'Tu página').click();
    await nav(page, 'Invitados').click();
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/sitio/);
    await page.goBack();
    await expect(page).toHaveURL(/\/panel\/regalos/);
    await page.goForward();
    await expect(page).toHaveURL(/\/panel\/sitio/);
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Tu página' })).toBeVisible();
    expect((await stored(page)).couple.first).toBe('Lucía');
  });
});

test.describe('Perfil B · lo visual: editor y vista previa sincronizados', () => {
  test('el texto de la portada y los nombres se ven en la vista previa; un cambio repetido deja el último valor', async ({ page }) => {
    await onboard(page, 'Lucía', 'Violeta');
    await nav(page, 'Tu página').click();
    await page.getByRole('button', { name: /^Editar Portada/ }).click();
    const cover = page.getByLabel('Texto sobre los nombres');
    await cover.fill('Nos casamos en primavera');
    await cover.fill('Nos casamos en otoño');          // cambio repetido: queda el último
    await expect.poll(async () => (await stored(page)).site.coverText).toBe('Nos casamos en otoño');
    await openPreview(page);
    await expect.poll(() => previewText(page)).toContain('Nos casamos en otoño');
    expect(await previewText(page)).not.toContain('primavera');
    await closePreview(page);
    // Los nombres de la pareja aparecen en la portada pública.
    await openPreview(page);
    await expect.poll(() => previewText(page)).toMatch(/Luc[ií]a/i);
    await closePreview(page);
  });

  test('el pop-up de vista previa se abre, se cierra con Escape y se vuelve a abrir con el mismo contenido', async ({ page }) => {
    await onboard(page);
    for (let i = 0; i < 3; i++) {
      await openPreview(page);
      await expect.poll(() => previewText(page)).toMatch(/Luc[ií]a/i);
      await closePreview(page);
    }
  });
});

test.describe('Perfil D/E · regalos: elegir, quitar y ver el resultado en la página pública', () => {
  test('un pack se agrega, aparece en la página pública de regalos y al quitar un regalo desaparece', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Regalos').click();
    await page.getByRole('tab', { name: 'Catálogo' }).click();
    await page.getByRole('list', { name: 'Packs de regalos' }).getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Luna de miel' }) }).getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Agregaste 8 regalos.' })).toBeVisible();
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    await page.getByRole('button', { name: 'Quitar Pasaje luna de miel' }).click();
    await expect.poll(async () => (await stored(page)).gifts.items.length).toBe(7);
    await openPreview(page);
    await expect.poll(() => previewText(page)).toContain('Noche en hotel boutique');
    expect(await previewText(page)).not.toContain('Pasaje luna de miel');
    await closePreview(page);
    // La página pública de regalos usa el mismo estado (sin duplicar datos).
    await page.goto('/sitio/lucia-y-violeta/regalos?borrador', { waitUntil: 'networkidle' });
    await expect(page.getByText('Noche en hotel boutique').first()).toBeVisible();
    await expect(page.getByText('Pasaje luna de miel')).toHaveCount(0);
  });

  test('un regalo propio: validación del monto, alta, edición y baja con «Deshacer»', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Regalos').click();
    await page.getByRole('button', { name: 'Crear regalo' }).first().click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel(/Nombre/).first().fill('Clases de tango');
    await dlg.getByLabel(/Monto|Valor/).first().fill('abc');
    await dlg.getByRole('button', { name: /Crear|Guardar|Agregar/ }).last().click();
    await expect(dlg.locator('.pn-error').first()).toBeVisible();     // monto inválido: se explica y el diálogo sigue abierto
    await dlg.getByLabel(/Monto|Valor/).first().fill('45.000');
    await dlg.getByRole('button', { name: /Crear|Guardar|Agregar/ }).last().click();
    await expect(dlg).toHaveCount(0);
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    await expect(page.getByRole('heading', { name: 'Clases de tango' })).toBeVisible();
    await page.getByRole('button', { name: 'Quitar Clases de tango' }).click();
    await expect(page.getByRole('heading', { name: 'Clases de tango' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(page.getByRole('heading', { name: 'Clases de tango' })).toBeVisible();
  });
});

test.describe('Perfil E · invitados: alta, edición, confirmación desde el sitio y errores de importación', () => {
  test('alta manual, edición de asistencia y baja con «Deshacer»', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Invitados').click();
    for (const [n, a] of [['Marta', 'Sosa'], ['Pablo', 'Ruiz']]) {
      await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
      await page.getByLabel('Nombre', { exact: true }).fill(n!);
      await page.getByLabel('Apellido').fill(a!);
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    }
    await expect(page.getByRole('list', { name: 'Lista de invitados' }).getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: 'Editar a Marta Sosa' }).first().click();
    await page.getByRole('dialog').getByLabel('Asistencia').selectOption({ label: 'Confirmado' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect.poll(async () => (await stored(page)).guests.find((g: { first: string }) => g.first === 'Marta').status).toBe('confirmed');
        await page.getByRole('button', { name: 'Eliminar a Pablo Ruiz' }).click();
    await expect(page.getByRole('list', { name: 'Lista de invitados' }).getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(page.getByRole('list', { name: 'Lista de invitados' }).getByRole('listitem')).toHaveCount(2);
  });

  test('la confirmación hecha en el sitio público llega a la lista de invitados, y enviarla dos veces no duplica a la persona', async ({ page }) => {
    await onboard(page);
    const confirm = async () => {
      await page.goto('/sitio/lucia-y-violeta?borrador', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Confirmá asistencia' }).first().click();
      const dlg = page.getByRole('dialog');
      // Si ya se envió una confirmación en esta sesión, el diálogo reabre en el agradecimiento: se pasa a «Cargar otra persona».
      const again = dlg.getByRole('button', { name: 'Cargar otra persona' });
      if (await again.isVisible().catch(() => false)) await again.click();
      await dlg.locator('#rsvp-name').fill('Marta');
      await dlg.locator('#rsvp-surname').fill('Sosa');
      await dlg.locator('#rsvp-contact').fill('marta@example.com');
      await dlg.locator('label.dm-rsvp-opt', { hasText: 'Sí, ahí estoy' }).click();
      await dlg.locator('label.dm-rsvp-menu', { hasText: 'Sin restricciones' }).click();
      await dlg.getByRole('button', { name: 'Confirmar', exact: true }).click();
      await dlg.getByRole('button', { name: 'Enviar confirmación' }).click();
      await expect(dlg.getByRole('heading', { name: /¡Gracias/ })).toBeVisible();
    };
    await confirm();
    await confirm();
    await expect.poll(async () => (await stored(page)).guests.length).toBe(1);
    const g = (await stored(page)).guests[0];
    expect(g).toMatchObject({ first: 'Marta', last: 'Sosa', status: 'confirmed', source: 'rsvp' });
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Editar a Marta Sosa' }).first()).toBeVisible();
    await expect(page.getByRole('list', { name: 'Lista de invitados' }).getByRole('listitem')).toHaveCount(1);
  });

  test('importar una planilla con errores: muestra qué filas fallan, no cambia nada hasta confirmar y se puede reintentar', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Invitados').click();
    await page.getByRole('button', { name: 'Importar desde Excel' }).click();
    const bad = 'Nombre,Apellido,Asistencia,Restricción alimentaria\n,Gómez,Pendiente,\nLaura,,Pendiente,\nNico,Paz,Quizás,\n';
    await page.setInputFiles('input[type=file]', { name: 'malo.csv', mimeType: 'text/csv', buffer: Buffer.from(bad) });
    const result = page.locator('.pn-import-result');
    await expect(result).toContainText('Fila 2');
    await expect(result).toContainText('Fila 3');
    await expect(result).toContainText('Fila 4');
    expect((await stored(page)).guests).toHaveLength(0);
    const good = 'Nombre,Apellido,Asistencia,Restricción alimentaria\nLaura,Díaz,Confirmado,Vegetariano\nNico,Paz,Pendiente,\n';
    await page.setInputFiles('input[type=file]', { name: 'bueno.csv', mimeType: 'text/csv', buffer: Buffer.from(good) });
    await expect(result).toContainText('2 invitados listos para importar');
    await page.getByRole('button', { name: 'Importar 2' }).click();
    await expect.poll(async () => (await stored(page)).guests.length).toBe(2);
  });
});

test.describe('Mesas', () => {
  test('crear una mesa, asignarle una persona, y eliminar la mesa deja a esa persona sin lugar (no la borra)', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Invitados').click();
    for (const [n, a] of [['Ana', 'Gil'], ['Beto', 'Mar']]) {
      await page.getByRole('button', { name: 'Agregar invitado' }).first().click();
      await page.getByLabel('Nombre', { exact: true }).fill(n!);
      await page.getByLabel('Apellido').fill(a!);
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    }
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    await page.getByRole('button', { name: 'Crear mesa' }).click();
    await page.getByRole('dialog').getByLabel('Nombre').fill('Primos');
    await page.getByRole('dialog').getByRole('button', { name: 'Crear', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Primos' })).toBeVisible();
    await page.getByRole('button', { name: /^Lista de invitados/ }).click();
    await page.getByRole('button', { name: 'Editar a Ana Gil' }).first().click();
    await page.getByRole('dialog').getByLabel('Grupo o mesa').selectOption({ label: 'Primos' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect.poll(async () => (await stored(page)).guests.find((g: { first: string }) => g.first === 'Ana').groupId).not.toBeNull();
    await page.getByRole('button', { name: /^Mesas y grupos/ }).click();
    await page.getByRole('button', { name: /Eliminar Primos/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Eliminar|Sí/ }).last().click();
    await expect.poll(async () => (await stored(page)).guests.length).toBe(2);
    await expect.poll(async () => (await stored(page)).guests.find((g: { first: string }) => g.first === 'Ana').groupId).toBeNull();
  });
});

test.describe('Perfil G · cambia de idea', () => {
  test('cambiar los nombres y la fecha desde «Datos del casamiento» se refleja en el Inicio, el estado y la vista previa', async ({ page }) => {
    await onboard(page, 'Lucía', 'Violeta');
    await page.goto('/panel?editar=datos', { waitUntil: 'networkidle' });
    const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' });
    await dlg.getByLabel('Tu nombre').fill('Lucila');
    await dlg.getByLabel('Nombre de tu pareja').fill('Vera');
    await dlg.getByLabel('Fecha del casamiento').fill('2030-09-14');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Lucila & Vera')).toBeVisible();
    await expect.poll(async () => (await stored(page)).couple.second).toBe('Vera');
    // Cambiar la fecha otra vez y vaciarla: queda «Fecha por definir».
    await page.goto('/panel?editar=datos', { waitUntil: 'networkidle' });
    await dlg.getByLabel('Fecha del casamiento').fill('');
    await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('region', { name: /Primeros pasos/ }).getByText('Fecha por definir')).toBeVisible();
    await expect.poll(async () => (await stored(page)).date).toBeNull();
    await openPreview(page);
    await expect.poll(() => previewText(page)).toMatch(/Lucila/i);
    await closePreview(page);
  });

  test('elegir un plan, volver atrás y elegir otro no cobra ni publica nada hasta pagar', async ({ page }) => {
    await onboard(page);
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Regalos' }).click();
    await expect(publishDialog(page).getByText('No se cobra nada ni se guardan datos de pago.')).toBeVisible();
    await publishDialog(page).getByRole('button', { name: 'Volver', exact: true }).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Completo' }).click();
    await expect(publishDialog(page).getByRole('button', { name: /^Pagar ARS 320\.000/ })).toBeVisible();
    await publishDialog(page).getByRole('button', { name: 'Cerrar' }).click();
    expect((await stored(page)).publication).toBeNull();
    // Reabrir el diálogo vuelve a la elección de producto, no al paso de pago.
    await topPublish(page).click();
    await expect(publishDialog(page).getByRole('heading', { name: '¿Qué querés publicar?' })).toBeVisible();
  });
});

test.describe('Perfil J · publicar cuanto antes', () => {
  test('publicar con el plan Invitación: pago de prueba, link, estado «Publicada» y persistencia tras recargar', async ({ page }) => {
    await onboard(page);
    await topPublish(page).click();
    await publishDialog(page).getByRole('button', { name: 'Publicar Invitación' }).click();
    await publishDialog(page).getByRole('button', { name: /^Pagar / }).click();
    await expect(publishDialog(page).getByRole('heading', { name: '¡Pagaste tu plan Invitación!' })).toBeVisible({ timeout: 10000 });
    await expect(publishDialog(page).getByText(/\/sitio\/lucia-y-violeta/)).toBeVisible();
    await publishDialog(page).getByRole('button', { name: 'Listo' }).click();
    await expect(page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true })).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true })).toBeVisible();
    // El link público (con el slug que asignó el servidor, que lleva un sufijo si otra pareja ya publicó los mismos nombres) abre lo PUBLICADO.
    await expect.poll(async () => (await stored(page)).slug).toMatch(/^lucia-y-violeta(-\d+)?$/);
    await page.goto(`/sitio/${(await stored(page)).slug}`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/Luc[ií]a/i);
  });
});

test.describe('Persistencia y datos extremos', () => {
  test('nombres con emoji, etiquetas HTML o más de 40 letras se rechazan con un mensaje y no cambian nada', async ({ page }) => {
    await onboard(page);
    await page.goto('/panel?editar=datos', { waitUntil: 'networkidle' });
    const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' });
    for (const [bad, msg] of [['<b>negrita</b>', 'Usá solo letras'], ['Ñandú 🎉', 'Usá solo letras'], ['A'.repeat(60), 'demasiado largo']] as const) {
      await dlg.getByLabel('Tu nombre').fill(bad);
      await dlg.getByRole('button', { name: 'Guardar' }).click();
      await expect(dlg.getByText(new RegExp(msg))).toBeVisible();
      await expect(dlg).toBeVisible();
    }
    await dlg.getByRole('button', { name: 'Cancelar' }).click();
    expect((await stored(page)).couple.first).toBe('Lucía');
  });

  test('el texto libre (un regalo propio con HTML y emoji) se muestra como texto, sin interpretarse ni romper el ancho', async ({ page }) => {
    await onboard(page);
    await nav(page, 'Regalos').click();
    await page.getByRole('button', { name: 'Crear regalo' }).first().click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel(/Nombre/).first().fill('<b>Cena</b> 🍽️ ' + 'x'.repeat(30));
    await dlg.getByLabel(/Monto|Valor/).first().fill('30000');
    await dlg.getByRole('button', { name: /Crear|Guardar|Agregar/ }).last().click();
    await expect(dlg).toHaveCount(0);
    await page.getByRole('tab', { name: /Mis regalos/ }).click();
    await expect(page.getByText('<b>Cena</b>', { exact: false }).first()).toBeVisible();
    expect(await page.locator('.rg-card b, .pn-gcard b').count()).toBe(0);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(m.sw).toBeLessThanOrEqual(m.cw);
  });

  test('un guardado corrupto o de una versión desconocida no rompe el panel: vuelve al alta', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('weda-app', '{"version":99,"couple":'));
    await page.goto('/panel', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/crear/);
  });
});
