# PAY-01 · Plan: alcance de publicación y de operación — spec

- **Estado:** aprobada (2026-11-03, la dueña), con las decisiones F1, F5 y F8 definidas por ella (DP-25, DP-28 y la opción transitoria de DP-23). Construida y verificada el 2026-11-04 en `docs/planes-y-roadmap`, sin commit: espera la revisión de la dueña para cerrarse.
- **Tamaño:** crítica (dinero y permisos). La spec se aprobó antes que el plan.
- **Plan:** [plan.md](plan.md) (aprobado 2026-11-03).
- **Origen:** decisiones de la dueña del 2026-11-03 (D-01, D-02) en la sesión de coordinación del roadmap. Diagnóstico de solo lectura del mismo día, sobre `origin/main` en `0d2fb4d`.

## Problema
Los dos planes ya existen en el código, pero el plan no define lo que la dueña decidió. Hoy la pareja **opera** invitados y mesas sin contratar nada. Con Regalos, en cambio, el panel **oculta** secciones que se tendrían que poder ver. El servidor no rechaza ninguna operación por plan ni por vigencia, y la vista previa crea invitados reales. Además, el cambio de Regalos a Celebración se cobra y se promete con una regla que no está aprobada. Se busca que el plan defina **qué se publica y qué se opera**, que ver y editar contenido sean libres, y que el servidor lo haga cumplir.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| D-01 | `docs/product-blueprint/03-open-decisions-and-risks.md` §4 | DECIDIDO (2026-11-03) | Dos planes, precios, el plan se elige al publicar |
| D-02 | Mismo anexo §4 | DECIDIDO (2026-11-03) | El plan define publicación y operación; el servidor lo aplica; la vista previa no escribe |
| BR-13 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO, implementada | Planes y precios |
| BR-14 | Catálogo | DECIDIDO, CONTRADICE en el panel | Qué publica cada plan; lo no publicado se conserva |
| BR-62 | Catálogo | DECIDIDO, no implementada | Ver / editar contenido / operar, según plan contratado y vigencia |
| BR-15 | Catálogo | **PENDIENTE** (DP-23) | Nada: el cambio de plan no tiene regla |
| BR-16 | Catálogo | DECIDIDO (Q5) | Los cambios de precio no son retroactivos |
| BR-17 | Catálogo | DOCUMENTADO, implementada | El monto lo calcula el servidor |
| BR-38 | Catálogo | DECIDIDO, implementada | Permisos verificados en el servidor; nada entre eventos |
| BR-04 | Catálogo | DECIDIDO, parcial | Qué no mueve la vigencia |
| ONB-02, PAY-01, PAY-02, PAY-03, PAY-04, DASH-03, GST-01…GST-05, PUB-01…PUB-05 | `docs/product-blueprint/01-feature-inventory.md` | Ver inventario | Las funcionalidades afectadas |
| IC-25, IC-26, IC-27, IC-16 | Anexo 03 | Abiertas | Lo que esta spec corrige o tiene que tener en cuenta |
| D-03 | Anexo 03 §4 | DECIDIDO | Multiusuario fuera de alcance; un evento por usuario |

## Decisiones de la funcionalidad
Aprobadas por la dueña con la spec (2026-11-03). F1, F5 y F8 son decisiones suyas; el resto, criterios de implementación sobre reglas ya decididas.

- **F1 · Plan operativo (DP-25, decidida por la dueña el 2026-11-03).** Una orden pagada **no** habilita las operaciones por sí sola. Las operaciones se habilitan solo cuando: (1) el pago está confirmado, (2) la publicación se completó y (3) el evento quedó asociado al plan contratado y publicado. Si el pago se confirma y la publicación falla, no se habilita nada; se puede reintentar la publicación **sin un segundo cobro**, y la orden conserva su estado y su trazabilidad. Lo calcula el servidor; el plan del borrador nunca cuenta.
- **F2 · Vigente.** La publicación no venció (`expires_at`, o el cálculo actual cuando falta: ver IC-16). Sin publicación no hay plan operativo (F1).
- **F3 · El orden entre planes sale de la herencia** (`inherits`), no del precio.
- **F4 · Rechazos del servidor.**
  - `403 feature_requires_plan`, con la función pedida y el plan que la incluye, cuando falta el plan.
  - `410 event_expired` cuando el plan venció.
  - Se comprueban en `service.ts` antes de escribir. Las mesas viven en `draft.groups`, así que se rechaza un borrador cuyo `groups` cambió respecto del guardado.
- **F5 · Contenido libre (DP-28, decidida por la dueña el 2026-11-03).** La pareja construye y edita todo el contenido del micrositio antes de contratar Celebración. El plan define qué se publica y qué se opera, no qué se construye. Invitados y mesas se ven antes de contratar, pero no se pueden agregar invitados, crear mesas ni ejecutar operaciones.
- **F6 · Vista previa sin escrituras.** El formulario de confirmación y el de regalos de la vista previa muestran el resultado sin modificar el estado ni sincronizar nada.
- **F7 · Panel.** Invitados y mesas se ven siempre. Sin Celebración vigente, sus acciones aparecen deshabilitadas con el texto «Se habilita al publicar con Celebración» y un enlace a «Publicar». Si no hay invitados, se muestran filas de ejemplo de solo lectura, marcadas como ejemplo. La redacción final se ajusta en el recorrido.
- **F8 · Cambio de plan bloqueado mientras DP-23 siga pendiente (decidido por la dueña el 2026-11-03).** No se puede pasar de Regalos a Celebración después de contratar. Se quita de la interfaz y de la documentación toda promesa de «pagar la diferencia». No hay mejoras ni cobros adicionales. El servidor responde `409 plan_change_pending` al checkout o la publicación de un plan distinto del ya contratado.

## Criterios de aceptación

| # | Criterio | Regla o decisión | Cómo se verifica |
|---|---|---|---|
| CA-1 | Los precios son exactamente Regalos 95.000 y Celebración 140.000, y la landing, el diálogo, los términos y el panel los toman de `plans.ts` | BR-13 | Prueba `landing-plans` y `weda-logic` (planes) |
| CA-2 | Sin contratar: guardar contenido del sitio y de la lista → 200; altas, bajas o asignaciones de invitados → 403; borrador con `groups` cambiado → 403 | BR-62, F4, F5 | Prueba de servidor nueva (permisos por plan) y `auth-isolation` |
| CA-3 | Con Regalos pagado: invitados y mesas → 403; confirmar o rechazar un aporte → 200; RSVP público → 409 `rsvp_disabled` | BR-62, BR-14 | Prueba de servidor (permisos por plan, `wedding-flow`) |
| CA-4 | Con Celebración pagado: invitados, importación, mesas, asignaciones y RSVP → 200 | BR-62 | Prueba de servidor |
| CA-5 | Con la publicación vencida: las operaciones de BR-62 → 410 `event_expired`; leer el panel → 200 | BR-62, F2, DP-24 | Prueba de servidor (`expiry`) |
| CA-6 | Las mismas llamadas hechas directo a la API, con la cookie de la pareja, dan los mismos rechazos; nada depende del `planId` del borrador | BR-38, F1 | Prueba de servidor que manda `planId: 'invitacion'` en el borrador sin orden pagada |
| CA-15 | Orden de Celebración pagada y sin publicar: las operaciones de invitados y mesas → 403 | F1 (DP-25) | Prueba de servidor |
| CA-16 | Pago confirmado y publicación fallida (por ejemplo, faltan los nombres): sigue sin operar; al reintentar, la publicación sale con el mismo pago, sin una orden nueva, y la orden sigue `paid` con su `paid_at` y su evento de pago | F1 (DP-25) | Prueba de servidor: cuenta de órdenes y `payment_events` antes y después |
| CA-7 | Un envío del formulario de confirmación desde la vista previa no crea ni cambia invitados | F6 | E2E: envío en la vista previa y consulta `GET /api/wedding` |
| CA-8 | Sin Celebración, el panel muestra Invitados y Mesas con las acciones deshabilitadas y la explicación; con Celebración, habilitadas | BR-62, F7 | E2E en celular y compu |
| CA-9 | La publicación Regalos muestra solo la lista; la publicación Celebración muestra la lista y todos los bloques activados | BR-14 | Prueba `wedding-flow` y recorrido |
| CA-10 | El primer checkout cobra 95.000 o 140.000 según el plan; el monto lo fija el servidor | BR-13, BR-17 | Prueba `payments-flow` |
| CA-11 | La orden guarda plan y monto; la publicación, el plan con el que se publicó | DP-26 (mínimo) | Prueba `payments-flow`; lo demás según DP-26 |
| CA-12 | Una orden histórica `completo` pagada habilita Celebración; su monto y su `expires_at` no cambian | BR-16, D-01 | Prueba de servidor con una orden y una publicación sembradas |
| CA-13 | Con un plan pagado, el checkout de otro plan → 409 `plan_change_pending` y no crea orden; volver a publicar con otro plan → 409 `plan_change_pending`; ningún texto de la interfaz ni de la documentación vigente promete «pagar la diferencia» | F8, BR-15, DP-23 | Prueba `payments-flow`; prueba de textos (`landing-plans`, panel, términos); búsqueda en `docs/` |
| CA-14 | Pasan `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` | — | Ejecución |

## Fuera de alcance
- Multiusuario, membresías y varios eventos por cuenta (D-03).
- Proveedor de pagos real y «pagar = activar + publicar» (DP-15, PAY-07).
- La regla del cambio de plan (DP-23): solo se bloquea (F8).
- Cambios de esquema: completar los `expires_at` faltantes (IC-16), el historial de publicaciones (DP-26) y la limpieza del id `completo`. Cada uno necesita su propia aprobación.
- El envío de agradecimientos (DP-27) y los textos que prometen cosas que no existen («tarjeta», «Spotify», «tus invitados suman las canciones», «Instagram»): van en un cambio chico aparte.

## Preguntas abiertas
| ID | Pregunta | ¿Bloquea? |
|---|---|---|
| DP-23 | Regla del cambio de Regalos a Celebración | No: se bloquea (F8) |
| DP-24 | Qué se permite con el evento vencido, además de bloquear las operaciones | No: CA-5 solo bloquea las operaciones de BR-62 |
| DP-26 | Cómo se registra la modalidad publicada | No: CA-11 cubre el mínimo sin esquema |
| IC-28 | Inicio de la vigencia (DA-2 vs. BR-03/BR-04) | No: se usa lo que hoy calcula el servidor |

## Revisión de consistencia (antes de construir)
- [x] Todos los IDs citados existen y su estado es el indicado (revisado el 2026-11-03).
- [x] Ningún criterio contradice una regla decidida. BR-15 queda pendiente y CA-13 depende de F8.
- [x] Lo pendiente que bloqueaba (DP-25, DP-28) lo resolvió la dueña (2026-11-03).
- [x] La spec está aprobada (2026-11-03).
- [x] El plan está aprobado (2026-11-03).

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 | `landing-plans.test.tsx`, `weda-logic.test.ts` y `plan-access` (CA-10): 95.000 y 140.000 desde `plans.ts` |
| CA-2 | `plan-access.test.ts` › «sin publicar: el contenido se guarda; invitados y mesas → 403» |
| CA-3 | `plan-access` › «Regalos publicado…» |
| CA-4 | `plan-access` › «Celebración publicado…» |
| CA-5 | `plan-access` › «publicación vencida…» |
| CA-6 | `plan-access` (CA-2, borrador con `planId: 'invitacion'`) y `auth-isolation` › «el plan de una pareja nunca habilita operar el casamiento de otra» |
| CA-7 | E2E `desktop/journeys` › «la confirmación enviada desde la vista previa no crea invitados» (pasa, 2026-11-04) |
| CA-8 | E2E `desktop/journeys` › «estado vacío de invitados…» (compu) y recorrido en el navegador (2026-11-04): a 375 px y en compu, sin Celebración, aviso, botones deshabilitados y filas «Ejemplo»; tras publicar Celebración, botones habilitados y el invitado se guarda en el servidor |
| CA-9 | `wedding-flow.test.ts` (copia publicada) y `plan-access` (Regalos sin RSVP) |
| CA-10 | `plan-access` › «el primer checkout cobra el precio del plan»; `payments-flow` |
| CA-11 | `payments-flow` (orden con plan y monto) y `plan-access` (publicación con su plan) |
| CA-12 | `plan-access` › «orden histórica de Celebración Plus…» |
| CA-13 | `payments-flow` › «con un plan pagado no hay cambio de plan…»; `plan-access` › «F8…»; textos: sin «diferencia» en `panel.tsx`, `terminos.tsx` y `publish-dialog.tsx` |
| CA-14 | `npm run typecheck`, `npm run lint` (0 errores), `npm test` (251 pruebas) y `npm run build`: pasan (2026-11-04) |
| CA-15 | `plan-access` › «Celebración pagada y sin publicar…» |
| CA-16 | `plan-access` › «pago confirmado y publicación fallida…» |

**E2E del 2026-11-04** (`npx playwright test`, Chrome local): 146 pasan y 5 fallan en la corrida completa. Tres eran de este cambio o de la estructura de dos planes y se corrigieron: un `beforeEach` que publicaba de más, y dos pruebas que todavía buscaban «Celebración Plus». Al reejecutar esas pruebas y las de invitados, mesas y vista previa, pasan las 11. Las otras dos fallas no son de PAY-01:
- `mobile-journeys` › «Flujo 2»: espera el diálogo de cobro **sin** cuenta («Listo»), pero desde GIFT-14 con cuenta se pide la clave.
- `desktop/journeys` › «a mitad del alta»: venció el tiempo de espera en `page.goto` y pasó al reejecutarla.

Las pruebas exploratorias (`npm run test:explore`, `action-fuzz`) **no** se ejecutaron. Agregan invitados y mesas sin publicar y probablemente necesiten `publishCelebration`.
