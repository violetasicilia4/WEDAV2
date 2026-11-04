import { closePreview, expect, onboard, openPreview, stored, test } from './helpers';

/* Pagos con el proveedor de PRUEBA (nunca cobra). Requiere un servidor con WEDA_PAYMENTS_PROVIDER=test en WEDA_PAY_URL
   (con pagos, publicar exige pago: por eso no usa el mismo servidor que el resto de la suite). Ver payment-integration.md. */
const PAY = process.env['WEDA_PAY_URL'];
test.skip(!PAY, 'Falta WEDA_PAY_URL: un servidor con WEDA_PAYMENTS_PROVIDER=test (ver docs/auditoria-ux-conversion/test-results.md).');
test.use({ baseURL: PAY ?? 'http://127.0.0.1:1' });

test('rechazado no publica ni muestra éxito; aprobado (confirmado por el servidor) publica en el mismo momento (BR-01, PAY-07)', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, 'Paula', 'Quino');
  const top = page.locator('.pn-top');
  await top.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar Celebración', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('button', { name: 'Publicar', exact: true })).toHaveCount(0);   // sin pago no hay «Publicar»
  await dlg.getByRole('button', { name: /^Ir a pagar ARS 140\.000/ }).click();
  await page.waitForURL(/\/pago-de-prueba\?orden=/);
  await expect(page.getByRole('note')).toContainText('PAGO DE PRUEBA');
  const orden = new URL(page.url()).searchParams.get('orden');
  // Rechazado.
  await page.getByRole('button', { name: 'Rechazar (prueba)' }).click();
  await page.waitForURL(/\/panel\/pago\?orden=/);
  await expect(page.getByRole('heading', { name: 'El pago no se aprobó' })).toBeVisible();
  await expect(page.getByText(/publicada/i)).toHaveCount(0);
  // Volver al panel no publica nada; reintentar crea otra orden.
  await page.goto('/panel', { waitUntil: 'networkidle' });
  await top.getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('button', { name: 'Publicar Celebración', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Ir a pagar/ }).click();
  await page.waitForURL(/\/pago-de-prueba\?orden=/);
  expect(new URL(page.url()).searchParams.get('orden')).not.toBe(orden);
  // Llegar a la vuelta del checkout sin pagar NO es pago: sigue pendiente.
  const second = new URL(page.url()).searchParams.get('orden')!;
  await page.goto(`/panel/pago?orden=${second}`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Esperando la confirmación del pago' })).toBeVisible();
  // Aprobado: el servidor lo confirma y en ese mismo momento publica; no hay un segundo paso.
  await page.goto(`/pago-de-prueba?orden=${second}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Tu página está publicada/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Publicar mi página' })).toHaveCount(0);
  await page.goto('/panel', { waitUntil: 'networkidle' });
  await expect(top.getByRole('button', { name: 'Publicada', exact: true })).toBeVisible();
});

/** Arranca la compra de un plan desde el diálogo «Publicar» y deja la página en el checkout de prueba. Devuelve el id de la orden. */
async function checkout(page: import('@playwright/test').Page, plan: 'Regalos' | 'Celebración', price: string) {
  await page.locator('.pn-top').getByRole('button', { name: 'Publicar', exact: true }).click();
  await page.getByRole('button', { name: `Publicar ${plan}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^Ir a pagar ARS ${price.replace('.', '\\.')}`) }).click();
  await page.waitForURL(/\/pago-de-prueba\?orden=/);
  return new URL(page.url()).searchParams.get('orden')!;
}
const wedding = async (page: import('@playwright/test').Page) => (await page.request.get('/api/wedding')).json();
/** Suma un invitado por la API. El panel abierto también guarda: ante un conflicto de revisión se vuelve a leer y se reintenta. */
async function addGuest(page: import('@playwright/test').Page, id: string) {
  for (let i = 0; ; i++) {
    const w = await wedding(page);
    const r = await page.request.put('/api/wedding', { data: { baseRevision: w.revision, draft: w.draft, guests: { upsert: [{ id, first: 'Rosa', last: 'Gómez', status: 'pending', menu: '', groupId: null, source: 'manual' }] } } });
    if (r.status() !== 409 || i === 4) return r;
    await page.waitForTimeout(500);
  }
}

test('Celebración pagada: publica sola, la URL queda disponible y se operan invitados (BR-01, BR-62)', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, 'Rita', 'Gael');
  await checkout(page, 'Celebración', '140.000');
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Tu página está publicada/ })).toBeVisible({ timeout: 15_000 });
  const w = await wedding(page);
  expect(w.access).toMatchObject({ state: 'active', plan: 'invitacion' });
  // La URL pública responde con la invitación y la confirmación de asistencia.
  const pub = await (await page.request.get(`/api/public/${w.slug}`)).json();
  expect([pub.site.blocks.invitation, pub.site.blocks.rsvp]).toEqual([true, true]);
  const visit = await page.context().newPage();
  await visit.goto(`/sitio/${w.slug}`, { waitUntil: 'networkidle' });
  await expect(visit.getByText('Rita', { exact: false }).first()).toBeVisible();
  await visit.close();
  // Operar: el servidor acepta un invitado.
  const g = await addGuest(page, `inv-e2e-1-${w.slug}`);
  expect(g.status()).toBe(200);
});

test('Regalos pagado: publica solo la lista; el panel no muestra la invitación como incluida (F-P1)', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, 'Inés', 'Bruno');
  await checkout(page, 'Regalos', '95.000');
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Tu página está publicada/ })).toBeVisible({ timeout: 15_000 });
  const w = await wedding(page);
  expect(w.access).toMatchObject({ state: 'active', plan: 'regalos' });
  const pub = await (await page.request.get(`/api/public/${w.slug}`)).json();
  expect([pub.site.blocks.invitation, pub.site.blocks.rsvp]).toEqual([false, false]);
  // En el panel, el plan es el confirmado por el servidor: la vista previa abre la lista (sin invitación) y el diálogo marca Regalos.
  await page.goto('/panel', { waitUntil: 'networkidle' });
  await expect.poll(async () => (await stored(page)).planId).toBe('regalos');
  await openPreview(page);
  await expect(page.getByRole('dialog').locator('iframe')).toHaveAttribute('src', /\/regalos(\?|$)/);
  await closePreview(page);
  await page.locator('.pn-top').getByRole('button', { name: 'Publicada', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tu publicación' })).toContainText('publicada con el plan Regalos');
  // Operar invitados sigue fuera de Regalos.
  const g = await addGuest(page, `inv-e2e-2-${w.slug}`);
  expect([g.status(), (await g.json()).error]).toEqual([403, 'feature_requires_plan']);
});

test('pago cancelado no publica; un evento de pago repetido no vuelve a publicar ni cobra', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, 'Olga', 'Saúl');
  const first = await checkout(page, 'Regalos', '95.000');
  expect((await page.request.post(`/api/test-payments/${first}`, { data: { outcome: 'cancelled' } })).status()).toBe(200);
  await page.goto(`/panel/pago?orden=${first}`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Cancelaste el pago' })).toBeVisible();
  expect((await wedding(page)).publication).toBeNull();
  // Segunda orden, aprobada dos veces: la repetición se ignora.
  await page.goto('/panel', { waitUntil: 'networkidle' });
  const second = await checkout(page, 'Regalos', '95.000');
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Tu página está publicada/ })).toBeVisible({ timeout: 15_000 });
  const v1 = (await wedding(page)).publication.version;
  const again = await page.request.post(`/api/test-payments/${second}`, { data: { outcome: 'paid' } });
  expect(await again.json()).toMatchObject({ ignored: true });
  expect((await wedding(page)).publication.version).toBe(v1);
  const orders = (await (await page.request.get('/api/orders')).json()).orders as { status: string }[];
  expect(orders.map(o => o.status).sort()).toEqual(['cancelled', 'paid']);
});

test('si la publicación automática falla, «Publicar mi página» la recupera sin un segundo cobro (DP-25)', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, 'Vera', 'Iván');
  const orden = await checkout(page, 'Celebración', '140.000');
  // Sin nombres, publicar falla: se borran por la API justo antes de aprobar.
  const w = await wedding(page);
  expect((await page.request.put('/api/wedding', { data: { baseRevision: w.revision, draft: { ...w.draft, couple: { first: '', second: '' } } } })).status()).toBe(200);
  await page.reload({ waitUntil: 'networkidle' });                        // el navegador toma la revisión nueva (sin conflicto de guardado)
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Pago confirmado/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Publicar mi página' })).toBeVisible();
  const paused = await wedding(page);
  expect([paused.access.state, paused.publication]).toEqual(['paid_unpublished', null]);
  // Se recuperan los nombres y se reintenta con el mismo pago.
  expect((await page.request.put('/api/wedding', { data: { baseRevision: paused.revision, draft: { ...paused.draft, couple: { first: 'Vera', second: 'Iván' } } } })).status()).toBe(200);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Publicar mi página' }).click();
  await expect(page.getByRole('heading', { name: /Tu página está publicada/ })).toBeVisible({ timeout: 15_000 });
  const orders = (await (await page.request.get('/api/orders')).json()).orders as { id: string; status: string }[];
  expect(orders.map(o => [o.id, o.status])).toEqual([[orden, 'paid']]);
  expect((await (await page.request.post('/api/checkout', { data: { planId: 'invitacion' } })).json()).error).toBe('already_paid');
});
