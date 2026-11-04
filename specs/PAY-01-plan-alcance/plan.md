# PAY-01 · Plan: alcance de publicación y de operación — plan técnico

- **Spec:** [spec.md](spec.md) (aprobada 2026-11-03)
- **Estado:** aprobado (2026-11-03, la dueña). En construcción.
- **Rama:** `docs/planes-y-roadmap` (la dueña pidió mantener el trabajo en la rama actual).
- **Base del análisis:** `origin/main` en `0d2fb4d`, solo lectura.

Documenta **cómo** se construye lo que pide la spec. No crea decisiones de producto: lo que aparezca va a «Preguntas abiertas» de la spec. Los supuestos técnicos van marcados como **S-n** para revisarlos.

## Enfoque

1. **Una sola fuente de verdad en el servidor.** Una función nueva, `access(wid)` en `service.ts`, calcula el **plan operativo** y la **vigencia** a partir de las órdenes y de la publicación. Todo control de escritura pasa por ella. El navegador nunca declara un plan.
2. **Separar «publicar» de «operar» en `plans.ts`.**
   - `publishes(plan, feature)` reemplaza a `can()` donde se arma lo público y la vista previa.
   - `operates(access, op)` decide las operaciones.
   - Ver y editar contenido no consultan ninguna de las dos (F5).
3. **El panel lee `access`** que devuelve `GET /api/wedding`: deshabilita y explica, pero no oculta. La vista previa no escribe (F6).
4. **Cambio de plan bloqueado** en el servidor y retirado de la interfaz (F8).
5. **Sin cambios de esquema.** Todo se apoya en `orders`, `payment_events` y `publications`, que ya existen.

## Estados

### Orden (`orders.status`, sin cambios)

| Estado | Quién lo fija | Siguiente |
|---|---|---|
| `pending` | `startCheckout` (reusa la pendiente del mismo plan y monto) | `paid` / `failed` / `cancelled`, solo por notificación verificada |
| `paid` | `handlePaymentNotification` (firma verificada, evento único en `payment_events`) | Final |
| `failed`, `cancelled` | Notificación del proveedor | Final; se puede empezar otra orden |

Una orden cerrada no cambia por un evento posterior, y un evento repetido se ignora (idempotencia que ya existe y ya tiene pruebas).

### Publicación (`publications`, sin cambios)

| Estado | Cómo se llega |
|---|---|
| (no existe) | Antes de la primera publicación |
| `live` | `publish` dentro de una transacción. La primera vez fija `expires_at = addTerm(ahora)` |
| `taken_down` | `unpublish` |
| vencida (calculado) | `expiresOf(p) <= ahora`. No es un valor de la columna |

### Acceso operativo del casamiento (nuevo, calculado y no guardado)

| Estado | Condición | Plan operativo | Opera |
|---|---|---|---|
| `trial` | No hay publicación | `null` | Nada (F1) |
| `paid_unpublished` | Hay orden `paid` y todavía no hay publicación | `null` | Nada (DP-25) |
| `active` | Hay publicación, no venció y (con compuerta de pago) existe una orden `paid` cuyo plan, normalizado, es el de la publicación | El de la publicación, normalizado | Según BR-62 |
| `expired` | Hay publicación vencida | El de la publicación | Nada: `410 event_expired` |

- **S-1 · Con la publicación dada de baja (`taken_down`) y vigente, el evento sigue `active`.** Bajar la página es una acción de la pareja y no es un cierre. Revisar con la dueña.
- **S-2 · Sin compuerta de pago** (`WEDA_REQUIRE_PAID_ORDER` apagado: desarrollo y pruebas, IC-17), basta con la publicación. En producción la compuerta tiene que estar encendida, como ya lo exige IC-17.

`access(wid)` devuelve `{ state, plan, expiresAt }`. El plan operativo **no** sale nunca del borrador.

## Base de datos

**No hay migraciones.** Se revisó qué hace falta:

- `orders.plan_id` y `publications.plan_id` siguen aceptando `'regalos' | 'invitacion' | 'completo'`. No se toca el `CHECK`, así las filas históricas siguen siendo válidas.
- Lo publicado queda registrado en `publications.plan_id` y en la copia publicada, y lo contratado en `orders.plan_id` + `amount` + `paid_at`, más la fila de `payment_events`. Es el mínimo que pide CA-11. El historial de publicaciones (DP-26) queda fuera.
- **Compatibilidad con lo histórico:**
  - Las órdenes `completo` pagadas se normalizan a Celebración solo al leerlas (`normalizePlanId`). Su monto no se toca.
  - Las publicaciones `completo` se leen como Celebración.
  - `expires_at` guardado no se recalcula. Los que están vacíos (anteriores a la migración 5) siguen con el cálculo actual: es un riesgo conocido (IC-16) y no se corrige en esta funcionalidad.

## Servidor (`src/server/`)

### `service.ts`

| Cambio | Detalle |
|---|---|
| `access(wid)` (nuevo, privado) | Calcula el estado de la tabla de arriba con una lectura de `publications` y una de las órdenes `paid`. El orden entre planes sale de `inherits` (F3), no de `price` |
| `assertOperates(wid, op)` (nuevo) | Si no hay plan operativo → `403 feature_requires_plan` con `{ feature, plan: 'invitacion' }`. Si venció → `410 event_expired`. Las operaciones son `guests` y `groups`, que exigen Celebración, y `contributions`, que exige Regalos o Celebración |
| `saveWedding` | Antes de escribir, y dentro de la transacción: si `guests.upsert` o `guests.remove` traen algo → `assertOperates('guests')`. Si `JSON.stringify(draft.groups)` cambió respecto del borrador guardado → `assertOperates('groups')`. El resto del borrador (contenido, lista de regalos, secciones, plan elegido) se guarda siempre (F5). Si se rechaza, no se escribe nada (todo o nada) |
| `getWedding` | Suma `access: { state, plan, expiresAt }` a la respuesta |
| Revisión de aportes (`PATCH /api/contributions/:id`, `POST …/remind`) | `assertOperates('contributions')`. Ver la lista y los comprobantes queda como hoy, porque es lectura |
| `submitRsvp`, `submitContribution` (públicos) | Sin cambios: ya se rechazan por la copia publicada (`rsvp_disabled`, `gifts_disabled`) y por el vencimiento (`410 site_expired`) |
| `startCheckout` y `createOrder` | Con una orden `paid` del **mismo** plan → `409 already_paid`, como hoy. Con una orden `paid` de **otro** plan → `409 plan_change_pending`, sin crear orden (F8). Se elimina la resta de precios |
| `publish` | `entitledPlan` sigue igual: con compuerta, el plan de la orden pagada; sin compuerta, el del borrador. Nuevo: si ya existe una publicación y el plan con derecho, normalizado, es distinto del publicado → `409 plan_change_pending` (F8). El resto de la transacción no cambia: un fallo (`incomplete`, `publication_expired`) no escribe nada, la orden sigue `paid` y se puede reintentar sin cobrar (DP-25) |
| `paidPlan`, `entitledPlan` | El orden pasa de `price` a la herencia (F3). Con una sola orden pagada, el resultado es el mismo |
| `publicSite` / `draft.ts` | Usa `publishes()` en lugar de `can()`. El resultado es idéntico |

### `api.ts`

Sin rutas nuevas. Los errores nuevos (`feature_requires_plan`, `event_expired`, `plan_change_pending`) salen por `ApiError`, como los demás.

### Controles de autorización (resumen)

1. Todas las consultas siguen filtradas por el usuario de la sesión (`weddingOf` / `ensureWedding`). No se agregan rutas con id de casamiento (BR-38, RK-19).
2. Cada escritura de una operación de BR-62 pasa por `assertOperates`. Las lecturas no.
3. Ningún dato del cuerpo de la petición decide el permiso: ni `draft.planId`, ni `planId` en el checkout para habilitar operaciones.
4. Lo público depende solo de la copia publicada y de la vigencia.

## Interfaz (`src/`)

| Archivo | Cambio |
|---|---|
| `lib/weda/plans.ts` | `publishes()` (el `can()` de hoy, con nombre explícito); `operates(access, op)`; mapa de operaciones → plan; se elimina `upgradeOptions`. Se actualiza el comentario de cabecera: «lo no incluido se conserva y no se publica», en vez de «se oculta en el editor» |
| `lib/weda/payments.ts` | Se eliminan `upgradeAmount` y `upgradePaid`. `publishPaid` queda |
| `lib/weda/remote.ts` | Guarda `access` de `GET /api/wedding` y de la respuesta del guardado. `errorText` suma los tres códigos nuevos. Si el servidor rechaza con `feature_requires_plan`, la sincronización descarta los cambios de invitados pendientes y vuelve a la versión del servidor sin reintentar en bucle (ver Riesgos) |
| `lib/weda/site-model.tsx`, `publish.ts`, `logic.ts` (`publicPages`, `draftsFor`, tareas), `journey.ts` | `can()` → `publishes()` para lo publicado. Las etapas y tareas dejan de marcar como `locked` lo que solo se edita; las operaciones muestran «Se habilita al publicar con Celebración» |
| `components/panel/ui.tsx` | `Locked` se reemplaza por `OperationNotice`: un aviso que **no** tapa la sección, con «Se habilita al publicar con Celebración» y el botón «Ver qué incluye», que abre «Publicar». Se quita «Volver a probar todo» |
| `routes/panel.invitados.tsx` | La lista, los grupos y las mesas se ven siempre. Agregar, importar, editar, borrar, crear mesa y asignar quedan deshabilitados (`disabled` + `aria-describedby` al aviso) sin `operates(access, 'guests' | 'groups')`. Exportar a Excel sigue disponible (es lectura). Si no hay invitados y no hay operación, se muestran filas de ejemplo de solo lectura, marcadas «Ejemplo» (F7) |
| `routes/panel.sitio.tsx` | Sin `Locked`: todo se edita (F5). Las secciones que el plan elegido no publica muestran la etiqueta «Se publica con Celebración» |
| `routes/panel.regalos.tsx` | Sin `Locked`. Confirmar, rechazar y pedir comprobante quedan deshabilitados sin plan operativo o con el evento vencido |
| `routes/panel.tsx` | La navegación no muestra candados. En las preguntas frecuentes, la respuesta sobre cambiar de plan deja de prometer «pagás la diferencia» y pasa a: «Por ahora el plan no se puede cambiar después de publicar.» (texto a confirmar en la revisión) |
| `routes/panel.index.tsx` | Etiquetas «Desde el plan…» → «Se publica con Celebración» solo donde aplica |
| `components/panel/publish-dialog.tsx` | Se elimina el camino de mejora: `upgrading`, `startUpgrade`, el bloque «Mejorar tu plan» y los textos de diferencia. Con una publicación existente, «Tu publicación» muestra el plan sin opción de cambio. Si el checkout responde `plan_change_pending`, se muestra el texto correspondiente |
| `routes/panel.pago.tsx` | Sin cambios de flujo: con la orden `paid`, «Publicar mi página» ya permite reintentar. Si falla, el error se muestra y el botón sigue disponible (DP-25) |
| `routes/terminos.tsx` | Se quita «Podés pasar a un plan más completo pagando la diferencia». Queda «no se puede cambiar de plan después de contratar mientras no esté definida la regla», a confirmar en la revisión |
| `components/site/site-providers.tsx` (`LocalSite`) | `recordRsvp` y `recordGift` dejan de modificar el estado: la vista previa y la página local muestran el agradecimiento sin guardar nada (F6). Lo publicado (`PublishedSite`) no cambia |
| `components/plan-icons.ts`, `lib/weda/types.ts` | Sin cambios: `completo` sigue siendo un `PlanId` válido para leer datos históricos |
| `styles.css` / `panel.css` | Estilo de `OperationNotice` y de los botones deshabilitados con explicación. Se retiran `.pn-upgrade` y `.pn-locked` si quedan sin uso |

**Modo sin cuenta** (borrador solo en el navegador): no hay servidor ni plan operativo, así que el panel se comporta como `trial`. Ver y editar sí; operar no.

## Idempotencia y recuperación ante fallos

| Situación | Comportamiento |
|---|---|
| Doble clic o recarga en «Pagar» | `startCheckout` reusa la orden `pending` del mismo plan y monto (ya existe) |
| Notificación repetida del proveedor | `payment_events (provider, event_id)` la ignora (ya existe) |
| Notificación contradictoria después de cerrar | Se ignora; la orden no cambia (ya existe) |
| Pago confirmado y publicación fallida | La transacción de `publish` no escribe nada. La orden sigue `paid` con `paid_at` y su evento. `access` queda en `paid_unpublished`, así que no se opera. «Publicar mi página» (en `/panel/pago` o en el diálogo) se puede reintentar: `entitledPlan` usa la misma orden y no se crea otra. Volver a pagar responde `409 already_paid` |
| Publicar dos veces seguidas | La segunda actualiza la misma fila (versión + 1) sin cambiar `expires_at`, que ya existe |
| Guardado rechazado por plan | Todo o nada: no se escribe ni el borrador ni los invitados. El cliente recibe el código y no reintenta lo mismo |
| Conflicto de versión del borrador | Sin cambios (`409` por `baseRevision`) |

## Riesgos

- **R-1 · Pruebas que hoy operan invitados sin publicar.** `wedding-flow`, `auth-isolation`, `pending-changes`, `helpers.ts` del servidor y varios e2e (`desktop/journeys`, `mobile-journeys`, `panel-ui-phase`, `backend`, `audit`, `toast-long-names`, `explore/*`, `global-setup`) cargan invitados antes de publicar. Hay que reordenarlos (publicar Celebración primero) o esperar `403`. Es el trabajo más grande de la funcionalidad.
- **R-2 · Invitados guardados solo en el navegador** (de antes de crear la cuenta o de la vista previa vieja): al sincronizar, el servidor los rechaza. Mitigación: el cliente los conserva localmente y no los manda mientras no haya plan operativo, con un aviso. No se pierden; no se suben.
- **R-3 · Dos órdenes pendientes de planes distintos pagadas a la vez.** Con el adaptador de prueba no pasa. Con un proveedor real podrían quedar dos cobros. `entitledPlan` toma el plan más completo y la otra orden queda registrada para soporte (MV-21). La solución de fondo (vencer los cobros viejos en el proveedor) va con DP-15.
- **R-4 · Las mesas viven en el borrador.** Comparar `groups` entero rechaza cualquier cambio, incluido un reordenamiento. Es lo buscado.
- **R-5 · Supuestos S-1 y S-2**, a confirmar.

## Pruebas

| Criterio | Prueba |
|---|---|
| CA-1 | `landing-plans.test.tsx`, `weda-logic.test.ts` (planes): precios exactos y una sola fuente |
| CA-2 | **Nuevo** `src/test/server/plan-access.test.ts`: sin publicar, un borrador con contenido → 200; con `guests.upsert` → 403; con `groups` cambiado → 403. Más un caso en `auth-isolation.test.ts`: la pareja B no puede operar el casamiento de A ni con un plan propio (regla del área de servidor) |
| CA-3 | `plan-access`: publicar Regalos (pago de prueba) → invitados y mesas 403; confirmar un aporte 200; RSVP público 409 |
| CA-4 | `plan-access`: publicar Celebración → invitados, importación (`upsert` múltiple), mesas, asignaciones y RSVP 200 |
| CA-5 | `expiry.test.ts`: con la publicación vencida, operaciones → 410 `event_expired`; `GET /api/wedding` → 200 |
| CA-6 | `plan-access`: borrador con `planId: 'invitacion'` y sin orden pagada → las operaciones siguen en 403 |
| CA-7 | **Nuevo e2e**: enviar el formulario de confirmación en la vista previa y comprobar con `GET /api/wedding` que no hay invitados nuevos |
| CA-8 | e2e en celular (390 px) y compu: sin Celebración, Invitados y Mesas visibles con las acciones deshabilitadas y el aviso; con Celebración, habilitadas |
| CA-9 | `wedding-flow.test.ts`: la copia publicada de Regalos no tiene invitación ni RSVP; la de Celebración tiene los bloques activados |
| CA-10 | `payments-flow.test.ts`: el checkout cobra 95.000 o 140.000 |
| CA-11 | `payments-flow`: la orden guarda plan y monto; la publicación, el plan |
| CA-12 | `plan-access`: orden `completo` pagada sembrada + publicación `completo` → acceso Celebración; el monto y `expires_at` no cambian |
| CA-13 | `payments-flow`: con Regalos pagado, el checkout de Celebración → 409 `plan_change_pending` y la cantidad de órdenes no cambia. Volver a publicar con otro plan → 409. `payments.test.ts`: se quitan las pruebas de `upgradeOptions` y `upgradePaid`. Prueba de textos: ni la landing, ni el panel, ni los términos contienen «diferencia» como promesa |
| CA-14 | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` |
| CA-15 | `plan-access`: orden Celebración `paid` sin publicar → operaciones 403; `access.state` = `paid_unpublished` |
| CA-16 | `plan-access`: orden `paid` y publicación con nombres vacíos → 409 `incomplete`; operaciones 403; se completan los nombres, se publica de nuevo y sale; la cantidad de órdenes y de `payment_events` es la misma de antes; la orden sigue `paid` con el mismo `paid_at` |

Además: el recorrido real en el navegador (celular y compu) sin cuenta, con Regalos y con Celebración, como pide `CLAUDE.md`.

## Orden de construcción

1. `plans.ts` y `service.ts` (`access`, `assertOperates`, checkout y publicación) con `plan-access.test.ts` y los ajustes de pruebas del servidor.
2. `remote.ts` y la vista previa sin escrituras.
3. El panel (invitados, mesas, sitio, regalos, navegación, aviso), el diálogo de publicar, las preguntas frecuentes y los términos.
4. Los e2e reordenados y los nuevos; el recorrido en el navegador.
5. Converger: marcar cada criterio con su evidencia en la spec y actualizar la documentación.

## Documentación a actualizar al cerrar

- `02-business-rules-catalog.md`: BR-14 y BR-62 pasan a IMPLEMENTADO. BR-15 sigue PENDIENTE con el bloqueo implementado.
- `01-feature-inventory.md`: ONB-02, PAY-02, PAY-03, DASH-03 y GST-01…GST-03.
- `03-open-decisions-and-risks.md`: IC-25, IC-26 e IC-27 pasan a resueltas.
- `ux-flows.md` (sección nueva con fecha), `panel-frontend.md` §5 y `design-system.md` (`OperationNotice`, se retiran `.pn-locked` y `.pn-upgrade`).
