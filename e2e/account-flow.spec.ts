import { expect, fillNamesAndContinue, onboard, stored, test } from './helpers';
import type { Page } from '@playwright/test';

// Cuenta real (servidor). Sin cuenta no se arma nada y lo de una cuenta no pasa a otra (decisión de la dueña, 2026-11-06): al entrar se ve solo lo
// guardado en esa cuenta. La autenticación y el aislamiento entre cuentas se prueban en e2e/backend.spec.ts.

const signupByEmail = async (page: Page, mail = 'nueva@example.com') => {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', mail);
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
};
const couple = async (page: Page) => (await stored(page)).couple;

test.describe('Cuenta · el evento guardado se conserva', () => {
  test('1. con un casamiento abierto, registrarse con otra cuenta empieza de cero: no hereda nada ni muestra copias aparte', async ({ page }) => {
    await onboard(page);
    await signupByEmail(page);
    await page.waitForURL(/\/crear$/);
    await expect(page.locator('#on-first')).toHaveValue('');
    await expect(page.getByText('guardado aparte')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('weda-app-local-backup'))).toBeNull();
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

  test('4. sin cuenta, el panel y el armado del casamiento llevan a crear la cuenta', async ({ page }) => {
    for (const path of ['/panel', '/panel/regalos', '/crear', '/crear/fecha', '/crear/foto']) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.waitForURL(/\/crear\/cuenta/);
    }
    await expect(page.locator('#ac-email')).toBeVisible();
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
