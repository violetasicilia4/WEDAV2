# PAY-07 · Trial de 14 días, contratar y publicar en un solo momento, permanencia indefinida — spec

- **Estado:** aprobada (2026-11-04, la dueña, junto con el plan). En construcción.
- **Tamaño:** crítica (dinero, estados, permisos y esquema).
- **Plan:** [plan.md](plan.md)
- **Origen:** pedido de la dueña del 2026-11-04 («modelo comercial vigente») y decisiones D-06 (anexo 03 §4).

## Problema
Hoy Weda no tiene un período de prueba con plazo, pagar y publicar son dos acciones separadas y la página publicada vence a los 12 meses. El modelo comercial vigente es otro:
- La pareja tiene 14 días para construir gratis.
- Si no contrata, el proyecto se pausa sin perder nada.
- Al contratar se publica en el mismo momento.
- Lo publicado queda activo y editable indefinidamente.

## Reglas y decisiones que aplica

| ID | Dónde está | Estado | Qué toma de ahí |
|---|---|---|---|
| D-06 | `docs/product-blueprint/03-open-decisions-and-risks.md` §4 | DECIDIDO (2026-11-04) | Modelo comercial vigente y decisiones sobre datos existentes, BR-45, nombre y correos |
| BR-63 | `docs/product-blueprint/02-business-rules-catalog.md` | DECIDIDO | Trial de 14 días desde la creación de la celebración |
| BR-64 | Catálogo | DECIDIDO | Pausa al vencer el trial sin contratar |
| BR-65 | Catálogo | DECIDIDO | Permanencia indefinida después de publicar |
| BR-01 | Catálogo | DECIDIDO | Contratar, pagar y publicar son un único momento |
| BR-02 | Catálogo | DECIDIDO | No se publica sin pago confirmado (salvo en pruebas) |
| BR-13 | Catálogo | DECIDIDO | Planes y precios |
| BR-14, BR-62 | Catálogo | DECIDIDO, implementadas (PAY-01) | Qué se publica y qué se opera según el plan |
| BR-15 / DP-23 | Catálogo / anexo 03 | PENDIENTE (bloqueado, D-05) | No hay cambio de plan ni cobro de diferencias |
| BR-17 | Catálogo | DOCUMENTADO | El monto lo pone el servidor |
| BR-38 | Catálogo | DECIDIDO | Permisos en el servidor; nada entre parejas |
| PUB-02 | Inventario | Implementada | URL estable `/sitio/{slug}` |
| PAY-01 | `specs/PAY-01-plan-alcance/` | Cerrada en `main` | `Access`, `assertOperates`, vista previa sin escrituras. El estado `expired` y su CA-5 quedan reemplazados por esta spec |

## Estados y transiciones (los calcula el servidor; nunca el navegador)

```
(registro) ── crear la celebración ──▶ trial (14 días)
trial ── pasan 14 días sin contratar ──▶ paused
trial | paused ── pago confirmado ──▶ (publicación automática) ──▶ active
                                     └─ si la publicación falla ──▶ paid_unpublished ── reintento sin cobrar ──▶ active
active ── (sin transición por tiempo) ──▶ active
```

| Estado | Editar contenido | Operar (BR-62) | Publicar | Página pública |
|---|---|---|---|---|
| `trial` | Sí | No | Al contratar | No |
| `paused` | **No**, solo lectura | No | Solo contratando | No |
| `paid_unpublished` | Sí | No (DP-25) | Reintento sin cobro | No |
| `active` | Sí, indefinidamente | Según el plan | «Publicar los cambios» | Sí, indefinidamente |

- `paid_unpublished` es un estado técnico de recuperación. La interfaz lo presenta como «tu pago está confirmado, publicá tu página», no como una etapa comercial.
- Bajar la página (PUB-01) sigue existiendo. No cambia el estado `active`.

## Decisiones de la funcionalidad
- **F1 · Inicio del trial.** Es el primer guardado en el servidor de una celebración con `onboarded` y los dos nombres. Se guarda en `weddings.trial_started_at` y no se modifica nunca más.
- **F2 · Reloj.** Fecha y hora del servidor (UTC). Al cumplirse 14 × 24 h desde el inicio, el estado pasa a `paused`.
- **F3 · Datos existentes (D-06).**
  - Las celebraciones sin publicar toman como inicio del trial su fecha de creación.
  - Las publicaciones existentes no vencen, y `expires_at` deja de leerse (se conserva como historia).
- **F4 · Publicación automática.** Al confirmarse el pago, el servidor publica con el plan pagado, en otra transacción. Si falla, la orden queda pagada y el reintento no cobra.
- **F5 · Pausa.** Se rechazan guardar el borrador, cambiar el destino de cobro y publicar sin pago (`403 trial_ended`). Las lecturas siguen permitidas, y contratar está permitido.
- **F6 · Textos.**
  - Landing: «14 días para crear gratis, sin tarjeta».
  - Planes: «Pago único · sin renovaciones», y «Recomendado» en Celebración, en lugar de «Más elegido».
  - Sin fechas de vencimiento en ningún lugar.

## Criterios de aceptación

| # | Criterio | Regla | Cómo se verifica |
|---|---|---|---|
| CA-1 | El registro pide correo y clave, sin tarjeta, y no inicia el trial | BR-63 | `trial-lifecycle.test.ts` |
| CA-2 | Crear la celebración inicia el trial y guarda la fecha en el servidor | BR-63, F1 | `trial-lifecycle` |
| CA-3 | Dura exactamente 14 días: a los 13 d 23 h 59 m sigue en `trial`, a los 14 d pasa a `paused` | BR-63, F2 | `trial-lifecycle` (`vi.setSystemTime`) |
| CA-4 | No se reinicia por login, otro dispositivo, editar, cambiar la fecha de la boda ni volver a guardar el onboarding | BR-63 | `trial-lifecycle` |
| CA-5 | Durante el trial se edita todo, sin operar invitados ni mesas | BR-63, BR-62 | `trial-lifecycle`, `plan-access` |
| CA-6 | La vista previa no escribe | BR-62 | E2E de CA-7 de PAY-01 (sigue) |
| CA-7 | En pausa: guardar, cambiar el destino de cobro y publicar sin pago → `403 trial_ended` | BR-64, F5 | `trial-lifecycle` |
| CA-8 | En pausa los datos siguen intactos y el panel se lee (`GET /api/wedding` 200) | BR-64 | `trial-lifecycle` |
| CA-9 | No se elimina nada automáticamente | BR-64, BR-45 suspendida | `trial-lifecycle` (los datos siguen a los 15 meses de pausa) |
| CA-10 | Elegir Regalos o Celebración inicia el checkout con 95.000 o 140.000, también en pausa | BR-13 | `trial-lifecycle`, `payments-flow` |
| CA-11 | La confirmación del pago la valida el servidor; el navegador no puede marcar pagado | BR-02, BR-17 | `payments-flow` (sigue) |
| CA-12 | Con el pago confirmado se publica en el mismo momento con el plan pagado; la URL queda disponible | BR-01, F4 | `trial-lifecycle`, `payments-flow` |
| CA-13 | La URL no cambia al editar, publicar cambios, bajar y volver a publicar | PUB-02 | `trial-lifecycle` |
| CA-14 | Si la publicación falla después del pago: no se opera, se reintenta sin un segundo cobro y la orden se conserva | F4, DP-25 | `trial-lifecycle` |
| CA-15 | No hay doble cobro ni órdenes duplicadas | BR-17 | `payments-flow` (sigue) |
| CA-16 | Publicado, sigue público, editable y operable a los 6, 12 y 15 meses (RSVP, aportes, invitados y mesas) | BR-65 | `trial-lifecycle`, `expiry.test.ts` reescrita |
| CA-17 | Regalos habilita solo lo suyo y Celebración todo; la API rechaza el resto; nada entre parejas | BR-62, BR-38 | `plan-access`, `auth-isolation` |
| CA-18 | Landing, diálogo de publicar, panel y términos muestran los mismos planes y precios, sin vencimiento | BR-13, BR-65 | `landing-plans.test.tsx` y búsqueda de textos |
| CA-19 | Los estados que ve el panel (banner del trial y de la pausa) salen del servidor | F2 | E2E y recorrido |
| CA-20 | La migración 8 conserva todas las filas y fija el inicio del trial de las celebraciones existentes | F3 | `migration-8.test.ts` |
| CA-21 | Las órdenes históricas (incluida `completo`) conservan plan y monto | BR-16 | `plan-access` (sigue) |
| CA-22 | Pasan `typecheck`, `lint`, `npm test` y `build` | — | Ejecución |

## Fuera de alcance
- Nombre de la persona en el registro (DP-29).
- Secuencia de correos del trial y su programador de envíos (DP-30).
- Política de retención de proyectos pausados (DP-31). Hoy no se borra nada.
- Proveedor de pagos real (DP-15).
- Cambio de plan (DP-23).
- Multiusuario (D-03).
- GIFT-09.

## Preguntas abiertas
| ID | Pregunta | ¿Bloquea? |
|---|---|---|
| DP-29 | ¿Se pide el nombre de la persona al registrarse? | No |
| DP-30 | Correos del trial (inicio, mitad, vencimiento, checkout abandonado) y WhatsApp con consentimiento | No |
| DP-31 | ¿Cuánto se conserva un proyecto pausado y con qué aviso? Mientras no se decida, no se borra nada | No |

## Revisión de consistencia (antes de construir)
- [x] Los IDs citados existen o se crean en el mismo cambio (BR-63, BR-64, BR-65, D-06, DP-29 a DP-31).
- [x] Ningún criterio contradice una regla decidida. Las reglas de vigencia quedan reemplazadas (D-06).
- [x] Lo pendiente no bloquea.
- [x] La spec y el plan están aprobados (2026-11-04).

## Verificación al cerrar
| Criterio | Evidencia |
|---|---|
| CA-1 | `trial-lifecycle` › «registrarse (sin tarjeta) no inicia el trial…» |
| CA-2 | `trial-lifecycle` (CA-1/CA-2) y recorrido en el navegador: al crear la celebración, `trialEndsAt` queda a 14 días |
| CA-3, CA-4 | `trial-lifecycle` › «dura exactamente 14 días y no se reinicia…» |
| CA-5 | `trial-lifecycle` › «durante el trial se edita todo…», `plan-access` (CA-2 de PAY-01) |
| CA-6 | E2E `desktop/journeys` › «la confirmación enviada desde la vista previa no crea invitados»; exploratoria `action-fuzz` (vista previa sin escrituras) |
| CA-7, CA-8, CA-9 | `trial-lifecycle` › «en pausa: guardar, cambiar el cobro y publicar → 403…» (incluye 15 meses en pausa sin pérdidas) |
| CA-10, CA-12, CA-13 | `trial-lifecycle` › «con el trial vencido se contrata Celebración…» y «Regalos cobra 95.000…» |
| CA-11, CA-15 | `payments-flow`, `trial-lifecycle` › «un evento de pago repetido no vuelve a publicar ni cobra» |
| CA-14 | `trial-lifecycle` › «si la publicación automática falla…»; `plan-access` CA-15/CA-16 |
| CA-16 | `expiry.test.ts` (6, 12 y 15 meses), `plan-access` CA-5 reescrito |
| CA-17 | `plan-access`, `auth-isolation`, exploratoria `action-fuzz` (5 recorridos contratados y 5 sin contratar por proyecto) |
| CA-18 | `landing-plans.test.tsx`; E2E `landing-mobile` y `panel-ui-phase`; recorrido en el navegador (landing, diálogo) |
| CA-19 | E2E `desktop/journeys` › «Trial de 14 días y pausa» (la pausa se simula con la respuesta del servidor); recorrido (banner en celular y compu) |
| CA-20 | `migration-8.test.ts` |
| CA-21 | `plan-access` CA-12, `migration-8` |
| CA-22 | `typecheck`, `lint` (0 errores), `npm test` (258) y `build`: pasan (2026-11-04) |

**E2E del 2026-11-04** (servidor propio, Chrome local): 151 pasan, 1 falla y 1 se saltea.
- Falla `mobile-journeys` › «Flujo 2», que ya fallaba desde GIFT-14 por esperar el diálogo de cobro sin cuenta. No es de PAY-07.
- Se saltea `payments.spec`, que necesita un servidor con `WEDA_PAYMENTS_PROVIDER=test` (`WEDA_PAY_URL`). La publicación al confirmarse el pago la cubren las pruebas de servidor, **no** un E2E.

**Exploratorias** (semilla 2026, celular y compu): `state-matrix` y `action-fuzz` pasan con 0 fallas de producto. En compu hubo 4 errores de la prueba al no encontrar el formulario de confirmación dentro de la vista previa, la limitación ya conocida.

**No verificado:**
- La pausa en el navegador con un servidor real: no se puede mover el reloj del servidor ni abrir la base local, así que se probó con pruebas de servidor y un E2E que simula la respuesta.
- La migración 8 sobre la base local `.data/` real. Corre sola al abrirla y la prueba `migration-8` la cubre con datos sembrados.
