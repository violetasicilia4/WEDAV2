# Weda · Catálogo de reglas de negocio (anexo 02)

Anexo del [Product Blueprint](00-product-blueprint.md). Ver también: [inventario](01-feature-inventory.md) · [decisiones y riesgos](03-open-decisions-and-risks.md) · [preparación comercial](04-mvp-readiness.md) · [roadmap](05-implementation-roadmap.md).

**No se inventó ninguna regla.** Cada fila resume lo que figura en la documentación y lo contrasta con el código del 2026-10-31. Si una regla no tiene aprobación explícita, se dice.

## Convenciones

- **Aprobación:** **DECIDIDO** (aprobada de forma explícita por la dueña en el trabajo de diseño: decisiones A1–A8, Q1–Q8, D1–D5, P2, P11, P13, P15, P17, P19, P20, P22–P24, P29, P31–P33, la vigencia única de 12 meses y «pagar = activar + publicar») · **PROPUESTA ADOPTADA** (P34) · **DOCUMENTADO** (figura en documentos sin aprobación confirmada) · **PENDIENTE** (falta una decisión).
- **Implementación:** estado verificado en el código (ver [inventario](01-feature-inventory.md)): IMPLEMENTADO · PARCIAL · NO IMPLEMENTADO · CONTRADICE (el código hace lo opuesto a la regla).
- **Pruebas:** «U (archivo)» = prueba automática que pasó el 2026-10-31; «—» = ninguna.
- **Documentos:** `02d` = `data-architecture/02d-event-lifecycle-and-final-export.md`; `02` = `02-domain-model.md`; `02b` = retención; `05`/`05b` = analítica y métricas; `06` = consolidación; `UX` = `docs/ux-flows.md`; `PR` = `auditoria-ux-conversion/production-readiness.md`; `PI` = `payment-integration.md`; `BR` = `backend-readiness.md`; `DP` = `datos-personales.md`.

---

## A. Trial, contratación, pago, publicación y permanencia

> **Actualización 2026-11-04 (D-06, [PAY-07](../../specs/PAY-07-trial-contratacion-permanencia/spec.md)):** el modelo vigente es trial de 14 días (BR-63) → pausa si no se contrata (BR-64) → contratar = publicar (BR-01) → permanencia indefinida (BR-65). Las reglas de vigencia y cierre quedan reemplazadas o sin objeto; se conservan como historia.

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-01 | **Contratar, pagar y publicar son una única acción.** Al confirmarse el pago, la contratación queda activa, el evento pasa a activo, el micrositio se publica automáticamente, se registra la primera publicación efectiva y comienza la vigencia | DECIDIDO | `02d` §0–§1, `06` §1.1, `UX` | **IMPLEMENTADO** (2026-11-04, PAY-07): al confirmarse el pago el servidor publica en el mismo momento; si falla, `paid_unpublished` y reintento sin cobrar | U (`payments-flow`) prueba el flujo **separado** actual | IC-01. `PI` y `ux-flows` describen el flujo manual como definitivo *Desde PAY-07 la vigencia no existe (BR-65): «comienza la vigencia» queda sin objeto.* |
| BR-02 | No se publica sin pago confirmado (salvo en pruebas) | DECIDIDO (P11) | `02d`, `PI` | **PARCIAL**: solo se exige con `WEDA_REQUIRE_PAID_ORDER=true` o proveedor `test`; por defecto publicar es gratis | U (`wedding-flow`, `payments-flow`) | IC-17: un despliegue sin esa variable cobra nada |
| BR-03 | **Vigencia única de 12 meses** desde el momento en que Weda confirma el pago y activa la publicación; sin renovación ni extensión | **REEMPLAZADA** (D-06, 2026-11-04) | `02d` §0–§1, `02`, `05` | **CONTRADICE**: 6 meses desde la primera publicación manual (`PUBLICATION_MONTHS = 6`) | U (`expiry`) prueba **6** meses | IC-02. Reemplaza la decisión comercial del 2026-10-28 *Lo publicado no vence: BR-65.* |
| BR-04 | La vigencia **no** comienza al crear el borrador, registrarse, completar el onboarding, iniciar el checkout o hacer clic en pagar sin confirmación; **no** se reinicia al despublicar/republicar; **no** cambia con la fecha de la boda ni con mejoras de plan | **REEMPLAZADA** (D-06, 2026-11-04) | `02d` §1.1 | **PARCIAL**: republicar, bajar y mejorar plan no mueven el vencimiento; la fecha de la boda no interviene; **pero el inicio es la primera publicación manual**, no la confirmación del pago | U (`expiry`: «publicar cambios no extiende») | *Sin vigencia (BR-65). Lo que «no reinicia» ahora rige para el trial: BR-63.* |
| BR-05 | Si la confirmación del proveedor llega demorada, el inicio es el momento en que **Weda** confirma el pago y activa; la hora del proveedor se guarda aparte | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §1.1–§1.2 | **NO IMPLEMENTADO** (no se guarda la hora del proveedor ni hay activación) | — | *Sin vigencia no hay inicio que fechar (BR-65).* |
| BR-06 | La publicación no se bloquea por secciones opcionales incompletas; solo se validan los mínimos para una página pública válida y segura | DECIDIDO (principio); **mínimos PENDIENTES** (P35) | `02d` §1.1, `02` | **PARCIAL**: el servidor exige nombres de la pareja y un plan; las demás faltas son avisos que no bloquean | U (`publish-todo`, `wedding-flow` «no publica sin nombres ni sin plan») | Definir P35 antes de publicar automáticamente |
| BR-07 | **Al vencer el evento se cierra de forma definitiva**: sin edición, publicación, republicación, gestión (todos los roles, propietario incluido), RSVP ni regalos públicos, panel ni exportaciones; sin reactivación (ni por soporte); URL pública no disponible y no reutilizable | **REEMPLAZADA** (D-06, 2026-11-04) | `02d` §0, §2–§3 | **PARCIAL**: se bloquea publicar y la página, el RSVP y los regalos públicos responden 410 **a los 6 meses**; **no** se bloquea editar, el panel ni nada del dueño; la URL no queda reservada | U (`expiry`) | IC-05 *No hay cierre por tiempo (BR-65). La pausa del trial (BR-64) es otra cosa: solo antes de contratar y sin perder datos.* |
| BR-08 | Una boda posterior al vencimiento no extiende la vigencia; sin límite de anticipación al contratar; debe explicarse antes de contratar | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §1.3 | **NO IMPLEMENTADO** (no hay explicación previa; los textos dicen 6 meses) | — | Riesgo comercial aceptado *BR-65.* |
| BR-09 | **Aceptación expresa de las seis condiciones de vigencia** antes de confirmar la contratación; se guarda quién, evento y contratación, fecha y hora, versión del texto y evidencia | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §1.4 | **NO IMPLEMENTADO** | — | Consideraciones legales abiertas (suficiencia de la evidencia, IP) *No hay condiciones de vigencia que aceptar (BR-65). La aceptación de los términos sigue pendiente de redacción legal.* |
| BR-10 | Avisos de vencimiento a 30, 7 y 1 día (panel y correo al propietario), fecha exacta visible, recordatorio de descargar; no extienden la vigencia; envío idempotente sin asumir entrega | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §1.5, `05` | **NO IMPLEMENTADO** | — | *No hay vencimiento que avisar (BR-65). Avisos del trial: DP-30.* |
| BR-11 | Una compra sobre un evento finalizado se rechaza; el plan nuevo se contrata para un evento nuevo | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §2.1, `02` | **NO IMPLEMENTADO** (no hay «finalizado») | — | *No hay evento «finalizado» (BR-65).* |
| BR-12 | No hay renovación, extensión ni reactivación | DECIDIDO; **reformulada** (D-06, 2026-11-04) | `02d` §0 | **IMPLEMENTADO**: pago único, sin renovación ni extensión porque no hay vencimiento (BR-65) | U (`expiry`: «vencida no se reabre») | `PR` lista «renovar» como pendiente comercial: queda resuelto como «no hay» *Antes: «una publicación vencida no se reabre».* |
| BR-63 | **Trial de 14 días** desde que se crea la celebración (onboarding con los nombres de la pareja), sin tarjeta. No empieza al registrarse ni se reinicia por iniciar sesión, cambiar de dispositivo, editar, volver al panel ni cambiar la fecha de la boda. Fecha de inicio y vencimiento en el servidor | DECIDIDO (dueña, 2026-11-04, D-06) | `03` §4 D-06, [PAY-07](../../specs/PAY-07-trial-contratacion-permanencia/spec.md) | **IMPLEMENTADO** (`weddings.trial_started_at`, migración 8; `access()` en `service.ts`) | U (`trial-lifecycle`, `migration-8`) | Las celebraciones previas toman su fecha de creación (D-06) |
| BR-64 | **Pausa al vencer el trial sin contratar**: solo lectura (sin editar ni publicar), datos conservados, panel disponible para consultar, contratar sigue disponible; no se elimina nada automáticamente | DECIDIDO (dueña, 2026-11-04, D-06) | `03` §4 D-06, PAY-07 | **IMPLEMENTADO** (`403 trial_ended`; panel en solo lectura con aviso) | U (`trial-lifecycle`) · E2E | Plazo de conservación de un proyecto en pausa: PENDIENTE (DP-31). BR-45 suspendida |
| BR-65 | **Permanencia indefinida**: publicada, la celebración queda activa, pública y editable sin vencimiento; las funciones del plan siguen operativas; sin renovación ni cobro recurrente; la URL no cambia. No se promete disponibilidad absoluta ni SLA | DECIDIDO (dueña, 2026-11-04, D-06) | `03` §4 D-06, PAY-07 | **IMPLEMENTADO** (sin `410 site_expired` ni `publication_expired`; `expires_at` queda como historia) | U (`expiry` reescrita, `trial-lifecycle`, `plan-access`) | Reemplaza BR-03, BR-07 y la vigencia de 12 meses |

## B. Planes y funcionalidades

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-13 | **Dos planes acumulativos** (D-01, 2026-11-03): **Regalos ARS 95.000** y **Celebración ARS 140.000**, de **pago único**. Celebración incluye todo lo de Regalos. «Celebración Plus» (`completo`) dejó de ofrecerse; los datos guardados con ese id se leen como Celebración | DECIDIDO (dueña, 2026-11-03) | `03` §4 D-01, `plans.ts` | **IMPLEMENTADO** (`plans.ts`, `normalizePlanId`; verificado 2026-11-03) | U (`weda-logic`, `landing-plans`, `payments`) | Impuestos y facturación sin decidir (DP-17); «agradecimientos» sin definir (DP-27). *Antes: tres planes 95.000 / 140.000 / 150.000* |
| BR-14 | **El plan define qué se publica.** Regalos publica solo la lista de regalos; Celebración publica la lista y el micrositio completo. Lo que el plan no publica se conserva como borrador (nunca se borra al elegir o cambiar de plan). Lo que se puede **ver, editar u operar** en el panel lo fija BR-62 | DECIDIDO (D-01, D-02, 2026-11-03) | `03` §4, `plans.ts` | **IMPLEMENTADO** en la publicación (el snapshot se arma con el plan con derecho; RSVP y aportes públicos se rechazan si la publicación no los incluye). en el panel desde el 2026-11-04 (PAY-01): todo se edita con cualquier plan y lo bloqueado se ve | U (`weda-logic` planes, `publish-todo`, `wedding-flow`) | *Antes: «cada plan habilita solo sus funciones… y se oculta», también en el editor* |
| BR-15 | Cambio de Regalos a Celebración después de contratar | **PENDIENTE** (DP-23, registrada 2026-11-03) | `03` DP-23 | Cambio **bloqueado** desde el 2026-11-04 (PAY-01): el servidor responde `409 plan_change_pending` y ningún texto lo promete | U (`payments-flow`, `plan-access`) | *Antes figuraba como DECIDIDO («solo hacia uno más completo y pagando la diferencia; no cambia la vigencia»), con origen en `UX` y `PI`, no en una decisión de la dueña. La dueña pidió dejarla pendiente. Mientras tanto el cambio queda **bloqueado**, sin promesas ni cobros adicionales (D-05)* |
| BR-16 | Los precios y los planes los gestiona solo Weda desde una administración interna, con historial y sin cambios retroactivos | DECIDIDO (Q5) | `02` | **NO IMPLEMENTADO** (precios en el código; no hay administración) | — | |
| BR-17 | El monto de una orden lo calcula el servidor; el cliente no puede marcar «pagado» | DOCUMENTADO | `PI`, `BR` | **IMPLEMENTADO** | U (`payments-flow`, `wedding-flow`) | Solo con el adaptador de prueba |
| BR-18 | Cancelación y reembolso de planes | PENDIENTE (P26) | `02d`, `06` | **NO IMPLEMENTADO** | — | No se inventa política |

## C. Regalos, aportes y comprobantes

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-19 | **Los regalos son repetibles**: sin stock, sin bloqueo exclusivo, sin unicidad que lo impida | DECIDIDO (Q1) | `02` §5.1 | **IMPLEMENTADO** (2026-10-31, GIFT-08): sin chequeo de regalo tomado al regalar ni al volver a revisar; solo la idempotencia evita duplicados | U (`wedding-flow`, `gifts-repeatable`) | IC-03. `UX` §11 dice que se puede regalar dos veces: describe otra etapa |
| BR-20 | Dos modalidades: regalo de importe sugerido y aporte de importe libre | DECIDIDO (Q1) | `02` | **Implementada** (2026-11-05, GIFT-09): regalos con el importe publicado y aporte libre opcional, con mínimo; el importe distinto del sugerido en un regalo sigue fuera de alcance | `free-amount` | |
| BR-21 | Monedas ARS y USD, elegida por la pareja; todo importe lleva su moneda; sin conversión ni sumas entre monedas | DECIDIDO (Q3) | `02`, `05b` | **NO IMPLEMENTADO** (ARS implícito; sin columna de moneda) | — | |
| BR-22 | **Sin comprobante no hay regalo**: el comprobante viaja en el mismo envío; no se puede confirmar un aporte sin comprobante | DECIDIDO (dueña, 2026-10-28) | `UX`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | Puede reducir la conversión (F-13): hipótesis sin medir |
| BR-23 | El correo del invitado es obligatorio al regalar (constancia); la casilla de novedades es aparte y destildada | DECIDIDO | `UX`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-24 | Un aporte nace «pendiente de revisión»; solo la pareja dueña lo confirma o rechaza; el invitado no puede confirmar el suyo; transiciones `pendiente→confirmado/rechazado`, `confirmado→rechazado`, `rechazado→pendiente` | DOCUMENTADO («reglas propuestas, pendientes de confirmación comercial») | `BR`, código | **IMPLEMENTADO** (2026-10-31): API y botones del panel; volver a revisar solo depende de la transición (desde GIFT-08) | U (`wedding-flow`, `contribution-review`) | IC-08 resuelto. El modelo de la Fase 2 distingue más estados (revisado, reembolso…) |
| BR-25 | **Weda no arbitra ni verifica transferencias**; los informes dicen «confirmado manualmente», nunca «recibido» ni «acreditado» | DECIDIDO | `02d` §5.3, `02b` | **PARCIAL**: el servidor lo cumple («pendiente de revisión»); la interfaz dice «Aportes recibidos» y «Todavía no recibiste regalos» | — | IC-07 |
| BR-26 | Libro inmutable: las correcciones son movimientos nuevos relacionados; el comprobante no es la transacción | DECIDIDO (A5) | `02` | **NO IMPLEMENTADO** (estado mutable en `contributions`) | — | |
| BR-27 | La cantidad de aportantes solo se ve en el panel privado, nunca en lo público; no se exponen nombres ni importes públicamente | DECIDIDO (Q2) | `02` | **IMPLEMENTADO** (2026-10-31, con GIFT-08): la API pública devuelve solo el snapshot, sin ningún dato de aportes | U (`wedding-flow`) | |
| BR-28 | La tarjeta no está disponible hasta que exista un proveedor | DOCUMENTADO | `BR` | **IMPLEMENTADO** (501) | U | El plan «Regalos» promete «Alias y tarjeta» |
| BR-29 | El comprobante es privado: solo lo ve la pareja dueña | DOCUMENTADO | `BR`, `DP` | **IMPLEMENTADO** | U (`wedding-flow`) | |
| BR-30 | **Cambiar alias o datos bancarios**: solo el propietario, con contraseña reciente, confirmación explícita, auditoría, aviso al propietario y validación en el servidor; extras (confirmación fuera de banda, espera, TOTP) abiertos | DECIDIDO (Q4); extras PENDIENTES (P5) | `02` §5.4 | **IMPLEMENTADO el nivel base** (2026-10-31): clave en la misma operación al **cambiar** datos ya cargados (la primera carga no la pide: decisión de la dueña, 2026-11-06), confirmación con el destino anterior enmascarado, versiones en `payout_methods`, aviso por correo, límite de 3 cambios por día, validación en el servidor; extras (DP-01) pendientes | — | IC-04 |

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
| BR-40 | El evento finalizado aparece en la cuenta del propietario solo con información comercial y contractual (nombres, fecha de la boda, plan, fechas, órdenes y pagos, comprobantes de compra de Weda) | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §3.4 | **NO IMPLEMENTADO** | — | La conservación de cada categoría requiere validación *No hay cierre por tiempo (BR-65).* |
| BR-41 | La cuenta de la pareja es independiente del estado del evento | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §3.3 | **NO IMPLEMENTADO** (un evento por cuenta) | — | *No hay cierre por tiempo (BR-65).* |
| BR-62 | **Ver, editar contenido y operar.** *Ver* (recorrer una sección y entender cómo funciona) y *editar contenido* (textos, fotos, bloques, regalos de la lista: solo el borrador) no dependen del plan; ver DP-28 para el contenido del micrositio. *Operar* (acciones de gestión que crean o cambian datos reales) depende del **plan contratado** y de la **vigencia**: invitados (agregar, editar, importar, borrar), mesas y grupos (crear, asignar) y RSVP solo con **Celebración** vigente; lista de regalos, datos de cobro y aportes con **Regalos o Celebración** vigentes. Sin contratar no se opera nada. Las acciones bloqueadas se ven deshabilitadas y explican qué las desbloquea. **El servidor rechaza** la operación aunque se llame directo a la API; **la vista previa no escribe** | DECIDIDO (D-02, dueña, 2026-11-03) | `03` §4 D-02 | **IMPLEMENTADO** (2026-11-04, PAY-01): `access()` y `assertOperates()` en `service.ts`; el panel muestra lo bloqueado con `OperationNotice`; la vista previa no escribe | U (`plan-access`, `auth-isolation`, `weda-logic`) · E2E (`desktop/journeys`) | «Contratado» con orden pagada sin publicar: DP-25. Qué queda permitido al vencer: DP-24. Se construye en [PAY-01](../../specs/PAY-01-plan-alcance/spec.md) |

## F. Retención, eliminación y derechos

| ID | Regla | Aprobación | Documentos | Implementación actual | Pruebas | Inconsistencias o dudas |
|---|---|---|---|---|---|---|
| BR-42 | Tras el vencimiento, cada clase de dato sigue una política posterior al cierre; **no se asume eliminación inmediata ni conservación indefinida**; plazos sin definir | **SIN OBJETO** (D-06, 2026-11-04) | `02d` §6, `02b` | **NO IMPLEMENTADO** (no hay eliminación; limpieza omitida a propósito) | — | `privacidad.tsx` dice «mientras la cuenta esté activa» (IC-14) *No hay cierre por tiempo (BR-65).* |
| BR-43 | Lo financiero con obligación legal se conserva separado de los datos personales, sin borrado en cascada, con acceso restringido | DECIDIDO (principio); plazos y clasificación PENDIENTES (P6) | `02b`, `02d` | **CONTRADICE**: todas las tablas tienen `ON DELETE CASCADE` desde el casamiento (inactivo porque no existe borrado por API) | — | IC-15 |
| BR-44 | Los comprobantes de invitados no se asumen documentación contable; su tratamiento es PENDIENTE | PENDIENTE (P6, P30) | `02b`, `02d` | **NO IMPLEMENTADO** | — | |
| BR-45 | Borradores nunca contratados se eliminan por inactividad: cuenta sin evento 12 meses; evento sin contratación 6; onboarding incompleto 6; borrador avanzado 12; actividad = inicio de sesión o escritura efectiva | **SUSPENDIDA** (dueña, 2026-11-04, D-06) | `02d` §2.8 | **NO IMPLEMENTADO** | — | *Choca con la pausa del trial (BR-64: no se borra nada). Plazo de conservación de proyectos en pausa: DP-31.* |
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
| IMPLEMENTADO | 30 |
| PARCIAL | 6 |
| CONTRADICE (total o en parte) | 2 (BR-33, BR-43) |
| NO IMPLEMENTADO | 15 |
| REEMPLAZADA, SIN OBJETO o SUSPENDIDA | 12 (BR-03, 04, 05, 07, 08, 09, 10, 11, 40, 41, 42, 45) |
| **Total** | **65** |

*Recuento rehecho el 2026-11-04 sobre la columna «Implementación actual» de cada regla, después de PAY-07 (D-06). BR-15 cuenta como implementada en su bloqueo (D-05). Los recuentos anteriores (2026-10-31 y PAY-01) se reemplazan por este.*

Reglas decididas importantes que siguen sin implementar o contradichas (2026-11-04): BR-21, BR-26, BR-30 (en el nivel base sí), BR-31, BR-32, BR-37 y BR-39 (multiusuario y varios eventos, postergados por D-03), además de BR-33 y BR-43. BR-01 y la permanencia (BR-65) ya están construidas (PAY-07).
