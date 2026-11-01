# GIFT-09 · Aporte de importe libre — spec

- **Estado:** aprobada (2026-11-01, la dueña, junto con el plan). Todavía no está en construcción.
- **Tamaño:** mediana. Cambia el esquema de la base (migración 8), que ya fue aprobado en el plan.
- **Plan:** [plan.md](plan.md)
- **Origen:** plan aprobado el 2026-11-01 en la sesión «Plan de GIFT-09». Se separó en esta spec (qué y decisiones) y en el plan (cómo), sin cambiar su contenido.

## Problema
Hoy un invitado solo puede regalar ítems de la lista, con el monto que fijó la pareja. Quien prefiere «regalar plata» termina eligiendo un ítem cualquiera o no regala. La pareja tiene que poder habilitar un aporte de importe libre, y el invitado tiene que poder usarlo en el mismo flujo de siempre: alias, comprobante y revisión manual.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| GIFT-09 | `docs/product-blueprint/01-feature-inventory.md` | DECIDIDO (Q1), no implementada | La funcionalidad |
| BR-20 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO (Q1), PARCIAL | Las dos modalidades: regalo con importe sugerido y aporte libre |
| Q1 | `docs/data-architecture/02-domain-model.md` §5.1 y `04-data-dictionary.md` (`ContributionItem`, `GiftSettings`) | DECIDIDO | Renglón de tipo «libre» sin regalo; habilitación por casamiento con mínimo opcional; total = suma de renglones |
| BR-19 | Catálogo de reglas | DECIDIDO, implementada | Sin unicidad sobre el regalo |
| BR-22 | Catálogo de reglas | DECIDIDO, implementada | Comprobante obligatorio |
| BR-23 | Catálogo de reglas | DECIDIDO, implementada | Correo del invitado obligatorio |
| BR-24 | Catálogo de reglas | DOCUMENTADO, implementada | El aporte nace pendiente de revisión |
| BR-27 | Catálogo de reglas | DECIDIDO, implementada | Nada de datos de aportes en lo público |
| PUB-04 | Inventario | DOCUMENTADO, implementada | Lo público es la copia publicada |

## Decisiones de la funcionalidad (aprobadas por la dueña el 2026-11-01)
- **D1 · Dónde se guarda la habilitación:** en el borrador (`gifts.freeAmount = { enabled, min }`). Se publica con la página, y el servidor valida contra lo publicado.
  - El modelo decidido la ubica en `GiftSettings` (Q1). Esa entidad llega con la moneda (GIFT-10). Es una diferencia de ubicación aprobada, no de regla.
- **D2 · Valor inicial:** apagado, para parejas nuevas y existentes.
- **D3 · Límites:** pesos enteros (ARS implícito hasta GIFT-10).
  - Mínimo: el que fije la pareja, nunca menos de $ 1.000 (`MIN_AMOUNT`). Si lo deja vacío, el mínimo es $ 1.000.
  - Máximo: $ 100.000.000 (`MAX_AMOUNT`).
- **D4 · Combinar con regalos:** sí, en el mismo aporte, con un solo renglón libre por aporte.
- **D5 · Requisito de la lista:** la sección de regalos aparece solo si hay al menos un regalo. El aporte libre es una opción dentro de la lista.
- **D6 · Textos:**
  - Página pública: tarjeta «Aporte libre», con el texto «Elegí cuánto querés regalar» y un campo de monto («Mínimo $ …» si la pareja fijó uno).
  - Panel: «Aporte libre», con el interruptor «Dejar que tus invitados elijan cuánto regalar» y «Monto mínimo (opcional)».
  - Revisión de aportes y correo: renglón «Aporte libre: $ X».
- **D7 · `/ejemplo`:** sin cambios.

## Criterios de aceptación

| # | Criterio | Regla o decisión | Cómo se verifica |
|---|---|---|---|
| CA-1 | Viene apagado para parejas nuevas y existentes | D2 | Prueba de saneamiento del borrador; recorrido |
| CA-2 | La pareja lo habilita en el panel, con mínimo opcional validado entre $ 1.000 y $ 100.000.000 | D1, D3, D6 | Prueba del bloque del panel; recorrido |
| CA-3 | Los invitados ven la tarjeta solo si está habilitado **en lo publicado**; cambiarlo no afecta la página hasta publicar | PUB-04, D1, D5 | `free-amount.test.ts` (6); recorrido |
| CA-4 | Un aporte solo libre se acepta (201), con total igual al monto, renglón `free`, pendiente de revisión, comprobante y correo obligatorios | BR-20, BR-22, BR-23, BR-24 | `free-amount.test.ts` (3) |
| CA-5 | Regalo más aporte libre en un mismo envío, con un solo renglón libre y total igual a la suma | D4, Q1 | `free-amount.test.ts` (4) |
| CA-6 | El servidor rechaza: deshabilitado (409 `free_amount_disabled`); decimal, negativo, debajo del mínimo publicado o sobre el máximo (400 `invalid_free_amount`) | D3 | `free-amount.test.ts` (1, 2) |
| CA-7 | Los importes de los regalos siguen saliendo de lo publicado; el monto libre es el único que viene del cliente | Q1 | `free-amount.test.ts` (4) |
| CA-8 | Reenviar con la misma clave no duplica | Idempotencia vigente | `free-amount.test.ts` (5) |
| CA-9 | La API pública no expone ningún dato de aportes | BR-27 | `free-amount.test.ts` (7) |
| CA-10 | El panel y el correo al invitado muestran «Aporte libre: $ X» | D6 | Prueba del panel; recorrido |
| CA-11 | La migración 8 conserva todas las filas y totales de aportes anteriores | Q1 | `free-amount.test.ts` (8) |
| CA-12 | Los aportes libres de una pareja no aparecen en otra | Aislamiento (A7) | `auth-isolation.test.ts` |
| CA-13 | `/ejemplo` no cambia | D7 | Recorrido |

## Fuera de alcance
- Moneda (GIFT-10), libro inmutable (GIFT-12), importe distinto del sugerido en un regalo, cuotas o porcentajes.
- Mostrar públicamente cuánto se juntó (prohibido por BR-27).

## Preguntas abiertas (no bloquean GIFT-09)
- **Multiusuario:** cuando exista, ¿quién puede habilitar el aporte libre y fijar el mínimo, el colaborador (administra la lista) o solo un administrador?
  - Depende del modelo multiusuario (DA-MU, DA-19), que todavía no está implementado. Mientras haya un solo usuario por casamiento, no aplica.
- **Archivo:** en el estado de archivo (DA-1) no se aceptan aportes, tampoco libres. Se resuelve con el diseño del archivo (N2), no acá.
- Las decisiones DA están en `docs/architecture/platform-readiness-audit.md`, que es un **borrador sin aprobar ni commitear** al 2026-11-01.

## Revisión de consistencia (antes de construir)
- [x] Los IDs citados existen en el Blueprint y en `data-architecture/`, con el estado indicado (revisado el 2026-11-01).
- [x] `MIN_AMOUNT` (1.000) y `MAX_AMOUNT` (100.000.000) existen en `src/lib/weda/logic.ts`.
- [x] Ningún criterio contradice una regla decidida. D1 ubica la habilitación en el borrador en lugar de `GiftSettings`, con aprobación expresa.
- [x] Lo pendiente está marcado y no bloquea.

## Verificación al cerrar

| Criterio | Evidencia |
|---|---|
| CA-1 a CA-13 | (al cerrar) |
