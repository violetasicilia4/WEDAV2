import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { COUNT, rng, randomState, SEED } from './rng';

/* Exploración por matriz de estados. Cada «recorrido» = un estado sintético (semilla + número) cargado en el navegador y visitado por todas las pantallas.
   Invariantes: sin errores de consola, sin desborde horizontal, sin pantalla de error, contenido presente, el estado guardado sigue siendo válido
   y sobrevive a recargar sin cambiar. Los fallos se guardan con su semilla en explore-results/explore-failures.jsonl para reproducirlos
   (WEDA_SEED=<semilla> WEDA_EXPLORE_N=<n> npm run test:explore). */

const ROUTES = ['/panel', '/panel/regalos', '/panel/regalos?tab=cobro', '/panel/invitados', '/panel/invitados?vista=mesas', '/panel/sitio', '/panel/vista-previa', '/panel/perfil', '/sitio/exploracion', '/sitio/exploracion/regalos'];
// Fuera de test-results: Playwright vacía esa carpeta al empezar cada proyecto.
const OUT = 'explore-results';

type Failure = { project: string; seed: number; scenario: number; route: string; reason: string };

async function settle(page: Page) {
  await page.waitForFunction(() => document.body && !/Cargando/.test(document.body.innerText) && document.body.innerText.trim().length > 20, undefined, { timeout: 15000 }).catch(() => undefined);
}

test('matriz de estados sintéticos × pantallas', async ({ page }, info) => {
  mkdirSync(OUT, { recursive: true });
  const project = info.project.name;
  const failures: Failure[] = [];
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // Recursos externos opcionales (fuentes de Google) no cuentan como fallo de la app.
  const real = () => errors.splice(0).filter(e => !/fonts\.g|ERR_INTERNET|net::|Failed to load resource/i.test(e));

  let visits = 0, scenarios = 0;
  const t0 = Date.now();
  for (let i = 0; i < COUNT; i++) {
    const r = rng(SEED * 1000 + i);
    const state = randomState(r, i);
    scenarios++;
    await page.goto('/crear/cuenta', { waitUntil: 'domcontentloaded' });
    await page.evaluate(s => localStorage.setItem('weda-app', JSON.stringify(s)), state);
    real();
    for (const route of ROUTES) {
      visits++;
      const fail = (reason: string) => failures.push({ project, seed: SEED, scenario: i, route, reason });
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await settle(page);
        const url = new URL(page.url());
        const body = await page.locator('body').innerText();
        if (!state.onboarded && route.startsWith('/panel')) { if (!/\/crear/.test(url.pathname)) fail(`sin onboarding no redirige al alta (${url.pathname})`); continue; }
        if (/No se pudo cargar esta página|Esta página no existe/.test(body)) fail('pantalla de error o 404');
        if (body.trim().length < 20) fail('pantalla vacía');
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (m.sw > m.cw + 1) fail(`desborde horizontal ${m.sw} > ${m.cw}`);
        const errs = real();
        if (errs.length) fail(`errores de consola: ${errs[0]!.slice(0, 160)}`);
        if (route === '/panel' && !new RegExp(state.couple.first.slice(0, 3)).test(body)) fail('el Inicio no muestra el nombre de la pareja');
      } catch (e) { fail(`excepción de la prueba: ${String(e).slice(0, 160)}`); }
    }
    // El estado guardado sigue siendo válido y se mantiene estable al recargar.
    const a = await page.evaluate(() => localStorage.getItem('weda-app'));
    await page.goto('/panel', { waitUntil: 'domcontentloaded' }); await settle(page);
    await page.waitForTimeout(400);
    const b = await page.evaluate(() => localStorage.getItem('weda-app'));
    try {
      const pa = JSON.parse(a ?? 'null'), pb = JSON.parse(b ?? 'null');
      if (!pa || pa.version !== 2) failures.push({ project, seed: SEED, scenario: i, route: 'persistencia', reason: 'el estado guardado perdió su versión' });
      else if (state.onboarded && JSON.stringify(pa.guests.length) !== JSON.stringify(pb.guests.length)) failures.push({ project, seed: SEED, scenario: i, route: 'persistencia', reason: 'cambió la cantidad de invitados al recargar' });
    } catch { failures.push({ project, seed: SEED, scenario: i, route: 'persistencia', reason: 'JSON guardado inválido' }); }
  }

  const summary = { project, seed: SEED, scenarios, routeVisits: visits, failures: failures.length, seconds: Math.round((Date.now() - t0) / 1000) };
  writeFileSync(`${OUT}/explore-matrix-${project}.json`, JSON.stringify({ summary, failures }, null, 1));
  for (const f of failures) appendFileSync(`${OUT}/explore-failures.jsonl`, JSON.stringify(f) + '\n');
  console.log('EXPLORE-MATRIX ' + JSON.stringify(summary));
  expect(failures.slice(0, 10), `fallos de exploración (${failures.length}); ver ${OUT}/explore-matrix-${project}.json`).toEqual([]);
});
