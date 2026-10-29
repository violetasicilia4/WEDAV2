# Resultados de las pruebas

Auditoría del 2026-10-28. Rama `main`, punto de partida `bcf7fc4` (árbol limpio). Sin commits, push ni despliegues.

## Entorno
- **Navegador:** Google Chrome del equipo vía `CHROMIUM_PATH` (no se descargó Chromium de Playwright).
- **Servidor de pruebas:** `VITE_GOOGLE_MAPS_KEY= WEDA_DATA_DIR=.data-e2e npx vite dev --port 8091`. Va **sin clave de Google** para no llamar a servicios externos, y con datos propios en `.data-e2e/` (ignorado por git; no toca datos reales).
- **Comando:** `WEDA_URL=http://127.0.0.1:8091 CHROMIUM_PATH=… npx playwright test`. Proyectos: `mobile` (390 × 844, táctil) y `desktop` (1280 × 800).
- `playwright.config.ts` ahora levanta su servidor sin la clave de Google (`env: { VITE_GOOGLE_MAPS_KEY: '' }`).

## Línea de base (antes de cambiar nada)

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` | 174/174 |
| `npm run build` | OK |
| `npx eslint .` | 2 errores y 10 avisos. Los errores son previos: `any` en `e2e/explore/action-fuzz.spec.ts` |
| Playwright completo | **Parcial**: se cortó en la prueba 53 de 134 (tardaba mucho y el servidor de desarrollo ya tomaba los arreglos). Hasta ahí, 11 fallas (ver abajo) |

Fallas de la línea de base parcial, todas por cambios de producto de ese mismo día, ninguna por un error nuevo de la app:
- **8 del constructor en celular:** el título «Tu invitación» cambió su nombre accesible por el contador. Se arregló el componente (F-09).
- **Flujos 3 y 4c:** el campo «Dirección» no existe cuando el servidor tiene clave de Google. Se arregló el entorno (F-08).
- **Flujo 7:** validaba el pago falso. Se reescribió (F-01, F-02).

## Corrida final

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | OK |
| `npx vitest run` | **175/175** (13 archivos), incluye las pruebas del servidor |
| `npm run build` | OK |
| `npx eslint .` | Los mismos 2 errores previos y 10 avisos. Ninguno nuevo |
| Playwright completo (146 pruebas, 23 min) | **139 pasan, 7 fallan** |
| Reintento de las 7 | **7/7 pasan** (ver abajo) |

Las 7 fallas de la corrida completa:

| Prueba | Causa | Resolución |
|---|---|---|
| `builder.spec.ts` · recargar en medio de la edición | Se pasó del tiempo durante el alta de la cuenta | **Intermitente**: pasó al reintentar, sin cambios |
| `builder.spec.ts` · a 430 px | Igual | **Intermitente**: pasó al reintentar |
| `desktop/builder.spec.ts` · 1440 px | Igual | **Intermitente**: pasó al reintentar |
| `mobile-journeys.spec.ts` · Flujo 4c | Prueba desactualizada: los eventos ahora arrancan cerrados | Se abre la fila del evento; pasa |
| `mobile-journeys.spec.ts` · Flujo 7 | Prueba mal planteada: el `beforeEach` crea una cuenta, así que no probaba el caso «sin cuenta» | Se borra la sesión al empezar; pasa |
| `save-the-date-order.spec.ts` · aparece… (390 y 1280 px) | Prueba desactualizada: esperaba que el save the date no se pudiera quitar y que el mensaje final cerrara la página (ahora es opcional y no viene prendido) | Expectativas actualizadas; el archivo completo pasa (10/10) |

**Intermitencia conocida:** de vez en cuando el alta (`onboard`) supera los 60 s en el servidor de desarrollo. Ya figuraba en el historial del proyecto y no se pudo reproducir de forma aislada; parece la compilación en frío de Vite. Recomendación: correr la suite contra una compilación de producción (`WEDA_URL` a `vite preview`).

## Pruebas agregadas o cambiadas en la auditoría
- **Nuevo:** `e2e/audit.spec.ts`.
  - P-02/P-05: `/encontrar`.
  - D-05: sin scroll lateral en 7 medidas, en páginas públicas y del panel.
  - K-01: camino mínimo contado (12 acciones).
  - T-02: «Publicar los cambios».
- **Cambiadas:**
  - `account-flow.spec.ts` #2: sin botones de Google ni Apple.
  - `mobile-journeys.spec.ts`: Flujos 4c y 7.
  - `desktop/journeys.spec.ts`: publicar sin «Pagar» ni «Pagaste».
  - `save-the-date-order.spec.ts`: save the date opcional.
- **Unitarias:** `invitationPath` en `weda-logic.test.ts`.

## Limitaciones
- **Explorador con semilla** (`npm run test:explore`, `action-fuzz` y `state-matrix`): no se corrió; es largo y queda fuera de la suite por defecto. Su archivo tiene los 2 errores de lint previos.
- **Volumen** (500 invitados, 100 regalos): no se probó; falta un fixture.
- **Accesibilidad:** sin axe ni Lighthouse (no se agregaron dependencias) y sin lector de pantalla real.
- **Pagos:** no hay proveedor. No se hizo ningún pago y no hay estados de pago reales que probar.
- **Capturas y trazas:** Playwright guarda el contexto del error en `test-results/` (ignorado por git). No se adjuntaron capturas.

---

## Actualización 2026-10-29 · remediación
Ver `post-audit-remediation.md` §A.
- **Playwright contra el build de producción:**
  - línea base 143/146;
  - final 149/151;
  - las 2 fallas eran de las pruebas y se corrigieron: 25/25 al reintentar y 42/42 en la repetición ×3.
  - La prueba de pagos corre contra un segundo servidor con `WEDA_PAYMENTS_PROVIDER=test` (`WEDA_PAY_URL`). No existía en la línea base; pasó en la primera tanda de pruebas nuevas y en la corrida final.
- **Chequeos generales:**
  - `tsc` OK;
  - lint 0 errores y 10 avisos (antes, 2 errores);
  - **Vitest 195/195** (18 archivos; antes 175);
  - `build` OK.
- **Comandos:**
  - `VITE_GOOGLE_MAPS_KEY= npm run build`;
  - `NODE_ENV=production PORT=8092 WEDA_DATA_DIR=.data-e2e WEDA_SECRET=… WEDA_COOKIE_SECURE=false node .output/server/index.mjs`;
  - lo mismo en el 8093 con `WEDA_PAYMENTS_PROVIDER=test` y `WEDA_DATA_DIR=.data-e2e-pay`;
  - `WEDA_URL=http://127.0.0.1:8092 WEDA_PAY_URL=http://127.0.0.1:8093 CHROMIUM_PATH=… npx playwright test`.
