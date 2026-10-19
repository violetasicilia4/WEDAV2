import { chromium } from '@playwright/test';

/** Precalienta el servidor de desarrollo (Vite compila cada ruta la primera vez que se pide): sin esto, el primer test de la corrida
 *  puede toparse con una recarga a mitad de camino. No prueba nada; solo visita las pantallas. */
export default async function globalSetup() {
  const browser = await chromium.launch(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {});
  const page = await browser.newPage();
  for (const path of ['/', '/crear/cuenta', '/crear', '/crear/foto', '/panel', '/panel/regalos', '/panel/sitio', '/panel/invitados', '/panel/vista-previa', '/sitio/prueba']) {
    await page.goto(`http://127.0.0.1:8080${path}`, { waitUntil: 'networkidle' }).catch(() => undefined);
  }
  await browser.close();
}
