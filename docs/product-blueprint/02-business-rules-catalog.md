# Weda · Catálogo de reglas de negocio (anexo 02)

Anexo del [Product Blueprint](00-product-blueprint.md). Ver también: [inventario](01-feature-inventory.md) · [decisiones y riesgos](03-open-decisions-and-risks.md) · [preparación comercial](04-mvp-readiness.md) · [roadmap](05-implementation-roadmap.md).

**No se inventó ninguna regla.** Cada fila resume lo que figura en la documentación y lo contrasta con el código del 2026-10-31. Si una regla no tiene aprobación explícita, se dice.

## Convenciones

- **Aprobación:** **DECIDIDO** (aprobada de forma explícita por la dueña en el trabajo de diseño: decisiones A1–A8, Q1–Q8, D1–D5, P2, P11, P13, P15, P17, P19, P20, P22–P24, P29, P31–P33, la vigencia única de 12 meses y «pagar = activar + publicar») · **PROPUESTA ADOPTADA** (P34) · **DOCUMENTADO** (figura en documentos sin aprobación confirmada) · **PENDIENTE** (falta una decisión).
- **Implementación:** estado verificado en el código (ver [inventario](01-feature-inventory.md)): IMPLEMENTADO · PARCIAL · NO IMPLEMENTADO · CONTRADICE (el código hace lo opuesto a la regla).
- **Pruebas:** «U (archivo)» = prueba automática que pasó el 2026-10-31; «—» = ninguna.
- **Documentos:** `02d` = `data-architecture/02d-event-lifecycle-and-final-export.md`; `02` = `02-domain-model.md`; `02b` = retención; `05`/`05b` = analítica y métricas; `06` = consolidación; `UX` = `docs/ux-flows.md`; `PR` = `auditoria-ux-conversion/production-readiness.md`; `PI` = `payment-integration.md`; `BR` = `backend-readiness.md`; `DP` = `datos-personales.md`.

---

## A. Contratación, pago, publicación y vigencia

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-01 | **Contratar, pagar y publicar son una única acción.** Al confirmarse el pago, la contratación queda activa, el evento pasa a activo, el micrositio se publica automáticamente, se registra la primera publicación efectiva y comienza la vigencia | DECIDIDO | `02d` §0–§1, `06` §1.1, `UX` | **NO IMPLEMENTADO**: el pago solo habilita el botón «Publicar mi página» (acción aparte) | U (`payments-flow`) prueba el flujo **separado** actual | IC-01. `PI` y `ux-flows` describen el flujo manual como definitivo |
| BR-02 | No se publica sin pago confirmado (salvo en pruebas) | DECIDIDO (P11) | `02d`, `PI` | **PARCIAL**: solo se exige con `WEDA_REQUIRE_PAID_ORDER=true` o proveedor `test`; por defecto publicar es gratis | U (`wedding-flow`, `payments-flow`) | IC-17: un despliegue sin esa variable cobra nada |
| BR-03 | **Vigencia única de 12 meses** desde el momento en que Weda confirma el pago y activa la publicación; sin renovación ni extensión | DECIDIDO | `02d` §0–§1, `02`, `05` | **CONTRADICE**: 6 meses desde la primera publicación manual (`PUBLICATION_MONTHS = 6`) | U (`expiry`) prueba **6** meses | IC-02. Reemplaza la decisión comercial del 2026-10-28 |
| BR-04 | La vigencia **no** comienza al crear el borrador, registrarse, completar el onboarding, iniciar el checkout o hacer clic en pagar sin confirmación; **no** se reinicia al despublicar/republicar; **no** cambia con la fecha de la boda ni con mejoras de plan | DECIDIDO | `02d` §1.1 | **PARCIAL**: republicar, bajar y mejorar plan no mueven el vencimiento; la fecha de la boda no interviene; **pero el inicio es la primera publicación manual**, no la confirmación del pago | U (`expiry`: «publicar cambios no extiende») | |
| BR-05 | Si la confirmación del proveedor llega demorada, el inicio es el momento en que **Weda** confirma el pago y activa; la hora del proveedor se guarda aparte | DECIDIDO | `02d` §1.1–§1.2 | **NO IMPLEMENTADO** (no se guarda la hora del proveedor ni hay activación) | — | |
| BR-06 | La publicación no se bloquea por secciones opcionales incompletas; solo se validan los mínimos para una página pública válida y segura | DECIDIDO (principio); **mínimos PENDIENTES** (P35) | `02d` §1.1, `02` | **PARCIAL**: el servidor exige nombres de la pareja y un plan; las demás faltas son avisos que no bloquean | U (`publish-todo`, `wedding-flow` «no publica sin nombres ni sin plan») | Definir P35 antes de publicar automáticamente |
| BR-07 | **Al vencer el evento se cierra de forma definitiva**: sin edición, publicación, republicación, gestión (todos los roles, propietario incluido), RSVP ni regalos públicos, panel ni exportaciones; sin reactivación (ni por soporte); URL pública no disponible y no reutilizable | DECIDIDO (P20, P24, P31) | `02d` §0, §2–§3 | **PARCIAL**: se bloquea publicar y la página, el RSVP y los regalos públicos responden 410 **a los 6 meses**; **no** se bloquea editar, el panel ni nada del dueño; la URL no queda reservada | U (`expiry`) | IC-05 |
| BR-08 | Una boda posterior al vencimiento no extiende la vigencia; sin límite de anticipación al contratar; debe explicarse antes de contratar | DECIDIDO (P2) | `02d` §1.3 | **NO IMPLEMENTADO** (no hay explicación previa; los textos dicen 6 meses) | — | Riesgo comercial aceptado |
| BR-09 | **Aceptación expresa de las seis condiciones de vigencia** antes de confirmar la contratación; se guarda quién, evento y contratación, fecha y hora, versión del texto y evidencia | DECIDIDO como requisito; **redacción de las cláusulas 1 y 2 pendiente de aprobación** | `02d` §1.4 | **NO IMPLEMENTADO** | — | Consideraciones legales abiertas (suficiencia de la evidencia, IP) |
| BR-10 | Avisos de vencimiento a 30, 7 y 1 día (panel y correo al propietario), fecha exacta visible, recordatorio de descargar; no extienden la vigencia; envío idempotente sin asumir entrega | DECIDIDO (P23) | `02d` §1.5, `05` | **NO IMPLEMENTADO** | — | |
| BR-11 | Una compra sobre un evento finalizado se rechaza; el plan nuevo se contrata para un evento nuevo | DECIDIDO | `02d` §2.1, `02` | **NO IMPLEMENTADO** (no hay «finalizado») | — | |
| BR-12 | No hay renovación, extensión ni reactivación | DECIDIDO | `02d` §0 | **PARCIAL**: hoy una publicación vencida no se reabre sola y no hay forma de renovar | U (`expiry`: «vencida no se reabre») | `PR` lista «renovar» como pendiente comercial: queda resuelto como «no hay» |

## B. Planes y funcionalidades

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-13 | Tres planes acumulativos (Regalos, Celebración, Celebración Plus); precios de referencia en ARS de **pago único** (95.000 / 140.000 / 150.000) | DECIDIDO como valores de referencia (autora) | `plans.ts`, `UX` §3 | **IMPLEMENTADO** | U (`weda-logic`, `landing-plans`) | `PRODUCT.md` cita 180.000/320.000 y «1 año»; `UX` §3 dice «no se afirma pago único»; impuestos y facturación sin decidir |
| BR-14 | Cada plan habilita solo sus funciones; lo no incluido se conserva como borrador y se oculta | DECIDIDO | `plans.ts`, `UX` | **IMPLEMENTADO** | U (`weda-logic` planes, `publish-todo`) | |
| BR-15 | Mejora de plan solo hacia uno más completo y pagando la diferencia; no cambia la vigencia | DECIDIDO | `UX`, `PI`, `02d` | **IMPLEMENTADO** (la vigencia sigue desde la primera publicación) | U (`payments-flow`, `payments`) | |
| BR-16 | Los precios y los planes los gestiona solo Weda desde una administración interna, con historial y sin cambios retroactivos | DECIDIDO (Q5) | `02` | **NO IMPLEMENTADO** (precios en el código; no hay administración) | — | |
| BR-17 | El monto de una orden lo calcula el servidor; el cliente no puede marcar «pagado» | DOCUMENTADO | `PI`, `BR` | **IMPLEMENTADO** | U (`payments-flow`, `wedding-flow`) | Solo con el adaptador de prueba |
| BR-18 | Cancelación y reembolso de planes | PENDIENTE (P26) | `02d`, `06` | **NO IMPLEMENTADO** | — | No se inventa política |

## C. Regalos, aportes y comprobantes

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-19 | **Los regalos son repetibles**: sin stock, sin bloqueo exclusivo, sin unicidad que lo impida | DECIDIDO (Q1) | `02` §5.1 | **CONTRADICE**: un regalo en un aporte activo no se puede tomar de nuevo (409 `gift_taken`; la página muestra «Ya elegido») | U (`wedding-flow`) prueba el comportamiento opuesto | IC-03. `UX` §11 dice que se puede regalar dos veces: describe otra etapa |
| BR-20 | Dos modalidades: regalo de importe sugerido y aporte de importe libre | DECIDIDO (Q1) | `02` | **PARCIAL**: solo regalos del catálogo con monto fijo | — | |
| BR-21 | Monedas ARS y USD, elegida por la pareja; todo importe lleva su moneda; sin conversión ni sumas entre monedas | DECIDIDO (Q3) | `02`, `05b` | **NO IMPLEMENTADO** (ARS implícito; sin columna de moneda) | — | |
| BR-22 | **Sin comprobante no hay regalo**: el comprobante viaja en el mismo envío; no se puede confirmar un aporte sin comprobante | DECIDIDO (dueña, 2026-10-28) | `UX`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | Puede reducir la conversión (F-13): hipótesis sin medir |
| BR-23 | El correo del invitado es obligatorio al regalar (constancia); la casilla de novedades es aparte y destildada | DECIDIDO | `UX`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-24 | Un aporte nace «pendiente de revisión»; solo la pareja dueña lo confirma o rechaza; el invitado no puede confirmar el suyo; transiciones `pendiente→confirmado/rechazado`, `confirmado→rechazado`, `rechazado→pendiente` | DOCUMENTADO («reglas propuestas, pendientes de confirmación comercial») | `BR`, código | **PARCIAL**: API implementada; **no hay botones en el panel** | U (`wedding-flow`) | IC-08. El modelo de la Fase 2 distingue más estados (revisado, reembolso…) |
| BR-25 | **Weda no arbitra ni verifica transferencias**; los informes dicen «confirmado manualmente», nunca «recibido» ni «acreditado» | DECIDIDO | `02d` §5.3, `02b` | **PARCIAL**: el servidor lo cumple («pendiente de revisión»); la interfaz dice «Aportes recibidos» y «Todavía no recibiste regalos» | — | IC-07 |
| BR-26 | Libro inmutable: las correcciones son movimientos nuevos relacionados; el comprobante no es la transacción | DECIDIDO (A5) | `02` | **NO IMPLEMENTADO** (estado mutable en `contributions`) | — | |
| BR-27 | La cantidad de aportantes solo se ve en el panel privado, nunca en lo público; no se exponen nombres ni importes públicamente | DECIDIDO (Q2) | `02` | **PARCIAL**: el sitio público expone solo los ids de regalos tomados (sin nombres, montos ni cantidades) | U (`wedding-flow` «solo expone lo público») | Desaparece al cumplirse BR-19 |
| BR-28 | La tarjeta no está disponible hasta que exista un proveedor | DOCUMENTADO | `BR` | **IMPLEMENTADO** (501) | U | El plan «Regalos» promete «Alias y tarjeta» |
| BR-29 | El comprobante es privado: solo lo ve la pareja dueña | DOCUMENTADO | `BR`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-30 | **Cambiar alias o datos bancarios**: solo el propietario, con contraseña reciente, confirmación explícita, auditoría, aviso al propietario y validación en el servidor; extras (confirmación fuera de banda, espera, TOTP) abiertos | DECIDIDO (Q4); extras PENDIENTES (P5) | `02` §5.4 | **NO IMPLEMENTADO**: el alias se edita en el borrador sin controles; no hay versiones ni auditoría | — | IC-04 |

## D. Invitados, invitaciones y RSVP

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-31 | La **invitación** es la unidad de acceso (individual o familiar), con enlace personal, token hasheado, revocable y renovable | DECIDIDO (D5, A6) | `02` | **NO IMPLEMENTADO** | — | |
| BR-32 | **Cupo por invitación** fijado por la pareja; el invitado registra acompañantes hasta el cupo y no puede subirlo; se distinguen autorizados, confirmados y asistentes | DECIDIDO (Q7); si el cupo incluye al invitado (P12) PENDIENTE | `02` | **NO IMPLEMENTADO** (1 a 10 personas libres por envío) | U (`wedding-flow` valida 1–10) | |
| BR-33 | Una respuesta es modificable y deja historial; **nunca se sobrescribe por coincidencia de nombre** | DECIDIDO (A6) | `02` | **CONTRADICE** en parte: responder otra vez con el mismo nombre normalizado **actualiza** a esa persona (con historial) | U (`wedding-flow`, `weda-logic`) | IC-09: cualquiera con el enlace puede responder por otro |
| BR-34 | El formulario público no devuelve datos de otros invitados ni revela si alguien estaba en la lista | DOCUMENTADO | `BR` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-35 | Límite de 30 escrituras públicas cada 10 minutos por IP y sitio | DOCUMENTADO | `BR` | **IMPLEMENTADO** en memoria | U (`hardening`) | No compartido entre procesos |
| BR-36 | Mesas y grupos son de gestión: no se publican | DOCUMENTADO | `UX` | **IMPLEMENTADO** (dentro del borrador) | U (`weda-logic`) | El modelo conceptual los pone como entidades relacionales |

## E. Roles, propiedad y aislamiento

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-37 | Un evento tiene **un único propietario**; otras personas son miembros (administrador, colaborador); nunca cero propietarios; transferencia segura; dos integrantes de la pareja no son dos propietarios | DECIDIDO (A2, D3) | `02` | **NO IMPLEMENTADO** (un usuario por casamiento) | — | |
| BR-38 | Permisos explícitos verificados en el servidor; ningún acceso entre eventos por ids o rutas | DECIDIDO (A3, A7) | `02`, `BR` | **IMPLEMENTADO** para el modelo actual: no existe ruta con id de casamiento; filtros por `owner_id` | U (`auth-isolation`, `wedding-flow`, `payments-flow`) | Debe volver a probarse al agregar membresías |
| BR-39 | Una persona puede ser propietaria de **varios** eventos; un evento nuevo es independiente y no hereda nada | DECIDIDO | `02d` §4 | **NO IMPLEMENTADO** (`owner_id UNIQUE`) | — | IC-06 |
| BR-40 | El evento finalizado aparece en la cuenta del propietario solo con información comercial y contractual (nombres, fecha de la boda, plan, fechas, órdenes y pagos, comprobantes de compra de Weda) | PROPUESTA ADOPTADA (P34) | `02d` §3.4 | **NO IMPLEMENTADO** | — | La conservación de cada categoría requiere validación |
| BR-41 | La cuenta de la pareja es independiente del estado del evento | DECIDIDO (P32) | `02d` §3.3 | **NO IMPLEMENTADO** (un evento por cuenta) | — | |

## F. Retención, eliminación y derechos

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-42 | Tras el vencimiento, cada clase de dato sigue una política posterior al cierre; **no se asume eliminación inmediata ni conservación indefinida**; plazos sin definir | DECIDIDO el principio; **plazos PENDIENTES** (P30) | `02d` §6, `02b` | **NO IMPLEMENTADO** (no hay eliminación; limpieza omitida a propósito) | — | `privacidad.tsx` dice «mientras la cuenta esté activa» (IC-14) |
| BR-43 | Lo financiero con obligación legal se conserva separado de los datos personales, sin borrado en cascada, con acceso restringido | DECIDIDO (principio); plazos y clasificación PENDIENTES (P6) | `02b`, `02d` | **CONTRADICE**: todas las tablas tienen `ON DELETE CASCADE` desde el casamiento (inactivo porque no existe borrado por API) | — | IC-15 |
| BR-44 | Los comprobantes de invitados no se asumen documentación contable; su tratamiento es PENDIENTE | PENDIENTE (P6, P30) | `02b`, `02d` | **NO IMPLEMENTADO** | — | |
| BR-45 | Borradores nunca contratados se eliminan por inactividad: cuenta sin evento 12 meses; evento sin contratación 6; onboarding incompleto 6; borrador avanzado 12; actividad = inicio de sesión o escritura efectiva | DECIDIDO (valores de producto); fundamento legal PENDIENTE; avisos 30/7/1 = recomendación | `02d` §2.8 | **NO IMPLEMENTADO** | — | |
| BR-46 | Eliminar un borrador no es eliminar la cuenta ni ejercer un derecho legal | DECIDIDO | `02d` §2.8 | **NO IMPLEMENTADO** (no hay ninguna de las dos) | — | |
| BR-47 | Derechos de acceso, rectificación y supresión por un **procedimiento separado**, sin reactivar el evento ni habilitar el panel | DECIDIDO (P32); plazos y rol de Weda PENDIENTES | `02d` §6.3, `02b` §7 | **NO IMPLEMENTADO** | — | `DP` propone plazos (10 días corridos y 5 hábiles) mientras `02b` dice «no se definen»: IC-13 |
| BR-48 | Los datos de invitados no se usan para marketing; las novedades de Weda exigen una casilla aparte, consentimiento versionado y baja | DECIDIDO | `UX`, `DP`, `02b` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-49 | Los comprobantes de compra de Weda y los comprobantes de invitados son documentos distintos con plazos que no se asumen iguales | DECIDIDO (P34) | `02d` §3.4 | **NO IMPLEMENTADO** (no existe factura de Weda) | — | |

## G. Analítica

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-50 | Los eventos del navegador permanecen apagados hasta definir política y consentimiento (P14) | DECIDIDO | `05` | **IMPLEMENTADO** (`VITE_ANALYTICS=on` los enciende) | U parcial (`funnel`) | |
| BR-51 | Los eventos del servidor miden el embudo desde el registro, sin datos personales | DECIDIDO | `05` | **PARCIAL** (6 eventos, sin identidad) | U (`funnel`) | |
| BR-52 | Tres capas: eventos seudónimos (13 meses), fotografía mensual por boda (25 meses) y agregados sin vencimiento automático **solo tras evaluación de riesgo**; misma base SQLite con separación lógica | DECIDIDO (plazos y base) | `05` §3 | **NO IMPLEMENTADO** | — | |
| BR-53 | La analítica no es fuente de verdad; los importes salen del libro y de `Payment`, por moneda; no se identifican invitados | DECIDIDO | `05` | **NO IMPLEMENTADO** (no hay analítica de negocio) | — | |
| BR-54 | Un umbral numérico no garantiza anonimización; se exigen medidas combinadas | DECIDIDO | `05` §7 | **NO IMPLEMENTADO** | — | |
| BR-55 | Los eventos de pago confirmado, publicación, confirmación y regalo los registra solo el servidor | DOCUMENTADO | `analytics-events.ts` | **IMPLEMENTADO** | U (`funnel`) | |

## H. Seguridad de cuentas y operación

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-56 | Clave con scrypt; tokens de sesión, recuperación y gestión del invitado guardados solo como hash; cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción | DOCUMENTADO | `BR` | **IMPLEMENTADO** | U (`auth-isolation`, `password-reset`, `hardening`) | |
| BR-57 | Defensa CSRF: `Origin` propio, escrituras solo en JSON | DOCUMENTADO | `BR` | **IMPLEMENTADO** | U (`auth-isolation`, `hardening`) | |
| BR-58 | Recuperar la clave: respuesta idéntica exista o no la cuenta; enlace de un uso y 1 hora; cierra las sesiones | DOCUMENTADO | `PR` | **IMPLEMENTADO** | U (`password-reset`) | Correo real sin probar |
| BR-59 | Las fotos se guardan como archivos con nombre por hash; solo imágenes reales | DOCUMENTADO | `PR` | **IMPLEMENTADO** | U (`media`) | |
| BR-60 | Los términos y la privacidad existen como **borradores** hasta la revisión legal | DOCUMENTADO | `PR`, `DP` | **IMPLEMENTADO como borrador** | — | |
| BR-61 | La interfaz no habla de «demo», «demostración» ni «pago de prueba»; no hay botones decorativos | DECIDIDO (`CLAUDE.md`, 2026-10-28) | `CLAUDE.md` | **PARCIAL**: se cumple en el panel; `/pago-de-prueba` dice «PAGO DE PRUEBA» a propósito (solo adaptador de prueba) y `/encontrar`, `/ejemplo` son muestras | E2E | |

## Resumen

| Estado de implementación | Reglas |
|---|---:|
| IMPLEMENTADO | 20 |
| PARCIAL | 11 |
| CONTRADICE (total o en parte) | 4 (BR-03, BR-19, BR-33, BR-43) |
| NO IMPLEMENTADO | 26 |
| **Total** | **61** |

Las reglas decididas más importantes del negocio (BR-01, BR-03, BR-07, BR-09, BR-10, BR-19, BR-21, BR-26, BR-30, BR-31, BR-32, BR-37 y BR-39) **no están implementadas o están contradichas por el código actual**.
