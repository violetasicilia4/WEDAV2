# PAY-07 · Trial, contratar y publicar, permanencia — plan técnico

- **Spec:** [spec.md](spec.md)
- **Estado:** aprobado (2026-11-04, la dueña). En construcción.
- **Rama:** `feat/trial-14-dias-ciclo-vida`, desde `main` en `705e534`.

## Enfoque
Se reutiliza lo de PAY-01: `access()`, `assertOperates()`, `fieldset.pn-readonly` y `OperationNotice`. Se agrega el estado del trial y se quita el vencimiento posterior a publicar. No se crea una arquitectura de publicación nueva: se reutilizan la copia publicada, «Publicar los cambios» y el `slug`.

## Base de datos
**Migración 8** (solo agrega): `ALTER TABLE weddings ADD COLUMN trial_started_at TEXT`. El valor inicial es `created_at` para los casamientos con borrador `onboarded` y los dos nombres cargados.
- `publications.expires_at` se conserva y deja de leerse. Las publicaciones nuevas guardan `NULL`.
- GIFT-09, aprobado con «migración 8», pasa a usar el número siguiente cuando se construya. Queda anotado en su spec.

## Servidor (`src/server/service.ts`)
- **`access(wid)`** devuelve `{ state, plan, trialEndsAt }`, con `trial`, `paused`, `paid_unpublished` y `active`. El orden de evaluación es:
  1. Publicación existente (y, con la compuerta, orden pagada de su plan) → `active`.
  2. Orden pagada → `paid_unpublished`.
  3. Sin `trial_started_at` → `trial`, con `trialEndsAt` en `null`.
  4. `trial_started_at` + 14 días ≤ ahora → `paused`.
  5. Si no → `trial`.
- **`saveWedding`:**
  - Con `paused` → `403 trial_ended`.
  - Fija `trial_started_at` la primera vez que el borrador queda `onboarded` y con los dos nombres.
- **`changePayout`:** con `paused` → `403 trial_ended`.
- **`publish(userId)` → `publishWedding(wid)`:**
  - Con `paused` y sin orden pagada → `403 trial_ended`.
  - Sin vencimiento: se quitan `publication_expired`, `expiresOf` y la escritura de `addTerm`.
- **`handlePaymentNotification`:** con `paid`, después de la transacción del pago, `try { publishWedding(wid) } catch {}`. La orden y el evento no dependen de la publicación.
- **`livePublication` y `public.ts`:** sin `410 site_expired`.
- **`assertOperates`:** sin la rama `expired`.

## Interfaz
- **`plans.ts`:**
  - Se agrega `TRIAL_DAYS = 14`.
  - `AccessState` pasa a `trial | paused | paid_unpublished | active`, y `Access.trialEndsAt` reemplaza a `expiresAt`.
  - Se quitan `PUBLICATION_TERM` y `PUBLICATION_MONTHS`.
- **`payments.ts`:** se quitan `addTerm` e `isExpired`, y `isLive` pasa a ser `publication.live`. `Publication.expiresAt` queda opcional en `types.ts` y `store.ts`.
- **`remote.ts`:** con `paused` no se envían guardados (aviso). Errores `trial_ended`.
- **`panel.tsx`:**
  - Banner de trial o pausa debajo de la cabecera, con «Elegir plan».
  - En pausa, `fieldset.pn-readonly disabled` sobre el contenido.
  - Preguntas frecuentes sin duración.
- **`ui.tsx` (`OperationNotice`):** caso `paused`, sin el caso `expired`.
- **`publish-dialog.tsx`:** «Recomendado» en Celebración, «Pagás y se publica en el momento» y sin «Vigente hasta».
- **`panel.pago.tsx`:** si la orden está pagada y publicada, muestra el resultado; si no, el reintento.
- **`landing-plans.tsx` e `index.tsx`:** «14 días gratis, sin tarjeta», «Pago único · sin renovaciones» y «Recomendado».
- **`terminos.tsx` y `privacidad.tsx`:** trial, pausa y publicación sin vencimiento. Siguen como borradores.

## Riesgos
- Pruebas que hoy esperan vencimiento o dos pasos: se reescriben con el comportamiento nuevo, sin debilitarlas.
- Pausa mientras hay una pestaña abierta: el cliente deja de enviar al saberlo. Si el servidor rechaza un guardado con `trial_ended`, el cliente actualiza `access` y no reintenta.

## Pruebas
| Criterio | Prueba |
|---|---|
| CA-1 … CA-5, CA-7 … CA-10, CA-12 … CA-14, CA-16 | Nueva `src/test/server/trial-lifecycle.test.ts` (reloj con `vi.setSystemTime`) |
| CA-16 | `expiry.test.ts` reescrita como «sin vencimiento» |
| CA-11, CA-15 | `payments-flow.test.ts`, que se adapta a la publicación automática |
| CA-17, CA-21 | `plan-access.test.ts` (sin la rama `expired`), `auth-isolation.test.ts` |
| CA-18 | `landing-plans.test.tsx` y búsqueda de textos |
| CA-19, CA-6 | E2E (banner, pausa, pago que publica solo) y recorrido |
| CA-20 | Nueva `src/test/server/migration-8.test.ts` |
| CA-22 | `typecheck`, `lint`, `npm test`, `build` |

## Documentación a actualizar
- **Blueprint `02`:** BR-63, BR-64 y BR-65; reemplazadas las reglas de vigencia y cierre; BR-45 suspendida.
- **Blueprint `01`:** ONB-05, PAY-07 y PUB-05 a PUB-09.
- **Blueprint `03`:** D-06; DP-29 a DP-31; se cierran las inconsistencias de vigencia; DA-1 a DA-3 reemplazadas.
- **Blueprint `00`:** aviso.
- **`data-architecture`:** avisos.
- **Otros:** `ux-flows`, `panel-frontend`, `design-system`, `PRODUCT.md`, la regla del servidor, aviso en la spec de PAY-01 y nota en GIFT-09.

## Correcciones después de la revisión (2026-11-04, sobre `500761c`)

- **Tiempo del trial:** el panel muestra el tiempo restante en períodos de 24 h y horas, y el fin exacto en hora de Argentina (`trialRemaining`). El vencimiento sigue siendo `trialEndsAt` (UTC) del servidor.
- **F-P1, una sola fuente del plan:** con una publicación, el plan que el panel y la vista previa muestran como incluido es el de la publicación confirmada por el servidor (`adoptPublication` en `remote.ts`). Al publicar, el servidor también lo deja en el borrador.
- **F-P2:** si la publicación automática después del pago falla, queda registrada como evento `publication_failed` (solo el código de error) y en el log del servidor.
- **F-P3:** se quitó `settleOrder`. Una orden solo queda pagada por la notificación firmada del proveedor (`settlePaymentEvent`, idempotente).
- **E2E de pagos:** preview `weda-pagos` (puerto 8091, proveedor de prueba, datos en `.data-e2e-pay`). `payments.spec` cubre:
  - Celebración: pagar publica, la URL queda disponible y se operan invitados.
  - Regalos: publica solo la lista, sin la invitación.
  - Pago rechazado y pago cancelado.
  - Evento de pago repetido.
  - Falla de publicación y recuperación sin un segundo cobro.
