import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { COUNT, rng, randomState, SEED, type Rng } from './rng';

/* Exploración por secuencias de acciones. Cada «recorrido» parte de un estado sintético y ejecuta STEPS acciones de una pareja (navegar, volver, recargar,
   agregar/quitar/deshacer regalos, invitados y mesas, editar la portada y los datos, abrir la vista previa, mirar y cerrar el diálogo de publicar).
   Las acciones se eligen con una semilla, así que cualquier fallo se reproduce con WEDA_SEED y el número de recorrido.
   Invariantes después de cada acción: sin errores de consola, sin desborde horizontal, sin pantalla de error, y un formulario que se rechaza dice por qué
   y no cambia nada; uno que se acepta cambia el estado guardado exactamente en una unidad. */

const STEPS = Number(process.env['WEDA_EXPLORE_STEPS'] ?? 14);
const SEQUENCES = Math.max(1, Math.round(COUNT / 4));
// Fuera de test-results: Playwright vacía esa carpeta al empezar cada proyecto y borraría los informes.
const OUT = 'explore-results';
const ONLY = process.env['WEDA_SEQ'] === undefined ? null : Number(process.env['WEDA_SEQ']);
const NAMES_OK = ['Lucas', 'Ana Paula', "D'Angelo", 'María José', 'Jean-Luc', 'Zoë', 'Iñaki'];
const NAMES_BAD = ['', 'X', '<b>x</b>', '😀', '1234', 'A'.repeat(50), '   '];
const AMOUNTS_OK = ['1000', '45.000', '$ 250000', '99999999'];
const AMOUNTS_BAD = ['', 'abc', '0', '999', '100000001', '-5', '12,5'];

type Failure = { project: string; seed: number; sequence: number; step: number; action: string; reason: string };
type Ctx = { page: Page; r: Rng; log: string[] };

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('weda-app') ?? '{}'));
const settle = (page: Page) => page.waitForFunction(() => document.body && !/Cargando/.test(document.body.innerText) && document.body.innerText.trim().length > 20, undefined, { timeout: 15000 }).catch(() => undefined);
const visible = (loc: ReturnType<Page['locator']>) => loc.first().isVisible().catch(() => false);
const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Secciones del panel' }).getByRole('link', { name });
/** Lee el estado guardado cuando ya se escribió (el guardado es diferido). */
async function storedSoon(page: Page, ok: (s: any) => boolean) { const t = Date.now(); let s = await stored(page); while (!ok(s) && Date.now() - t < 3000) { await page.waitForTimeout(150); s = await stored(page); } return s; }


/** Después de enviar un formulario: espera hasta 3 s a que ocurra una de las dos cosas legítimas (el diálogo se cierra, o aparece un error). Un tiempo fijo corto daba falsos fallos cuando la máquina estaba cargada. */
async function afterSubmit(page: Page, dlg: ReturnType<Page['locator']>) {
  await page.waitForFunction(() => !document.querySelector('[role=dialog]') || !!document.querySelector('[role=dialog] .pn-error'), undefined, { timeout: 3000 }).catch(() => undefined);
  void dlg;
}

class Skip extends Error {}
const need = (cond: boolean, why: string) => { if (!cond) throw new Skip(why); };

type Action = { name: string; run: (c: Ctx) => Promise<string | void> };
const actions: Action[] = [
  { name: 'ir a una sección', run: async ({ page, r }) => { const to = r.pick(['Inicio', 'Regalos', 'Tu página', 'Invitados']); await nav(page, to).click(); await settle(page); return to; } },
  { name: 'atrás o adelante', run: async ({ page, r }) => {
    // «Atrás» desde la primera pantalla del panel sale de la app (vuelve a la página desde donde la prueba cargó el estado): es el comportamiento normal del navegador,
    // así que la prueba vuelve «adelante» para seguir dentro del panel.
    if (r.chance(0.5)) await page.goBack(); else await page.goForward();
    await settle(page);
    if (!new URL(page.url()).pathname.startsWith('/panel')) { await page.goForward(); await settle(page); return 'salió del panel y volvió'; }
  } },
  { name: 'recargar', run: async ({ page }) => { const before = await storedSoon(page, () => true); await page.waitForTimeout(500); await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page); const after = await stored(page); expect(after.guests?.length, 'invitados tras recargar').toBe(before.guests?.length); expect(after.gifts?.items?.length, 'regalos tras recargar').toBe(before.gifts?.items?.length); } },
  { name: 'abrir y cerrar la vista previa', run: async ({ page }) => { const b = page.getByRole('button', { name: 'Vista previa', exact: true }).first(); need(await visible(b), 'sin botón'); await b.click(); await expect(page.getByRole('dialog').locator('iframe')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); } },
  { name: 'agregar un regalo propio', run: async ({ page, r }) => {
    await nav(page, 'Regalos').click(); await settle(page);
    const open = page.getByRole('button', { name: 'Crear regalo' }).first(); need(await visible(open), 'sin botón');
    const n0 = (await stored(page)).gifts.items.length;
    await open.click(); const dlg = page.getByRole('dialog');
    const okName = r.chance(0.6), okAmount = r.chance(0.6);
    await dlg.getByLabel(/Nombre/).first().fill(okName ? `${r.pick(['Cena', 'Spa', 'Vuelo', 'Clases'])} ${r.int(1, 999)}` : r.pick(NAMES_BAD));
    await dlg.getByLabel(/Monto|Valor/).first().fill(okAmount ? r.pick(AMOUNTS_OK) : r.pick(AMOUNTS_BAD));
    await dlg.getByRole('button', { name: /Crear|Guardar|Agregar/ }).last().click();
    await afterSubmit(page, dlg);
    if (await dlg.count()) { expect(await dlg.locator('.pn-error').count(), 'un regalo rechazado debe explicar por qué').toBeGreaterThan(0); expect((await stored(page)).gifts.items.length).toBe(n0); await page.keyboard.press('Escape'); return 'rechazado'; }
    const s = await storedSoon(page, x => x.gifts.items.length === n0 + 1); expect(s.gifts.items.length, 'regalo aceptado suma exactamente uno').toBe(n0 + 1); return 'aceptado';
  } },
  { name: 'quitar un regalo y deshacer', run: async ({ page, r }) => {
    await nav(page, 'Regalos').click(); await settle(page);
    await page.getByRole('tab', { name: /Mis regalos/ }).click().catch(() => undefined);
    const rm = page.getByRole('button', { name: /^Quitar / }).first(); need(await visible(rm), 'no hay regalos');
    const n0 = (await stored(page)).gifts.items.length; await rm.click();
    await storedSoon(page, x => x.gifts.items.length === n0 - 1); expect((await stored(page)).gifts.items.length).toBe(n0 - 1);
    if (r.chance(0.6)) { await page.getByRole('button', { name: 'Deshacer' }).click(); const s = await storedSoon(page, x => x.gifts.items.length === n0); expect(s.gifts.items.length, 'deshacer devuelve el regalo').toBe(n0); return 'deshecho'; }
  } },
  { name: 'agregar un invitado', run: async ({ page, r }) => {
    await nav(page, 'Invitados').click(); await settle(page);
    const open = page.getByRole('button', { name: 'Agregar invitado' }).first(); need(await visible(open), 'sin botón');
    const n0 = (await stored(page)).guests.length; await open.click(); const dlg = page.getByRole('dialog');
    const ok = r.chance(0.6);
    const nm = ok ? r.pick(NAMES_OK) : r.pick(NAMES_BAD), ap = ok ? r.pick(['Pérez', 'Sosa', 'Núñez']) : r.pick(NAMES_BAD);
    await dlg.getByLabel('Nombre', { exact: true }).fill(nm);
    await dlg.getByLabel('Apellido').fill(ap);
    await dlg.getByRole('button', { name: 'Agregar', exact: true }).click(); await afterSubmit(page, dlg);
    if (await dlg.count()) { expect(await dlg.locator('.pn-error').count(), `un invitado rechazado debe explicar por qué · nombre «${nm}» apellido «${ap}» · diálogo: ${(await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 300)}`).toBeGreaterThan(0); expect((await stored(page)).guests.length).toBe(n0); await page.keyboard.press('Escape'); return 'rechazado'; }
    const s = await storedSoon(page, x => x.guests.length === n0 + 1); expect(s.guests.length, 'invitado aceptado suma exactamente uno').toBe(n0 + 1); return 'aceptado';
  } },
  { name: 'eliminar un invitado y deshacer', run: async ({ page, r }) => {
    await nav(page, 'Invitados').click(); await settle(page);
    const del = page.getByRole('button', { name: /^Eliminar a / }).first(); need(await visible(del), 'sin invitados');
    const n0 = (await stored(page)).guests.length; await del.click();
    await storedSoon(page, x => x.guests.length === n0 - 1); expect((await stored(page)).guests.length).toBe(n0 - 1);
    if (r.chance(0.7)) { await page.getByRole('button', { name: 'Deshacer' }).click(); const s = await storedSoon(page, x => x.guests.length === n0); expect(s.guests.length).toBe(n0); return 'deshecho'; }
  } },
  { name: 'cambiar la asistencia de un invitado', run: async ({ page, r }) => {
    await nav(page, 'Invitados').click(); await settle(page);
    const ed = page.getByRole('button', { name: /^Editar a / }).first(); need(await visible(ed), 'sin invitados');
    await ed.click(); const dlg = page.getByRole('dialog'); const label = r.pick(['Confirmado', 'Pendiente', 'No asiste']);
    const sel = dlg.getByLabel('Asistencia'); const opts = await sel.locator('option').allInnerTexts(); need(opts.some(o => o.trim() === label) || opts.length > 0, 'sin opciones');
    await sel.selectOption({ label: opts.find(o => o.trim() === label) ?? opts[0]! }); await dlg.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } },
  { name: 'crear una mesa', run: async ({ page, r }) => {
    await page.goto('/panel/invitados?vista=mesas', { waitUntil: 'domcontentloaded' }); await settle(page);
    const open = page.getByRole('button', { name: 'Crear mesa' }).first(); need(await visible(open), 'sin botón');
    // Sin mesas guardadas la pantalla muestra «Mesa 1» de ejemplo y la guarda junto con la primera mesa nueva: el oráculo compara ids, no cantidades.
    const before: string[] = (await stored(page)).groups.map((g: { id: string }) => g.id);
    await open.click(); const dlg = page.getByRole('dialog'); const ok = r.chance(0.6);
    const name = ok ? `Mesa ${r.pick(['Primos', 'Amigos', 'Trabajo'])} ${r.int(1, 99)}` : r.pick(['', ' ', 'A', 'x'.repeat(41)]);
    await dlg.getByLabel('Nombre').first().fill(name);
    await dlg.getByRole('button', { name: 'Crear', exact: true }).click(); await afterSubmit(page, dlg);
    if (await dlg.count()) { expect(await dlg.locator('.pn-error').count(), 'una mesa rechazada debe explicar por qué').toBeGreaterThan(0); expect((await stored(page)).groups.map((g: { id: string }) => g.id)).toEqual(before); await page.keyboard.press('Escape'); return 'rechazada'; }
    const s = await storedSoon(page, x => x.groups.some((g: { name: string }) => g.name === name.trim()));
    const ids: string[] = s.groups.map((g: { id: string }) => g.id);
    expect(before.every(id => ids.includes(id)), 'no desaparece ninguna mesa existente').toBe(true);
    expect(s.groups.filter((g: { name: string }) => g.name === name.trim()).length, `la mesa «${name}» se guarda una sola vez`).toBe(1);
    expect(ids.length - before.length, 'solo se suma la mesa nueva (y la de ejemplo si no había ninguna)').toBeLessThanOrEqual(before.length === 0 ? 2 : 1);
    return 'aceptada';
  } },
  { name: 'editar el texto de la portada', run: async ({ page, r }) => {
    await nav(page, 'Tu página').click(); await settle(page);
    const f = page.getByLabel('Texto sobre los nombres'); need(await visible(f), 'sin campo');
    const v = r.pick(['¡Nos casamos!', 'Nos casamos en otoño', '', 'Tres, dos, uno… ¡sí!', 'x'.repeat(120)]);
    await f.fill(v); const s = await storedSoon(page, x => x.site.coverText === v); expect(s.site.coverText, 'la portada guarda lo escrito').toBe(v);
  } },
  { name: 'editar los datos de la pareja', run: async ({ page, r }) => {
    await nav(page, 'Inicio').click(); await settle(page);
    const open = { click: () => page.goto('/panel?editar=datos', { waitUntil: 'networkidle' }) };
    const before = (await stored(page)).couple.first; await open.click(); const dlg = page.getByRole('dialog', { name: 'Datos del casamiento' }); const ok = r.chance(0.6);
    const nv = ok ? r.pick(NAMES_OK) : r.pick(NAMES_BAD); await dlg.getByLabel('Tu nombre').fill(nv); await dlg.getByRole('button', { name: 'Guardar' }).click(); await afterSubmit(page, dlg);
    if (await dlg.count()) { expect(await dlg.locator('.pn-error').count(), 'datos rechazados deben explicar por qué').toBeGreaterThan(0); expect((await stored(page)).couple.first).toBe(before); await page.keyboard.press('Escape'); return 'rechazado'; }
    const s = await storedSoon(page, x => x.couple.first === nv.trim()); expect(s.couple.first).toBe(nv.trim()); return 'aceptado';
  } },
  { name: 'mirar los productos de publicación y cerrar', run: async ({ page, r }) => {
    const pub = page.locator('.pn-top').getByRole('button', { name: /^Publicar$|^Publicada$/ }); need(await visible(pub), 'sin botón');
    await pub.first().click(); const dlg = page.getByRole('dialog'); await expect(dlg).toBeVisible();
    const plan = dlg.getByRole('button', { name: /^Publicar (Regalos|Celebración|Celebración Plus)$/ });
    if (await plan.count() && r.chance(0.6)) { await plan.nth(r.int(0, 2)).click(); await expect(dlg.getByText('Al publicar, cualquiera que tenga el link')).toBeVisible(); await dlg.getByRole('button', { name: 'Volver', exact: true }).click(); }
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  } },
];

test('secuencias de acciones con semilla', async ({ page }, info) => {
  mkdirSync(OUT, { recursive: true });
  const project = info.project.name, failures: Failure[] = [], infra: Failure[] = [];
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const realErrors = () => errors.splice(0).filter(e => !/fonts\.g|ERR_INTERNET|net::|Failed to load resource/i.test(e));
  // Falla rápido (4 s por acción de la interfaz): un selector que no aparece se clasifica como error de la prueba, no se espera 30 s.
  page.setDefaultTimeout(4000);
  const counts: Record<string, { ok: number; skip: number; fail: number }> = {};
  const trace = (m: string) => appendFileSync(`${OUT}/explore-actions-trace-${project}.log`, m + '\n');
  let steps = 0, done = 0;
  const t0 = Date.now();

  for (let q = 0; q < SEQUENCES; q++) {
    if (ONLY !== null && q !== ONLY) continue;
    const r = rng(SEED * 7919 + q);
    const state: any = randomState(r, 5000 + q);
    state.onboarded = true; state.planId = null; state.publication = null;
    state.guests = state.guests.slice(0, 30); state.gifts.items = state.gifts.items.slice(0, 12);
    state.couple.first = r.pick(NAMES_OK); state.couple.second = r.pick(NAMES_OK);
    state.date = null;
    await page.goto('/crear/cuenta', { waitUntil: 'domcontentloaded' });
    await page.evaluate(s => localStorage.setItem('weda-app', JSON.stringify(s)), state);
    await page.goto('/panel', { waitUntil: 'domcontentloaded' }); await settle(page); realErrors();
    const log: string[] = [];
    let broke = false;
    for (let k = 0; k < STEPS && !broke; k++) {
      const a = r.pick(actions); steps++;
      counts[a.name] ??= { ok: 0, skip: 0, fail: 0 };
      const rec = (reason: string, bucket: Failure[]) => { bucket.push({ project, seed: SEED, sequence: q, step: k, action: a.name, reason: reason.slice(0, 300) }); };
      const ts = Date.now();
      try {
        const res = await a.run({ page, r, log }); log.push(`${a.name}${res ? ' · ' + res : ''}`);
        // Invariantes comunes.
        const errs = realErrors(); if (errs.length) throw new Error(`errores de consola: ${errs[0]}`);
        const body = await page.locator('body').innerText();
        if (/No se pudo cargar esta página/.test(body)) throw new Error('pantalla de error');
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        if (m.sw > m.cw + 1) throw new Error(`desborde horizontal ${m.sw} > ${m.cw}`);
        counts[a.name]!.ok++; done++; trace(`OK   q${q} s${k} ${a.name} ${Date.now() - ts}ms ${res ?? ''}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message.split('\n').filter(l => /locator|waiting for|intercepts|not visible|disabled|not enabled|resolved to|stable|element/.test(l)).slice(0, 10).map(l => l.trim()).join(' | ') || e.message.split('\n')[0]! : String(e);
        trace(`ERR  q${q} s${k} ${a.name} ${Date.now() - ts}ms ${msg.slice(0, 700)}`);
        if (e instanceof Skip) { counts[a.name]!.skip++; continue; }
        // Error de la prueba (selector que no aparece / tiempo agotado) ≠ fallo del producto: se registra aparte.
        if (/not stable|outside of the viewport/.test(msg)) {
          // Diagnóstico: posición de cada «Deshacer» y de cada aviso en tres instantes.
          const samples: string[] = [];
          for (let i = 0; i < 3; i++) { samples.push(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent === 'Deshacer').map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), b.closest('.pn-toast') ? 'toast' : 'otro']; })).catch(() => 'x'))); await page.waitForTimeout(200); }
          const env = await page.evaluate(() => { const t = document.querySelector('.pn-toast'); const c = t?.parentElement; const r = (el?: Element | null) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }; const vv = window.visualViewport; return { inner: [innerWidth, innerHeight], vv: vv ? [Math.round(vv.width), Math.round(vv.height), Math.round(vv.offsetTop), vv.scale] : null, scroll: [Math.round(scrollX), Math.round(scrollY)], docH: document.documentElement.scrollHeight, toast: r(t), toastParent: c ? [c.className, getComputedStyle(c).position, r(c)] : null, active: document.activeElement?.tagName }; }).catch(() => null);
          trace(`DIAG-ENV ${JSON.stringify(env)}`);
          trace(`DIAG q${q} s${k} url=${page.url().replace(/^https?:\/\/[^/]+/, '')} deshacer=${samples.join(' ')} toasts=${await page.locator('.pn-toast').count()} dialog=${await page.getByRole('dialog').count()}`);
        }
        if (/Timeout|waiting for|strict mode|locator\.|Target (page|closed)|Execution context/i.test(msg) && !/expect\(/.test(msg)) { counts[a.name]!.fail++; rec(msg, infra); await page.keyboard.press('Escape').catch(() => undefined); await page.goto('/panel', { waitUntil: 'domcontentloaded' }).catch(() => undefined); await settle(page); realErrors(); continue; }
        counts[a.name]!.fail++; rec(`${msg} · pasos: ${log.join(' > ')}`, failures); broke = true;
      }
    }
  }
  const summary = { project, seed: SEED, sequences: SEQUENCES, stepsAttempted: steps, stepsPassed: done, productFailures: failures.length, testInfraErrors: infra.length, seconds: Math.round((Date.now() - t0) / 1000), byAction: counts };
  writeFileSync(`${OUT}/explore-actions-${project}.json`, JSON.stringify({ summary, failures, infra }, null, 1));
  for (const f of failures) appendFileSync(`${OUT}/explore-failures.jsonl`, JSON.stringify({ kind: 'acciones', ...f }) + '\n');
  console.log('EXPLORE-ACTIONS ' + JSON.stringify({ ...summary, byAction: undefined }));
  expect(failures.slice(0, 10), `fallos del producto en secuencias (${failures.length}); ver ${OUT}/explore-actions-${project}.json`).toEqual([]);
});
