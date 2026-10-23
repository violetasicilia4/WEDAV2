import { defineConfig } from '@playwright/test';

// Recorridos reales del panel. Se usa el servidor de desarrollo (puerto 8080).
// Si Playwright no encuentra su navegador, exportá CHROMIUM_PATH con la ruta de un Chromium instalado.
// WEDA_URL permite correr la suite contra otra URL (por ejemplo, una compilación de producción servida en local); sin ella se usa el servidor de desarrollo.
//
// Proyectos:
//  · mobile   — los recorridos de celular de `e2e/*.spec.ts` (390 px, táctil).
//  · desktop  — recorridos de compu de `e2e/desktop/*.spec.ts` (1280 × 800).
//  · explore-desktop / explore-mobile — pruebas exploratorias con semilla (`e2e/explore/*`). Son largas y por eso NO corren con `npm run test:e2e`:
//    se activan con WEDA_EXPLORE=1 (`npm run test:explore`). Parámetros: WEDA_SEED (semilla, por defecto 2026), WEDA_EXPLORE_N (cantidad de escenarios por proyecto).
const BASE = process.env['WEDA_URL'] ?? 'http://127.0.0.1:8080';
const explore = process.env['WEDA_EXPLORE'] === '1';
const launchOptions = process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: BASE, locale: 'es-AR', launchOptions },
  projects: explore
    ? [
        { name: 'explore-desktop', testMatch: /explore\/.*\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } }, timeout: 20 * 60_000 },
        { name: 'explore-mobile', testMatch: /explore\/.*\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, timeout: 20 * 60_000 },
      ]
    : [
        { name: 'mobile', testIgnore: [/desktop\//, /explore\//], use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
        { name: 'desktop', testMatch: /desktop\/.*\.spec\.ts/, use: { viewport: { width: 1280, height: 800 } } },
      ],
  webServer: process.env['WEDA_URL'] ? undefined : { command: 'npx vite dev --port 8080 --host 127.0.0.1', url: 'http://127.0.0.1:8080/', reuseExistingServer: true, timeout: 120_000 },
});
