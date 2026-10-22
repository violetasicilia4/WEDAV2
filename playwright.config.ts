import { defineConfig } from '@playwright/test';

// Recorridos reales del panel en emulación de celular (viewport, no dispositivos físicos). Se usa el servidor de desarrollo (puerto 8080).
// Si Playwright no encuentra su navegador, exportá CHROMIUM_PATH con la ruta de un Chromium instalado.
// WEDA_URL permite correr la suite contra otra URL (por ejemplo, una compilación de producción servida en local); sin ella se usa el servidor de desarrollo.
const BASE = process.env['WEDA_URL'] ?? 'http://127.0.0.1:8080';
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    locale: 'es-AR',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    launchOptions: process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {},
  },
  webServer: process.env['WEDA_URL'] ? undefined : { command: 'npx vite dev --port 8080 --host 127.0.0.1', url: 'http://127.0.0.1:8080/', reuseExistingServer: true, timeout: 120_000 },
});
