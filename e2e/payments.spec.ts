import { expect, onboard, test } from './helpers';

/* Pagos con el proveedor de PRUEBA (nunca cobra). Requiere un servidor con WEDA_PAYMENTS_PROVIDER=test en WEDA_PAY_URL
   (con pagos, publicar exige pago: por eso no usa el mismo servidor que el resto de la suite). Ver payment-integration.md. */
const PAY = process.env['WEDA_PAY_URL'];
test.skip(!PAY, 'Falta WEDA_PAY_URL: un servidor con WEDA_PAYMENTS_PROVIDER=test (ver docs/auditoria-ux-conversion/test-results.md).');
test.use({ baseURL: PAY ?? 'http://127.0.0.1:1' });

test('rechazado no publica ni muestra éxito; aprobado (confirmado por el servidor) habilita publicar', async ({ page }) => {
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
  // Aprobado: el servidor lo confirma y recién ahí se publica (acción aparte).
  await page.goto(`/pago-de-prueba?orden=${second}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Aprobar (prueba)' }).click();
  await expect(page.getByRole('heading', { name: /Pago confirmado/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Publicar mi página' }).click();
  await expect(page.getByRole('heading', { name: '¡Tu página está publicada!' })).toBeVisible({ timeout: 15_000 });
  await page.goto('/panel', { waitUntil: 'networkidle' });
  await expect(top.getByRole('button', { name: 'Publicada', exact: true })).toBeVisible();
});
