// Recorridos contra el BACKEND REAL (servidor + base de datos SQLite temporal): sin mocks de autorización ni de persistencia.
// Cada test usa correos únicos. Solo se interceptan las llamadas para SIMULAR UNA RED CAÍDA (la falla es del cliente, no del servidor).
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const PASS = 'Clave1234';
const uniq = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@example.com`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** Registro desde la interfaz real y onboarding mínimo. Termina en /panel. */
async function signUpAndOnboard(page: Page, email: string, first: string, second: string) {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', email);
  await page.fill('#ac-pass', PASS);
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
  await page.waitForURL(/\/crear$/);
  await page.fill('#on-first', first);
  await page.fill('#on-second', second);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/fecha/);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.waitForURL(/\/crear\/foto/);
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.waitForURL(/\/panel/);
}

async function apiLogin(browser: Browser, baseURL: string, email: string): Promise<APIRequestContext> {
  const ctx = await (await import('@playwright/test')).request.newContext({ baseURL });
  const r = await ctx.post('/api/auth/login', { data: { email, password: PASS } });
  expect(r.status()).toBe(200);
  return ctx;
}

/** Deja el casamiento listo para publicar (plan y regalos) por la API, como lo haría el panel. */
async function prepareAndPublish(api: APIRequestContext) {
  // El panel guarda en segundo plano: se espera a que el servidor ya tenga los nombres del onboarding.
  await expect.poll(async () => (await (await api.get('/api/wedding')).json()).draft.couple.first, { timeout: 15_000 }).not.toBe('');
  const w = await (await api.get('/api/wedding')).json();
  const draft = { ...w.draft, planId: 'completo', gifts: { ...w.draft.gifts, alias: 'ana.luis.mp', items: [
    { id: 'g1', name: 'Cena frente al mar', text: '', amount: 180000, category: 'Luna de miel', icon: 'compass' },
    { id: 'g2', name: 'Spa para dos', text: '', amount: 300000, category: 'Luna de miel', icon: 'compass' },
  ] }, site: { ...w.draft.site, rsvp: { ...w.draft.site.rsvp, enabled: true } } };
  expect((await api.put('/api/wedding', { data: { baseRevision: w.revision, draft } })).status()).toBe(200);
  // El alias no viaja en el borrador: se carga aparte, con la clave (GIFT-14).
  expect((await api.post('/api/wedding/payout', { data: { alias: 'ana.luis.mp', currentPassword: PASS, baseVersion: w.payout.version } })).status()).toBe(200);
  const p = await api.post('/api/wedding/publish');
  expect(p.status()).toBe(200);
  return (await p.json()).slug as string;
}

test.describe('multiusuario con servidor real', () => {
  test('el casamiento se guarda en la cuenta y se abre desde otro dispositivo; otra pareja no lo ve', async ({ browser, baseURL }) => {
    const email = uniq('ana');
    const a = await browser.newContext({ baseURL: baseURL! });
    const pageA = await a.newPage();
    await signUpAndOnboard(pageA, email, 'Ana', 'Luis');
    // Se guardó en el servidor (no solo en este navegador).
    const apiA = await apiLogin(browser, baseURL!, email);
    await expect.poll(async () => (await (await apiA.get('/api/wedding')).json()).draft.couple.first, { timeout: 15_000 }).toBe('Ana');

    // «Otro dispositivo»: contexto limpio, sin localStorage ni cookies.
    const b = await browser.newContext({ baseURL: baseURL! });
    const pageB = await b.newPage();
    await pageB.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await pageB.fill('#ac-email', email);
    await pageB.fill('#ac-pass', PASS);
    await pageB.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await pageB.waitForURL(/\/panel/, { timeout: 15_000 });
    await expect(pageB.getByText('Ana & Luis').first()).toBeVisible();

    // Otra pareja: su cuenta no ve nada de Ana y Luis.
    const other = await browser.newContext({ baseURL: baseURL! });
    const pageC = await other.newPage();
    await signUpAndOnboard(pageC, uniq('bea'), 'Bea', 'Tomás');
    const apiC = await apiLogin(browser, baseURL!, (await (await other.request.get('/api/me')).json()).user.email);
    const mine = await (await apiC.get('/api/wedding')).json();
    expect(JSON.stringify(mine)).not.toContain('Ana');
    await a.close(); await b.close(); await other.close();
  });

  test('contraseña incorrecta no entra y el error se muestra', async ({ page }) => {
    const email = uniq('clave');
    await signUpAndOnboard(page, email, 'Eva', 'Leo');
    const fresh = await page.context().browser()!.newContext({ baseURL: page.url().split('/panel')[0]! });
    const p2 = await fresh.newPage();
    await p2.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await p2.fill('#ac-email', email);
    await p2.fill('#ac-pass', 'Equivocada1');
    await p2.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(p2.getByText('El correo o la clave no coinciden.')).toBeVisible();
    expect(p2.url()).toContain('/crear/cuenta');
    await fresh.close();
  });

  test('un guardado que falla NO aparenta éxito: avisa, reintenta y recién ahí queda guardado', async ({ page }) => {
    const email = uniq('red');
    await signUpAndOnboard(page, email, 'Rita', 'Santi');
    await page.route('**/api/wedding', r => (r.request().method() === 'PUT' ? r.abort('failed') : r.continue()));
    await page.goto('/panel/perfil', { waitUntil: 'networkidle' });
    // Cualquier cambio de datos dispara el guardado automático: se edita un invitado nuevo.
    await page.goto('/panel/invitados', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Agregar invitado/ }).first().click();
    await page.getByLabel('Nombre', { exact: true }).fill('Zulema');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos guardar' })).toBeVisible({ timeout: 15_000 });
    const api = await apiLogin(page.context().browser()!, new URL(page.url()).origin, email);
    expect(JSON.stringify(await (await api.get('/api/wedding')).json())).not.toContain('Zulema');
    await page.unroute('**/api/wedding');
    await page.getByRole('button', { name: 'Reintentar ahora' }).click();
    await expect.poll(async () => JSON.stringify(await (await api.get('/api/wedding')).json()), { timeout: 15_000 }).toContain('Zulema');
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos guardar' })).toHaveCount(0);
  });
});

test.describe('sitio publicado, confirmaciones y regalos', () => {
  test('un invitado sin sesión abre el sitio, confirma y el panel lo ve; sin red no se simula el envío y reintentar no duplica', async ({ browser, baseURL }) => {
    const email = uniq('pub');
    const owner = await browser.newContext({ baseURL: baseURL! });
    await signUpAndOnboard(await owner.newPage(), email, 'Cami', 'Lucas');
    const api = await apiLogin(browser, baseURL!, email);
    const slug = await prepareAndPublish(api);

    const guest = await browser.newContext({ baseURL: baseURL! });
    const page = await guest.newPage();
    // El HTML del servidor ya trae los nombres (también para WhatsApp): se mira la respuesta cruda, sin JavaScript.
    const raw = await (await guest.request.get(`/sitio/${slug}`)).text();
    expect(raw).toContain('Cami &amp; Lucas');
    expect(raw).toContain('<title>Cami &amp; Lucas • Casamiento</title>');
    await page.goto(`/sitio/${slug}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('Cami');

    const openRsvp = async (pg: Page) => {
      await pg.getByRole('button', { name: 'Abrir el menú' }).click();
      await pg.locator('.menu-row', { hasText: 'Confirmá asistencia' }).click();
    };
    const confirm = async () => {
      await openRsvp(page);
      const dlg = page.getByRole('dialog');
      await dlg.locator('#rsvp-name').fill('Marta');
      await dlg.locator('#rsvp-surname').fill('Sosa');
      await dlg.locator('#rsvp-contact').fill('marta@example.com');
      await dlg.locator('label.dm-rsvp-opt', { hasText: 'Sí, ahí estoy' }).click();
      const menu = dlg.locator('label.dm-rsvp-menu', { hasText: 'Sin restricciones' });
      if (await menu.isVisible().catch(() => false)) await menu.click();
      await dlg.getByRole('button', { name: 'Confirmar', exact: true }).click();
      return dlg;
    };
    await page.route('**/api/public/*/rsvp', r => r.abort('failed'));
    const dlg = await confirm();
    await dlg.getByRole('button', { name: 'Enviar confirmación' }).click();
    await expect(dlg.getByRole('alert')).toContainText('No hay conexión');
    await expect(dlg.getByRole('heading', { name: /¡Gracias/ })).toHaveCount(0);
    expect((await (await api.get('/api/wedding')).json()).guests).toHaveLength(0);
    await page.unroute('**/api/public/*/rsvp');
    await dlg.getByRole('button', { name: 'Reintentar' }).click();
    await expect(dlg.getByRole('heading', { name: /¡Gracias/ })).toBeVisible();
    // Responder de nuevo (otra sesión del invitado) no duplica a la persona.
    const again = await (await browser.newContext({ baseURL: baseURL! })).newPage();
    await again.goto(`/sitio/${slug}`, { waitUntil: 'networkidle' });
    await openRsvp(again);
    const d2 = again.getByRole('dialog');
    await d2.locator('#rsvp-name').fill('marta'); await d2.locator('#rsvp-surname').fill('SOSA'); await d2.locator('#rsvp-contact').fill('marta@example.com');
    await d2.locator('label.dm-rsvp-opt', { hasText: 'No puedo' }).click();
    await d2.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await d2.getByRole('button', { name: 'Enviar confirmación' }).click();
    await expect(d2.getByRole('heading', { name: /¡Gracias/ })).toBeVisible();
    const guests = (await (await api.get('/api/wedding')).json()).guests;
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({ first: 'Marta', source: 'rsvp', status: 'declined' });
    await owner.close(); await guest.close();
  });

  test('un regalo queda «pendiente de revisión», con el comprobante privado; si falla la subida se reintenta sin duplicar el aporte', async ({ browser, baseURL }) => {
    const email = uniq('regalo');
    const owner = await browser.newContext({ baseURL: baseURL! });
    await signUpAndOnboard(await owner.newPage(), email, 'Gala', 'Pablo');
    const api = await apiLogin(browser, baseURL!, email);
    const slug = await prepareAndPublish(api);

    const guest = await browser.newContext({ baseURL: baseURL! });
    const page = await guest.newPage();
    await page.goto(`/sitio/${slug}/regalos`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Regalar' }).first().click();
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: 'Continuar' }).click();
    await dlg.locator('#rg-name').fill('Nora');
    await dlg.locator('#rg-surname').fill('Díaz');
    await dlg.locator('#rg-email').fill('nora@example.com');
    await dlg.locator('#rg-proof').setInputFiles({ name: 'comprobante.png', mimeType: 'image/png', buffer: PNG });
    // Falla el envío (red caída): el regalo y su comprobante viajan juntos, así que no queda un regalo sin comprobante. Reintentar no duplica.
    await page.route('**/api/public/*/contributions', r => r.abort('failed'));
    await dlg.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(dlg.getByRole('alert')).toContainText('No hay conexión');
    await page.unroute('**/api/public/*/contributions');
    await dlg.getByRole('button', { name: 'Reintentar' }).click();
    await expect(dlg.getByRole('heading', { name: /¡Gracias, Nora!/ })).toBeVisible();
    await expect(dlg).toContainText('pendiente');

    const list = (await (await api.get('/api/contributions')).json()).contributions;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ giverName: 'Nora Díaz', status: 'pending_review', total: 180000, hasReceipt: true });
    // El comprobante no es público: sin sesión, ni el sitio ni la API lo entregan.
    const anon = await guest.request.get(`/api/contributions/${list[0].id}/receipt`);
    expect(anon.status()).toBe(401);
    expect((await (await guest.request.get(`/api/public/${slug}`)).text())).not.toContain('comprobante');
    // Regalos repetibles (BR-19): otro invitado ve todos los regalos disponibles, el ya regalado incluido.
    const other = await (await browser.newContext({ baseURL: baseURL! })).newPage();
    await other.goto(`/sitio/${slug}/regalos`, { waitUntil: 'networkidle' });
    await expect(other.getByRole('button', { name: /Ya elegido/ })).toHaveCount(0);
    await expect(other.getByRole('button', { name: 'Regalar', exact: true })).toHaveCount(2);
    await owner.close(); await guest.close();
  });

  test('despublicar cierra el sitio para los invitados y publicar de nuevo lo abre', async ({ browser, baseURL }) => {
    const email = uniq('baja');
    const owner = await browser.newContext({ baseURL: baseURL! });
    await signUpAndOnboard(await owner.newPage(), email, 'Dani', 'Mora');
    const api = await apiLogin(browser, baseURL!, email);
    const slug = await prepareAndPublish(api);
    const guest = await browser.newContext({ baseURL: baseURL! });
    expect((await guest.request.get(`/api/public/${slug}`)).status()).toBe(200);
    await api.post('/api/wedding/unpublish');
    expect((await guest.request.get(`/api/public/${slug}`)).status()).toBe(410);
    const page = await guest.newPage();
    await page.goto(`/sitio/${slug}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Esta página no está publicada' })).toBeVisible();
    await api.post('/api/wedding/publish');
    expect((await guest.request.get(`/api/public/${slug}`)).status()).toBe(200);
    expect((await guest.request.get('/api/public/no-existe-jamas')).status()).toBe(404);
    await owner.close(); await guest.close();
  });

  test('otro dispositivo ve que la página ya está publicada y no vuelve a pedir el pago', async ({ browser, baseURL }) => {
    const email = uniq('estado');
    const a = await browser.newContext({ baseURL: baseURL! });
    await signUpAndOnboard(await a.newPage(), email, 'Vero', 'Nico');
    const api = await apiLogin(browser, baseURL!, email);
    await prepareAndPublish(api);
    const b = await browser.newContext({ baseURL: baseURL! });
    const page = await b.newPage();
    await page.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await page.fill('#ac-email', email);
    await page.fill('#ac-pass', PASS);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL(/\/panel/, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Publicada' }).first()).toBeVisible();
    await a.close(); await b.close();
  });
});
