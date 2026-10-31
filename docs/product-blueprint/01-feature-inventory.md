# Weda · Inventario de funcionalidades (anexo 01)

Anexo del [Product Blueprint](00-product-blueprint.md). Fecha de la auditoría: 2026-10-31. Complementos: [reglas de negocio](02-business-rules-catalog.md) · [decisiones y riesgos](03-open-decisions-and-risks.md) · [preparación comercial](04-mvp-readiness.md) · [roadmap](05-implementation-roadmap.md).

## 0. Cómo leer este inventario

**Evidencia usada.** Se leyó el código (`src/server/`, `src/lib/weda/`, `src/routes/`, `src/components/`, `src/test/`, `e2e/`) y la documentación. El 2026-10-31 se ejecutaron:

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | **0 errores** |
| `npx vitest run` | **18 archivos, 195 pruebas, todas pasan** (10 archivos de interfaz y lógica: 127 pruebas; 8 archivos de servidor sobre una base SQLite real temporal: 68) |
| Pruebas E2E de navegador (`e2e/`, Playwright) | **No se ejecutaron en esta auditoría** (requieren Chromium y un servidor, y crearían cuentas). Existen ~105 pruebas escritas. Su resultado es **NO VERIFICADO** hoy; los documentos antiguos citan corridas de octubre |
| Pruebas con personas, carga, base corrupta, proveedor de pagos o correo reales | **No existen / no se hicieron** |

**Estados de código.** *Implementada y probada* (existe y una prueba automática que pasó hoy ejerce el comportamiento) · *Implementada parcialmente* · *Implementada sin pruebas suficientes* · *Diseñada, no implementada* (hay decisión o diseño, no hay código) · *No diseñada* · *No verificada*.

**Estado documental.** DECIDIDO · DOCUMENTADO (figura en documentos, sin aprobación confirmada) · PENDIENTE (falta una decisión). Una **entidad** del modelo conceptual no es una funcionalidad: las 86 entidades de `docs/data-architecture/` son diseño; la base real tiene 16 tablas.

**Tests.** «U» = prueba unitaria o de integración que pasó hoy (archivo entre paréntesis); «E2E» = existe una prueba de navegador que no se ejecutó hoy; «—» = sin prueba.

---

## 1. Landing y adquisición (LAN)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| LAN-01 | Landing comercial con hero, funciones, planes con precio y CTA a `/crear/cuenta` | DOCUMENTADO (`ux-flows` §1) | **Implementada** (`src/routes/index.tsx`, `landing-plans.tsx`) | U (`landing-plans`: 4) · E2E | Muestra «Pago único · Publicada **6 meses**» (`PUBLICATION_TERM`): contradice la vigencia decidida de 12 meses (IC-02) |
| LAN-02 | Testimonios (4) o «Por qué Weda» si la lista queda vacía | DECIDIDO por la dueña (2026-10-29) | **Implementada** (`src/lib/testimonials.ts`) | U (landing) | La dueña responde por su autenticidad; `PRODUCT.md` los llama ficticios y el hallazgo F-10 sigue «pendiente» (IC-19) |
| LAN-03 | Sitio de ejemplo `/ejemplo`, `/ejemplo/regalos` | DOCUMENTADO | **Implementada** (datos de muestra) | U (`demo-lib`) | Pareja ficticia; es un ejemplo, no un evento real |
| LAN-04 | Buscador de invitaciones por enlace `/encontrar` | DOCUMENTADO (F-04) | **Implementada** | E2E | Pide pegar el enlace; no hay directorio público (decisión de privacidad pendiente) |
| LAN-05 | SEO: canonical, Open Graph, sitemap con `VITE_SITE_URL`; invitaciones `noindex` | DOCUMENTADO | **Implementada** | U (`site-seo`: 4) | Indexar invitaciones: decisión pendiente |
| LAN-06 | Analítica del navegador (8 eventos) | DECIDIDO: apagada hasta política y consentimiento (P14) | **Implementada y apagada** por defecto (`VITE_ANALYTICS=on` la enciende) | U parcial (`funnel`) | Coherente con la decisión |
| LAN-07 | Páginas legales `/terminos`, `/privacidad` | DOCUMENTADO como **borrador sin revisión legal** | **Implementada como borrador** | — | Marcadas «a completar»; dicen «6 meses» y retención «mientras la cuenta esté activa» (IC-14) |

## 2. Registro, ingreso y cuenta (AUTH)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| AUTH-01 | Registro e ingreso con correo y clave | DECIDIDO | **Implementada y probada** (`service.ts`, scrypt, cookie `HttpOnly`, sesión 30 días) | U (`auth-isolation`: 11, `hardening`) | Límite de 8 intentos por correo+IP en memoria |
| AUTH-02 | Recuperar la clave por correo (token de un uso, 1 hora, cierra sesiones) | DOCUMENTADO | **Implementada y probada** | U (`password-reset`: 5) | El correo real (Resend) **nunca se probó**: sin él, quien olvida la clave no entra |
| AUTH-03 | Ingreso con Google | DECIDIDO agregar (Apple descartado) | **No implementada**: el botón muestra «todavía no está habilitado» | E2E (`account-flow`) | No hay OAuth |
| AUTH-04 | Verificación del correo al registrarse | DOCUMENTADO como pendiente | **No implementada** | — | `users` no tiene marca de verificación |
| AUTH-05 | Cambiar el correo; cambiar la clave desde el perfil | DOCUMENTADO como pendiente | **Parcial**: la clave se cambia pidiendo un enlace por correo; el correo no se puede cambiar | U (reset) | `/panel/perfil` solo muestra el correo |
| AUTH-06 | Cierre de sesión; lista o cierre remoto de sesiones | — | **Parcial**: cierra la sesión actual; no hay lista ni cierre remoto | U (`auth-isolation`) | |
| AUTH-07 | Segundo factor (MFA) | DECIDIDO obligatorio para personal y ofrecido al propietario (P5 abierta) | **No implementada** | — | Depende de P5 |

## 3. Onboarding (ONB)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| ONB-01 | Alta en pasos: cuenta → nombres → fecha (opcional) → foto (opcional) → panel | DOCUMENTADO | **Implementada** (`crear.*`) | U (`weda-logic` onboarding) · E2E | El plan ya no se elige acá: se elige al publicar |
| ONB-02 | Prueba gratuita: todo habilitado sin plan | DOCUMENTADO | **Implementada** (`can(null, …)` es verdadero) | U (planes) | |
| ONB-03 | Banner «Primeros pasos» y progreso por etapas | DOCUMENTADO | **Implementada** (`journey.ts`) | U (`weda-logic` journey) | |
| ONB-04 | Panel sin cuenta (borrador local) | DOCUMENTADO | **Implementada**: sin cuenta se guarda en `localStorage`; publicar exige cuenta | U (`store-performance`, `app-routing`) | Alineado con lo auditado (F-02) |

## 4. Contratación, planes y pago (PAY)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| PAY-01 | Tres planes acumulativos con precios en ARS: Regalos 95.000 · Celebración 140.000 · Celebración Plus 150.000 | DECIDIDO como valores de referencia (autora; «pago único» 2026-10-21) | **Implementada** (`plans.ts`) | U (`weda-logic` planes, `landing-plans`) | `PRODUCT.md` cita otros precios (180.000/320.000) y `ux-flows` §3 dice «no se afirma pago único» (IC-11) |
| PAY-02 | Funciones restringidas por plan | DECIDIDO | **Implementada** (`can()`; lo no incluido se oculta, no se borra) | U | |
| PAY-03 | Mejora de plan pagando la diferencia; sin bajar de plan | DOCUMENTADO | **Implementada** | U (`payments-flow`, `payments`) | |
| PAY-04 | Orden de compra con monto calculado por el servidor, reusada ante doble clic | DOCUMENTADO | **Implementada** (`startCheckout`) | U (`payments-flow`) | |
| PAY-05 | Notificaciones del proveedor firmadas e idempotentes | DOCUMENTADO | **Implementada solo con el adaptador de PRUEBA** | U | **No existe un proveedor real**; el webhook general responde 501 |
| PAY-06 | Cobro real (Mercado Pago u otro) | PENDIENTE (proveedor, impuestos, facturación) | **No implementada** | — | Sin esto, publicar es gratis salvo que se active `WEDA_REQUIRE_PAID_ORDER` (IC-17) |
| PAY-07 | **Pagar = activar + publicar automáticamente** | **DECIDIDO** (2026-10-31) | **No implementada**: el pago solo habilita el botón «Publicar mi página» | U demuestra el flujo actual separado (`payments-flow`) | IC-01 |
| PAY-08 | Aceptación expresa de las 6 condiciones de vigencia antes de contratar (P33) | **DECIDIDO** como requisito; redacción de las cláusulas 1 y 2 pendiente de aprobación | **No implementada** | — | El alta solo menciona «Términos de uso» en general |
| PAY-09 | Cancelación y reembolso de un plan | **PENDIENTE** (P26) | **No implementada** (la orden tiene estado `cancelled`, que es abandono del pago, no un reembolso) | — | No hay política |
| PAY-10 | Facturación / comprobante de compra de Weda | **PENDIENTE** (P6) | **No implementada** | — | `Invoice` está solo en el modelo conceptual |
| PAY-11 | Planes en USD | PENDIENTE (P4) | **No implementada** | — | `CURRENCY = 'ARS'` fijo |

## 5. Panel de la pareja: inicio y cuenta (DASH)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| DASH-01 | Inicio con etapas, siguiente paso y estado de publicación | DOCUMENTADO | **Implementada** | U (journey) · E2E | |
| DASH-02 | Ayuda con preguntas frecuentes y contacto | DOCUMENTADO (respuestas de la dueña) | **Implementada** (`panel.tsx`) | — | El FAQ habla de «6 meses» y de ver el comprobante |
| DASH-03 | Vista previa privada de la invitación (celular/compu) | DOCUMENTADO | **Implementada** | E2E | |
| DASH-04 | Aviso «hay cambios sin publicar» | DOCUMENTADO como pendiente | **No implementada** | — | |
| DASH-05 | Fecha exacta de vencimiento y avisos 30/7/1 días | **DECIDIDO** (P23) | **No implementada** | — | Hoy el panel muestra una vigencia calculada en el cliente (6 meses) |
| DASH-06 | Perfil: datos del casamiento y de la cuenta | DOCUMENTADO | **Parcial** (ver AUTH-05) | E2E | |
| DASH-07 | Eliminar la cuenta o el casamiento | DECIDIDO (procedimiento P32/P30) | **No implementada** | — | No hay ruta ni pantalla |

## 6. Lista de regalos (GIFT)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| GIFT-01 | Catálogo, sets y regalo propio; ordenar; quitar | DOCUMENTADO | **Implementada** (`panel.regalos.tsx`, `logic.ts`) | U (`weda-logic` regalos) | |
| GIFT-02 | Datos de cobro: banco, CBU y alias, con validación de formato | DOCUMENTADO | **Implementada** | U (validaciones de alias, `payout`) | Desde 2026-10-31 se guardan **fuera del borrador**, con versiones (`payout_methods`); ver GIFT-14 |
| GIFT-03 | Lista pública de regalos y flujo de regalar (elegir → datos → comprobante) | DOCUMENTADO | **Implementada** (`gifts-page.tsx`) | U (`wedding-flow`) · E2E | |
| GIFT-04 | **Comprobante obligatorio en el mismo envío** («sin comprobante no hay regalo») | DECIDIDO (dueña, 2026-10-28) | **Implementada y probada** | U (`wedding-flow`) | |
| GIFT-05 | Correo del invitado obligatorio y constancia por correo | DECIDIDO | **Implementada**; el envío real no se probó | U (`wedding-flow`) | Sin `RESEND_API_KEY` no sale ningún correo |
| GIFT-06 | Aportes recibidos en el panel (quién, regalos, monto, mensaje, estado, ver comprobante, pedir comprobante) | DOCUMENTADO | **Implementada** (lee `GET /api/contributions`) | U (API) | Los textos dicen «Aportes recibidos» (IC-07) |
| GIFT-07 | **Confirmar o rechazar un aporte (revisión manual)** | DOCUMENTADO («reglas propuestas, pendientes de confirmación comercial») | **API implementada y probada; la interfaz del panel no tiene botones** | U (`wedding-flow`) | El estado «confirmado» es inalcanzable desde la interfaz (IC-08) |
| GIFT-08 | **Regalos repetibles, sin stock ni bloqueo** | **DECIDIDO** (Q1) | **No implementada: el servidor responde 409 `gift_taken` y la página muestra «Ya elegido»**; las pruebas verifican lo contrario de la decisión | U (`wedding-flow`: «un regalo ya tomado no se puede tomar de nuevo») | IC-03 |
| GIFT-09 | Aporte de importe libre | **DECIDIDO** (Q1) | **No implementada** (cada aporte son regalos del catálogo con monto fijo) | — | |
| GIFT-10 | Moneda de recepción ARS o USD, importes con moneda | **DECIDIDO** (Q3) | **No implementada** (importes enteros en pesos, sin columna de moneda) | — | |
| GIFT-11 | Tarjeta como medio para regalar | PENDIENTE | **No disponible**: 501 `card_not_available`; el plan «Regalos» igual dice «Alias y tarjeta» | U | IC-07 |
| GIFT-12 | Libro inmutable de transacciones | **DECIDIDO** (A5) | **No implementada** (el estado del aporte es mutable) | — | |
| GIFT-13 | Exportar regalos, aportes y resumen financiero; ZIP de comprobantes | **DECIDIDO** | **No implementada** | — | Hoy solo se exportan invitados |
| GIFT-14 | Cambio de alias con reautenticación, confirmación, auditoría y aviso (Q4) | **DECIDIDO** (extras en P5) | **Implementada y probada, nivel base** (2026-10-31): `POST /api/wedding/payout` con la clave, sobre la versión vigente, hasta 3 cambios por día; versiones de solo agregado; correo al dueño con datos enmascarados; un guardado del borrador ya no cambia el destino | U (`payout`: 8, `auth-isolation`, `payout-form`: 4) | Los invitados lo ven al publicar los cambios. Extras de DP-01 pendientes; los aportes todavía no registran a qué destino se informaron |

## 7. Micrositio y constructor (SITE)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| SITE-01 | Constructor de secciones: portada (obligatoria), save the date, eventos, regalos, confirmación, dress code, texto libre, fotos, playlist de Spotify, mensaje final | DOCUMENTADO | **Implementada** (`panel.sitio.tsx`) | U (`section-order`: 17) · E2E | |
| SITE-02 | Reordenar, mostrar u ocultar, agregar y quitar secciones | DOCUMENTADO | **Implementada** | U (`section-order`) | |
| SITE-03 | Eventos con búsqueda de lugar en Google Maps | DOCUMENTADO | **Implementada**; la clave de producción se probó solo en local | E2E (`place-search`) | |
| SITE-04 | Galería, dress code, mensaje final, música | DOCUMENTADO (planes) | **Implementada** (la música es solo configuración y vista previa) | U (planes) | No hay conexión real con Spotify |
| SITE-05 | Fotos como archivos con nombre por hash | DOCUMENTADO | **Implementada y probada** (`media.ts`) | U (`media`) | El borrador sigue limitado a 6 MB por guardado |
| SITE-06 | Bloques como filas independientes, edición concurrente por sección, historial de versiones, restaurar | **DECIDIDO** (A8) | **No implementada**: el borrador es un JSON único con revisión optimista | U (`wedding-flow`: conflicto 409) | |
| SITE-07 | Tipografía y estilos de la página pública | DECIDIDO (`CLAUDE.md`) | **Implementada** | — | |

## 8. Invitados, acompañantes y RSVP (GST)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| GST-01 | Alta, edición y baja de invitados; restricción alimentaria; grupo o mesa | DOCUMENTADO | **Implementada** | U (`weda-logic`, `wedding-flow`) | |
| GST-02 | Importar desde Excel/CSV y exportar a Excel | DOCUMENTADO | **Implementada** en el navegador, sin dependencias | U (`guests-io`: 6) | Una sola hoja; el servidor no participa |
| GST-03 | Mesas y grupos | DOCUMENTADO | **Implementada** dentro del borrador (no relacional) | U (`weda-logic`) | |
| GST-04 | Formulario de confirmación de asistencia en el sitio público (1 a 10 personas por envío) | DOCUMENTADO | **Implementada y probada** | U (`wedding-flow`) | |
| GST-05 | Identificación por nombre y apellido normalizados; responder otra vez **actualiza** a la misma persona | DOCUMENTADO como riesgo | **Implementada y probada** | U | Contradice A6 (IC-09): cualquiera puede responder por otro nombre |
| GST-06 | **Invitación individual o grupal con enlace personal, token hasheado y revocable** | **DECIDIDO** (D5/A6) | **No implementada** | — | |
| GST-07 | **Cupo por invitación fijado por la pareja; acompañantes hasta el cupo** | **DECIDIDO** (Q7) | **No implementada** | — | Hoy: 1–10 personas libres por envío |
| GST-08 | Historial de respuestas | DOCUMENTADO | **Implementada** (`rsvp_events`, solo servidor) | U | |
| GST-09 | Correo del invitado en la confirmación | DOCUMENTADO | **Parcial**: el servidor lo acepta como **opcional**; `ux-flows` dice «obligatorio en el formulario» | U (opcional) | IC-12 |
| GST-10 | Envío de invitaciones por correo o WhatsApp | no definido | **No diseñada** | — | La pareja comparte el enlace por su cuenta |

## 9. Publicación y sitio público (PUB)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| PUB-01 | Publicar, dar de baja, volver a publicar y «Publicar los cambios» con el mismo enlace | DOCUMENTADO | **Implementada y probada** | U (`wedding-flow`) | Acción manual de la pareja |
| PUB-02 | Dirección estable `/sitio/{slug}` con sufijo si hay repetidos | DOCUMENTADO | **Implementada y probada** | U | El slug no se puede cambiar |
| PUB-03 | Sitio público renderizado en el servidor (nombres y metadatos de la pareja) | DOCUMENTADO | **Implementada y probada** | U + E2E | Si la base no abre: cae a «no disponible» (503) |
| PUB-04 | Lo publicado es una copia (snapshot): editar no cambia lo público hasta publicar | DOCUMENTADO | **Implementada y probada** | U | No hay versiones anteriores |
| PUB-05 | Vencimiento aplicado por el servidor a los **6 meses** desde la primera publicación | DOCUMENTADO (decisión de 2026-10-28, **reemplazada**) | **Implementada y probada** | U (`expiry`: 5) | Reemplazada por la vigencia de 12 meses (IC-02) |
| PUB-06 | **Vigencia única de 12 meses desde que Weda confirma el pago y activa la publicación** | **DECIDIDO** | **No implementada** | — | |
| PUB-07 | **Cierre al vencer: sin edición, publicación, gestión, descargas ni acceso al panel, para todos los roles** | **DECIDIDO** | **No implementada**: al vencer solo se bloquea publicar y la página responde 410; se puede seguir editando | U (`expiry`) prueba el comportamiento actual | IC-05 |
| PUB-08 | Publicación sin contenido completo; mínimos de seguridad (P35) | DECIDIDO el principio; mínimos **PENDIENTES** | **Parcial**: el servidor exige nombres de la pareja y plan; lo demás son avisos que no bloquean | U (`publish-todo`, `weda-logic`) | |
| PUB-09 | Dirección de un evento vencido no se reutiliza; «evento no disponible» | **DECIDIDO** (P24, P31) | **No implementada** | — | |
| PUB-10 | Publicación versionada y restaurable | **DECIDIDO** (A8) | **No implementada** | — | |

## 10. Correo, privacidad y datos personales (PRIV)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| PRIV-01 | Constancia de regalo, pedido de comprobante, recuperar clave, baja de novedades (Resend) | DOCUMENTADO | **Implementada**; sin `RESEND_API_KEY` solo se registra «omitido» | U (con salida de prueba) | **Nunca probada con el servicio real** |
| PRIV-02 | Novedades de Weda solo con casilla aparte, con texto versionado y baja por enlace firmado | DECIDIDO | **Implementada y probada** (`marketing_consents`) | U (`wedding-flow`) | |
| PRIV-03 | Comprobantes privados (solo la pareja dueña; tipo validado por contenido; 5 MB) | DOCUMENTADO | **Implementada y probada** | U | |
| PRIV-04 | Registro de correos enviados (nunca el contenido) | DOCUMENTADO | **Implementada** (`mail_log`) | U | Sin restricción de unicidad ni estado «entregado» |
| PRIV-05 | Política de retención y eliminación posterior al cierre | PENDIENTE (P30) | **No implementada** (no hay limpieza, a propósito) | — | |
| PRIV-06 | Procedimiento de derechos de acceso, rectificación y supresión | DECIDIDO (P32) | **No implementada** (solo una lista de tareas en `datos-personales.md`) | — | |
| PRIV-07 | Eliminación de borradores abandonados por inactividad (P19) | DECIDIDO (valores de producto) | **No implementada** | — | |
| PRIV-08 | Inscripción de las bases en la AAIP | DOCUMENTADO como tarea | **No hecha** | — | |

## 11. Administración interna de Weda (ADM)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| ADM-01 | Administración interna: precios, planes, soporte, auditoría, roles de personal | **DECIDIDO** (Q5) | **No implementada** (no existe ninguna superficie de administración; los precios están en el código) | — | |
| ADM-02 | Tablero de métricas | DOCUMENTADO | **No implementada** (`funnel_events` se consulta con SQL) | — | |

## 12. Roles, membresías y eventos múltiples (ACC)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| ACC-01 | Un solo usuario por casamiento | Es el estado actual | **Implementada** (`weddings.owner_id UNIQUE`) | U (aislamiento) | |
| ACC-02 | Propietario único + administradores y colaboradores; transferencia segura | **DECIDIDO** (A2/D3) | **No implementada** | — | |
| ACC-03 | Varios eventos por usuario; evento nuevo independiente tras el cierre | **DECIDIDO** | **No implementada** (`owner_id UNIQUE`) | — | |
| ACC-04 | Evento finalizado visible en la cuenta con solo información comercial (P34) | **PROPUESTA ADOPTADA** | **No implementada** | — | |
| ACC-05 | Aislamiento entre eventos (autorización en el servidor, sin ids de casamiento desde el cliente) | DECIDIDO (A7) | **Implementada y probada** para el modelo de un dueño | U (`auth-isolation`, `wedding-flow`, `payments-flow`) | Se debe reprobar al agregar membresías |

## 13. Analítica (ANL)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| ANL-01 | Embudo mínimo: 6 eventos del servidor (registro, publicación, pago, confirmación, regalo, apertura) sin datos personales | DOCUMENTADO | **Implementada** (`funnel_events`) | U (`funnel`: 2) | Sin identidad de usuario ni sesión: no se pueden armar embudos por persona; `public_invitation_opened` cuenta cada recarga |
| ANL-02 | Tres capas (eventos 13 meses, fotografía mensual 25 meses, agregados con evaluación de riesgo), seudónimos, idempotencia | **DECIDIDO** (plazos y misma base SQLite) | **No implementada** | — | |
| ANL-03 | Métricas de negocio definidas (`05b`) | DOCUMENTADO (definiciones, sin aprobación formal de cada una) | **No implementada** | — | |

## 14. Operación e infraestructura (OPS)

| ID | Funcionalidad | Estado documental | Estado en código | Tests | Observaciones |
|---|---|---|---|---|---|
| OPS-01 | Hosting con disco persistente | PENDIENTE (decisión de infraestructura) | **No definido**; no hay despliegue | — | `deployment-checklist.md`: «no se hizo ningún despliegue» |
| OPS-02 | Respaldos y restauración | PENDIENTE | **No existen** | — | |
| OPS-03 | Migraciones automáticas al iniciar (`user_version`) | DOCUMENTADO | **Implementada y probada** (6 migraciones) | U (`hardening`) | |
| OPS-04 | Límites de uso | DOCUMENTADO | **Implementada en memoria** (no compartida entre procesos) | U | La IP sale de `X-Forwarded-For` (falseable si el servidor está expuesto) |
| OPS-05 | Registro de errores y métricas | PENDIENTE | **Parcial**: `console.error` | — | Sin logging estructurado |
| OPS-06 | Endpoint de salud | — | **Implementada** (`/api/health`) | — | |
| OPS-07 | Requisito de Node 22.5 (`node:sqlite`, experimental) | DOCUMENTADO | **Implementada** | U | Aviso experimental en cada proceso |

---

## 15. Clasificación y resumen

Cada una de las 102 funcionalidades de este inventario recibe **una** clasificación. Criterio: *probada* = existe código y una prueba que pasó el 2026-10-31 ejerce el comportamiento; *sin pruebas suficientes* = existe código pero solo hay pruebas E2E que no se ejecutaron hoy o ninguna; *no verificada* = depende de un servicio externo nunca probado; *diseñada, no implementada* = hay decisión o diseño documentado, sin código (incluye lo que el código contradice).

| Clasificación | Cantidad |
|---|---:|
| Implementada y probada | 44 |
| Implementada sin pruebas suficientes | 9 |
| Implementada parcialmente | 7 |
| Diseñada, no implementada | 39 |
| No diseñada | 1 |
| No verificada | 2 |
| **Total** | **102** |

### Por módulo

| Módulo | Prob. | Sin pruebas | Parcial | Diseñada | No diseñ. | No verif. |
|---|---:|---:|---:|---:|---:|---:|
| Landing y adquisición (LAN) | 2 | 5 | 0 | 0 | 0 | 0 |
| Registro y cuenta (AUTH) | 2 | 0 | 2 | 3 | 0 | 0 |
| Onboarding (ONB) | 4 | 0 | 0 | 0 | 0 | 0 |
| Contratación, planes y pago (PAY) | 5 | 0 | 0 | 6 | 0 | 0 |
| Panel (inicio y cuenta) (DASH) | 1 | 2 | 1 | 3 | 0 | 0 |
| Lista de regalos y aportes (GIFT) | 6 | 0 | 1 | 7 | 0 | 0 |
| Micrositio y constructor (SITE) | 4 | 1 | 0 | 1 | 0 | 1 |
| Invitados y RSVP (GST) | 6 | 0 | 1 | 2 | 1 | 0 |
| Publicación y vigencia (PUB) | 5 | 0 | 1 | 4 | 0 | 0 |
| Correo, privacidad y datos (PRIV) | 3 | 0 | 0 | 4 | 0 | 1 |
| Administración interna (ADM) | 0 | 0 | 0 | 2 | 0 | 0 |
| Roles, eventos múltiples y cuenta (ACC) | 2 | 0 | 0 | 3 | 0 | 0 |
| Analítica (ANL) | 1 | 0 | 0 | 2 | 0 | 0 |
| Operación e infraestructura (OPS) | 3 | 1 | 1 | 2 | 0 | 0 |

### Qué funcionalidad cae en cada clasificación

- **Implementada y probada** (44): LAN-03, LAN-05, AUTH-01, AUTH-02, ONB-01, ONB-02, ONB-03, ONB-04, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, DASH-01, GIFT-01, GIFT-02, GIFT-03, GIFT-04, GIFT-05, GIFT-06, SITE-01, SITE-02, SITE-04, SITE-05, GST-01, GST-02, GST-03, GST-04, GST-05, GST-08, PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PRIV-02, PRIV-03, PRIV-04, ACC-01, ACC-05, ANL-01, OPS-03, OPS-04, OPS-07
- **Implementada sin pruebas suficientes** (9): LAN-01, LAN-02, LAN-04, LAN-06, LAN-07, DASH-02, DASH-03, SITE-07, OPS-06
- **Implementada parcialmente** (7): AUTH-05, AUTH-06, DASH-06, GIFT-07, GST-09, PUB-08, OPS-05
- **Diseñada, no implementada** (39): AUTH-03, AUTH-04, AUTH-07, PAY-06, PAY-07, PAY-08, PAY-09, PAY-10, PAY-11, DASH-04, DASH-05, DASH-07, GIFT-08, GIFT-09, GIFT-10, GIFT-11, GIFT-12, GIFT-13, GIFT-14, SITE-06, GST-06, GST-07, PUB-06, PUB-07, PUB-09, PUB-10, PRIV-05, PRIV-06, PRIV-07, PRIV-08, ADM-01, ADM-02, ACC-02, ACC-03, ACC-04, ANL-02, ANL-03, OPS-01, OPS-02
- **No diseñada** (1): GST-10
- **No verificada** (2): SITE-03, PRIV-01

**Lectura:** lo construido hoy es una plataforma de armado, publicación manual, confirmación de asistencia y regalos con comprobante, bien probada en el servidor. **Lo decidido en las últimas rondas de diseño** (pagar = activar + publicar, vigencia de 12 meses y cierre, libro, invitaciones con cupo, roles, retención, administración, analítica en capas) **está casi todo sin construir**.
