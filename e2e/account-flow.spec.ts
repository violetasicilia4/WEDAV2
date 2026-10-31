import { expect, fillNamesAndContinue, onboard, stored, test } from './helpers';
import type { Page } from '@playwright/test';

// Cuenta real (servidor): estos tests verifican que registrarse o ingresar NUNCA borra el evento guardado en este navegador
// y que «empezar de cero» es una decisión explícita. La autenticación y el aislamiento entre cuentas se prueban en e2e/backend.spec.ts.

const signupByEmail = async (page: Page, mail = 'nueva@example.com') => {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', mail);
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
};
const couple = async (page: Page) => (await stored(page)).couple;

test.describe('Cuenta · el evento guardado se conserva', () => {
  test('1. evento completo → registrarse con correo: se conserva y se sigue al panel (también al recargar)', async ({ page }) => {
    await onboard(page);
    await signupByEmail(page);
    await page.waitForURL(/\/panel/);
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await page.reload({ waitUntil: 'networkidle' });
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await expect(page).toHaveURL(/\/panel/);
  });

  test('2. «Registrarme / Ingresar con Google» está en el flujo, pero sin OAuth no simula una cuenta: avisa y se sigue con el correo; Apple no existe', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: /Apple/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Registrarme con Google' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'todavía no está habilitado' })).toBeVisible();
    await expect(page).toHaveURL(/\/crear\/cuenta/);                       // no avanzó como si hubiera cuenta
    await page.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Ingresar con Google' })).toBeVisible();
  });

  test('4. onboarding empezado (nombres cargados, falta fecha y foto) → registro simulado: se conserva el progreso', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await page.fill('#ac-email', 'a@example.com');
    await page.fill('#ac-pass', 'Clave1234');
    await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
    await page.waitForURL(/\/crear$/);
    await fillNamesAndContinue(page, 'Ana', 'Beto');
    await signupByEmail(page, 'b@example.com');
    await page.waitForURL(/\/panel/);
    expect(await couple(page)).toEqual({ first: 'Ana', second: 'Beto' });
    await page.reload({ waitUntil: 'networkidle' });
    expect(await couple(page)).toEqual({ first: 'Ana', second: 'Beto' });
  });

  test('5. evento completo → ingresar: va al panel, sin repetir el onboarding', async ({ page }) => {
    await onboard(page);
    await page.goto('/crear/cuenta?modo=ingresar', { waitUntil: 'networkidle' });
    await page.fill('#ac-email', 'lucia@example.com');
    await page.fill('#ac-pass', 'Clave1234');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL(/\/panel/);
    await expect(page.locator('#on-first')).toHaveCount(0);
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/panel/);
  });

  test('6. sin evento previo → registro: el flujo de creación sigue funcionando', async ({ page }) => {
    await signupByEmail(page);
    await page.waitForURL(/\/crear$/);
    await expect(page.locator('#on-first')).toBeVisible();
    await fillNamesAndContinue(page, 'Carla', 'Dani');
    await page.reload({ waitUntil: 'networkidle' });
    expect(await couple(page)).toEqual({ first: 'Carla', second: 'Dani' });
  });
});
