# GIFT-09 · Aporte de importe libre — plan técnico

- **Spec:** [spec.md](spec.md) (problema, reglas, decisiones D1 a D7 y criterios)
- **Estado:** aprobado (2026-11-01, la dueña). Incluye la aprobación del cambio de esquema (migración 8).
- **Rama:** `feat/aporte-libre` desde `main`

## Base de datos
Migración 8, al final de `MIGRATIONS` en `src/server/db.ts`.
- SQLite no permite cambiar la clave primaria. Se rehace `contribution_items` **copiando todas las filas** en una sola transacción: se crea la nueva, se copia, se borra la vieja y se renombra.
- Nuevo esquema:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`;
  - `kind TEXT NOT NULL CHECK (kind IN ('gift','free'))`;
  - `gift_id` y `gift_name`, nulos solo en los libres, con `CHECK ((kind='gift') = (gift_id IS NOT NULL))`;
  - `suggested_amount INTEGER` (en regalos, el de lo publicado; en libres, nulo);
  - `amount INTEGER NOT NULL CHECK (amount > 0)`;
  - un índice por `contribution_id`.
- Las filas existentes pasan como `kind='gift'` con `suggested_amount = amount`. No se borra ningún dato. Sin unicidad sobre el regalo.

## Servidor (`src/server/service.ts`, `src/server/draft.ts`)
- `submitContribution` acepta `giftIds` (0 a 30) y `freeAmount` opcional. Hace falta al menos uno de los dos; si no, `invalid_gifts`.
- `freeAmount` se rechaza:
  - si lo publicado no lo habilita: `409 free_amount_disabled`;
  - si no es entero, está debajo del mínimo publicado o supera `MAX_AMOUNT`: `400 invalid_free_amount`.
- El total es la suma de los renglones, calculada en el servidor dentro de la transacción. La idempotencia no cambia.
- `listContributions` devuelve en cada renglón `kind`, `giftName` (vacío en los libres) y `amount`.
- `mailGiftReceipt` muestra «Aporte libre» como nombre del renglón.
- `publicSite` agrega `freeAmount: { enabled, min }` a lo publicado. El aviso de «cambios sin publicar» se enciende solo, porque compara lo publicado.
- Saneamiento del borrador (`sanitize` en `src/lib/weda/store.ts`, y `sanitizeDraft` en `src/server/draft.ts`, que lo usa en el servidor): `enabled` booleano, `min` entero entre `MIN_AMOUNT` y `MAX_AMOUNT` o nulo.

## Interfaz
- **Página pública** (`src/components/site/gifts-page.tsx`, `src/lib/weda/public-api.ts`, `src/lib/weda/site-model.tsx`):
  - si `site.freeAmount.enabled`, aparece la tarjeta «Aporte libre» al principio de la grilla, con el campo de monto y «Agregar»; misma validación que el servidor y el error junto al campo;
  - en el carrito es un renglón «Aporte libre» que se puede quitar o cambiar, y el total suma regalos más el aporte libre;
  - `sendGift` envía `freeAmount`, con los textos de error nuevos.
- **Panel:**
  - en `src/routes/panel.regalos.tsx`, pestaña «Mis regalos», el bloque «Aporte libre» con el interruptor y el mínimo opcional, validado con la lógica de montos de `logic.ts`, y guardado solo como el resto del borrador;
  - `contributionsFromServer` (`logic.ts`) y `contribution-review` muestran los renglones libres como «Aporte libre»;
  - los totales ya suman `total`.

## Riesgos
- **La migración rehace una tabla con datos de dinero.** Se copia en la misma transacción que cambia la versión de la base (si falla, vuelve atrás). Una prueba migra una base con aportes y compara filas y totales.
- **El monto libre lo manda el cliente.** Se acota con el mínimo y el máximo, solo enteros, el chequeo contra lo publicado y el límite de envíos públicos que ya existe.

## Pruebas (cubren CA-1 a CA-13 de la spec)
- `src/test/server/free-amount.test.ts`:
  1. Deshabilitado: 409.
  2. Monto bajo el mínimo publicado, decimal, negativo o sobre el máximo: 400.
  3. Aporte solo libre: 201, total igual al monto, renglón `free`.
  4. Regalo más libre: total igual a la suma.
  5. Reenviar con la misma clave no duplica.
  6. Cambiar el mínimo en el borrador no afecta hasta publicar.
  7. La API pública no expone datos de aportes.
  8. La migración conserva filas y totales.
- `auth-isolation.test.ts`: los aportes libres de una pareja no aparecen en otra.
- Componentes: la tarjeta y el carrito de la página pública, y el bloque del panel.
- Ajustes: `wedding-flow` y `hardening` (versión 8 de la base). La E2E `backend.spec.ts` se ajusta pero no se ejecuta.
- Checks: `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`, más el recorrido en el navegador (preview «weda», 390 px y compu).

## Documentación a actualizar
Inventario (GIFT-09), BR-20 (implementada), una línea en el modelo de datos sobre la migración 8 y una sección con fecha en `docs/ux-flows.md`. Al cerrar, la spec pasa a «cerrada».
