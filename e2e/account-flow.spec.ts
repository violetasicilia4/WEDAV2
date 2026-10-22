import { expect, fillNamesAndContinue, onboard, stored, test } from './helpers';
import type { Page } from '@playwright/test';

// La cuenta es una simulación (frontend-only): estos tests verifican que registrarse o ingresar NUNCA borra el evento guardado
// y que «empezar de cero» es una decisión explícita. No prueban autenticación real.

const signupByEmail = async (page: Page, mail = 'nueva@example.com') => {
  await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
  await page.fill('#ac-email', mail);
  await page.fill('#ac-pass', 'Clave1234');
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click();
};
const couple = async (page: Page) => (await stored(page)).couple;

test.describe('Cuenta simulada · el evento guardado se conserva', () => {
  test('1. evento completo → registrarse con correo: se conserva y se sigue al panel (también al recargar)', async ({ page }) => {
    await onboard(page);
    await signupByEmail(page);
    await page.waitForURL(/\/panel/);
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await page.reload({ waitUntil: 'networkidle' });
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await expect(page).toHaveURL(/\/panel/);
  });

  for (const provider of ['Google', 'Apple']) {
    test(`${provider === 'Google' ? '2' : '3'}. evento completo → registrarse con ${provider}: se conserva (también al recargar)`, async ({ page }) => {
      await onboard(page);
      await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: `Registrarme con ${provider}` }).click();
      await page.waitForURL(/\/panel/);
      expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
      await page.reload({ waitUntil: 'networkidle' });
      expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    });
  }

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
    await page.fill('#ac-pass', 'cualquiera');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL(/\/panel/);
    await expect(page.locator('#on-first')).toHaveCount(0);
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/panel/);
  });

  test('6. sin evento previo → registro simulado: el flujo de creación sigue funcionando', async ({ page }) => {
    await signupByEmail(page);
    await page.waitForURL(/\/crear$/);
    await expect(page.locator('#on-first')).toBeVisible();
    await fillNamesAndContinue(page, 'Carla', 'Dani');
    await page.reload({ waitUntil: 'networkidle' });
    expect(await couple(page)).toEqual({ first: 'Carla', second: 'Dani' });
  });

  test('7. empezar de cero: avisa del evento guardado, pide confirmación y recién ahí lo borra', async ({ page }) => {
    await onboard(page);
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await expect(page.getByRole('status').filter({ hasText: 'Lucía & Violeta' })).toBeVisible();
    // Cancelar no borra nada.
    await page.getByRole('button', { name: 'Empezar un evento nuevo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    expect(await couple(page)).toEqual({ first: 'Lucía', second: 'Violeta' });
    // Confirmar descarta el evento y empieza el onboarding vacío.
    await page.getByRole('button', { name: 'Empezar un evento nuevo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, empezar de cero' }).click();
    await page.waitForURL(/\/crear$/);
    await expect(page.locator('#on-first')).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('weda-app'))).toBeNull();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#on-first')).toHaveValue('');
  });

  test('8. los textos aclaran que es una versión de prueba y no una cuenta real', async ({ page }) => {
    await page.goto('/crear/cuenta', { waitUntil: 'networkidle' });
    await expect(page.getByText('Versión de prueba: no se crea una cuenta real ni se guarda tu clave.')).toBeVisible();
  });
});
