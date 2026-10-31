# Weda · Inconsistencias, decisiones abiertas y riesgos (anexo 03)

Anexo del [Product Blueprint](00-product-blueprint.md). Ver también: [inventario](01-feature-inventory.md) · [reglas](02-business-rules-catalog.md) · [preparación comercial](04-mvp-readiness.md) · [roadmap](05-implementation-roadmap.md).

Este documento **registra; no cierra nada**. Toda decisión abierta sigue abierta. Las recomendaciones son propuestas para la dueña.

**Prioridad.** **Crítica**: impide cobrar o publicar con seguridad · **Alta**: la promesa del producto no coincide con el código · **Media**: confusión o riesgo acotado · **Baja**: higiene de documentación.

---

## 1. Registro de inconsistencias (IC)

| ID | Prio. | Problema | Impacto | Documentación afectada | Implementación afectada | Decisión necesaria |
|---|---|---|---|---|---|---|
| IC-01 | **Crítica** | **El pago y la publicación son dos acciones.** Tras pagar, la pareja debe tocar «Publicar mi página». La decisión es que pagar active y publique en una sola operación | Una pareja puede pagar y no publicar; el inicio de la vigencia depende de un clic; el plazo de 12 meses no se puede contar desde el pago | `ux-flows` (secciones antiguas), `payment-integration.md` (describe el flujo manual como bueno), `01-current-state.md` | `publish-dialog.tsx`, `panel.pago.tsx`, `service.ts` (`publish`, `settleOrder`) | Ninguna: está **decidido**. Falta definir P35 (mínimos de publicación) |
| IC-02 | **Crítica** | **Vigencia de 6 meses en todo el código y los textos**, contra la decisión de 12 meses desde la confirmación del pago | La landing, el diálogo de planes, los términos, la privacidad y el FAQ prometen 6 meses; el servidor aplica 6; la prueba `expiry` exige 6 | `plans.ts` (comentario), `ux-flows` («Publicación: 6 meses»), `PRODUCT.md` («1 año»), `production-readiness.md`, `terminos.tsx`, `privacidad.tsx` | `plans.ts` (`PUBLICATION_MONTHS = 6`), `payments.ts`, `service.ts`, `expiry.test.ts`, `landing-plans.tsx`, `publish-dialog.tsx`, `panel.tsx` | Ninguna: **decidido**. Antes de vender hay que alinear **todos** los textos y contratos con la cifra definitiva |
| IC-03 | Alta | **«Regalo tomado» vs. regalos repetibles (Q1).** El servidor rechaza con 409 un regalo que ya está en un aporte activo y la página muestra «Ya elegido». Las pruebas lo exigen | Contradice una decisión de diseño aprobada; en el uso real un regalo simbólico no debería agotarse | `02-domain-model.md` §5.1, `ux-flows` §11 (dice que se puede regalar dos veces) y `state-consistency.md` («`gift_taken`») | `service.ts` (`submitContribution`, `getPublicSite`), `gifts-page.tsx`, `public-api.ts`, `wedding-flow.test.ts` | Ninguna: **decidido**. Falta diseñar cómo ve la pareja varios aportes al mismo regalo |
| IC-04 | Alta | **Alias y datos bancarios sin los controles decididos (Q4)**: se editan como cualquier campo del borrador, sin contraseña reciente, confirmación, auditoría ni aviso; no hay versiones; el snapshot público los publica | Un acceso indebido a la cuenta cambia adónde van las transferencias de los invitados | `02-domain-model.md` §5.4, `datos-personales.md` | `panel.regalos.tsx` (`BankFields`), `draft.ts`, `site-model.tsx` | P5: definir los extras (confirmación fuera de banda, espera, TOTP). Los controles base ya están decididos |
| IC-05 | Alta | **El vencimiento no cierra el evento.** Al vencer solo se bloquea publicar y la página pública responde 410; la pareja sigue editando y gestionando | La regla «cierre definitivo para todos los roles» no existe | `02d` §3, `production-readiness.md` («una publicación vencida no se reabre y el contenido se conserva») | `service.ts` (`saveWedding`, `listContributions`, etc. no consultan la vigencia) | Ninguna: **decidido** |
| IC-06 | Alta | **Un evento por cuenta** (`weddings.owner_id UNIQUE`) contra «evento nuevo e independiente» y el historial en la cuenta | No se puede contratar un segundo evento ni conservar el primero como «Finalizado» | `02d` §3.3–§4, `02c` | `db.ts` (migración 1), `service.ts` (`weddingOf`, `ensureWedding`) | Ninguna: **decidido**. Es un cambio de esquema y de todo filtro por usuario |
| IC-07 | Media | **Vocabulario financiero.** La interfaz dice «Aportes recibidos» y «Todavía no recibiste regalos»; la regla es «Weda no verifica transferencias: pendiente / confirmado manualmente». Además el plan Regalos promete «Alias y **tarjeta**» y la tarjeta no existe | Se presenta como recibido lo que nadie verificó; se promete un medio inexistente | `plans.ts` (ítems del plan), `ux-flows` §5, landing | `panel.regalos.tsx`, `landing-plans.tsx`, `plans.ts` | Aprobar el texto definitivo; decidir si la tarjeta se promete mientras no exista (DP-20) |
| IC-08 | Alta | **El panel no puede confirmar ni rechazar aportes.** La API existe y está probada; no hay botones. El estado «confirmado» nunca se alcanza desde la interfaz | La pareja ve «A revisar» para siempre; el FAQ y las reglas suponen una revisión manual | `backend-readiness.md` §7 (lo daba por pendiente), `ux-flows` | `panel.regalos.tsx` | Ninguna: es trabajo de implementación (Fase 3 del roadmap) |
| IC-09 | Media | **El RSVP se identifica por nombre y sobrescribe.** Quien conozca el enlace puede responder por otra persona | Contradice «nunca sobrescribe por nombre» (A6); riesgo de suplantación | `01-current-state.md` R3, `02-domain-model.md` §5.2 | `service.ts` (`submitRsvp`) | Ninguna: **decidido** (enlaces personales); falta construirlo |
| IC-10 | Media | **Documentos originales desactualizados o contradictorios entre sí** (ver §1.1) | Quien lea solo un documento se lleva una idea falsa del producto | `README.md`, `PRODUCT.md`, `ux-flows.md`, `backend-readiness.md`, `e2e-coverage.md`, `frontend-production-readiness.md` | — | Autorizar su actualización (DP-21) |
| IC-11 | Media | **Precios y «pago único» inconsistentes** entre documentos: 95.000/140.000/150.000 en `plans.ts`; 180.000/320.000 y «1 año» en `PRODUCT.md`; `ux-flows` §3 dice «no se afirma pago único» | Riesgo de comunicar precios o condiciones que no son los vigentes | `PRODUCT.md`, `ux-flows` §3, `plans.ts` | `plans.ts` | Confirmar los precios definitivos y si incluyen impuestos (DP-17) |
| IC-12 | Baja | **Correo de quien confirma asistencia**: `ux-flows` dice obligatorio en el formulario; el servidor lo acepta como opcional (y hay prueba) | Duda sobre qué se le pide al invitado | `ux-flows` («Regalos y confirmación»), `datos-personales.md` | `service.ts` (`submitRsvp`), `rsvp-dialog.tsx` | Confirmar la regla (no verifiqué el formulario en un navegador) |
| IC-13 | Media | **Plazos de respuesta a derechos de los titulares**: `datos-personales.md` fija «10 días corridos» y «5 días hábiles»; `02b` dice que los plazos legales **no se definen** y requieren asesoramiento | Dos documentos dicen cosas opuestas; no hay validación legal | `datos-personales.md` §4, `02b` §7 y §12 | — | Validar con asesoramiento legal (P30/P32) |
| IC-14 | Media | **Las páginas legales en borrador contradicen la política decidida**: «datos del casamiento mientras la cuenta esté activa»; vigencia 6 meses; sin cierre del evento ni borrado por inactividad | Texto legal que no refleja el producto | `terminos.tsx`, `privacidad.tsx`, `02b` | `src/routes/terminos.tsx`, `privacidad.tsx` | Redacción legal definitiva (P30) |
| IC-15 | Alta | **El modelo conceptual (86 entidades, 13 dominios) no coincide con la base real (16 tablas)** (ver capítulo 5 del [documento principal](00-product-blueprint.md)). Faltan, entre otras: libro, invitaciones, membresías, suscripción, versiones, auditoría, retención. Todas las tablas del casamiento tienen `ON DELETE CASCADE` | Si se agrega una función de borrado antes de rediseñar, se destruirían registros financieros | `docs/data-architecture/` | `db.ts` | Ninguna: es el plan de implementación; el riesgo está en el orden |
| IC-16 | Media | **Inicio de la vigencia.** El servidor la calcula desde la **primera publicación manual**; la decisión la fija en la confirmación del pago. Hay publicaciones con `expires_at` ya calculado a 6 meses | Una migración tendría que decidir qué hacer con lo ya publicado | `02d` §1, `expiry.test.ts` | `service.ts`, `db.ts` (`expires_at`) | Definir cómo se trata lo publicado antes del cambio (hoy no hay clientes reales: NO VERIFICADO) |
| IC-17 | **Crítica** | **Publicar es gratis por defecto.** `WEDA_REQUIRE_PAID_ORDER` está apagado salvo que se active el proveedor de prueba; no hay proveedor real | Un despliegue sin esa configuración publica sin cobrar | `payment-integration.md`, `deployment-checklist.md` | `config.ts`, `service.ts` (`entitledPlan`) | Ninguna: debe quedar encendido y con proveedor real antes de vender |
| IC-18 | Media | **La analítica actual no es la decidida**: `funnel_events` sin identidad ni retención; `public_invitation_opened` cuenta cada recarga; las tres capas no existen | Los números actuales no sirven para embudos ni cohortes | `05-analytics-architecture.md`, `ux-flows` | `service.ts` (`track`), `db.ts` | Ninguna: primero hosting, integridad y dinero (decidido) |
| IC-19 | Media | **Testimonios.** `PRODUCT.md` los llama ficticios; `production-readiness.md` dice que se quitaron; la landing muestra hoy los cargados por la dueña (2026-10-29); el hallazgo F-10 sigue «pendiente» | Riesgo de publicidad engañosa si no son de clientes reales | `PRODUCT.md`, `findings.md`, `production-readiness.md` | `testimonials.ts`, landing | La dueña confirma autenticidad y permiso (DP-19) |
| IC-20 | Baja | **Ingreso con Google.** `findings.md` F-03 dice que se quitó el botón; hoy hay un botón que explica «todavía no está habilitado», decidido el 2026-10-29 | Documento histórico contradice el estado actual | `findings.md`, `ux-flows` | `crear.cuenta.tsx` | Ninguna (actualizar el hallazgo) |
| IC-21 | Baja | **Conteos de pruebas desactualizados** en documentos: 98 y 144 pruebas (vs. 195 hoy); resultados E2E de octubre | Falsa sensación de cobertura | `backend-readiness.md` §13, `e2e-coverage.md`, `test-results.md` | — | Reejecutar y registrar (las E2E **no se ejecutaron** en esta auditoría) |
| IC-22 | Alta | **Sin aceptación de condiciones al contratar.** El alta menciona «Términos de uso» en general; no existe la constancia versionada de las seis condiciones de vigencia | No hay evidencia de que la pareja supo la regla de 12 meses | `02d` §1.4 | `crear.cuenta.tsx`, `service.ts` | P33: aprobar la redacción de las cláusulas 1 y 2 |
| IC-23 | Media | **Estados de un aporte.** El código usa 3 (`pending_review`, `confirmed`, `rejected`); el modelo distingue «registrado», «comprobante cargado», «revisado», «confirmado manualmente», «rechazado» y «reembolso o corrección» | El informe final y el libro no se pueden construir sobre el estado actual | `02d` §5.3 | `db.ts`, `service.ts` | P22 (cerrada) define «revisado»; falta diseñar el paso del estado al libro |
| IC-24 | Media | **Aún no hay explicación previa de la vigencia.** La decisión exige explicarla antes de contratar y avisar a 30/7/1 días; hoy no hay ni lo uno ni lo otro | Pérdida de acceso sorpresiva a los 12 meses | `02d` §1.3–§1.5 | landing, `publish-dialog.tsx` | P23 (cerrada): faltan plantillas y momentos de envío |

### 1.1 Documentos originales que describen un estado que ya no es el actual

No se modificaron (la tarea lo prohíbe). Se recomienda actualizarlos tras aprobar el [roadmap](05-implementation-roadmap.md).

| Documento | Qué dice y ya no es cierto |
|---|---|
| `README.md` | «Prototipo de frontend sin backend», «sin cuentas, pagos, publicación ni correos», datos solo en `localStorage` |
| `PRODUCT.md` | «Demo sin backend», plan «1 año», precios 180.000/320.000, «No hay integración…» |
| `docs/ux-flows.md` | Encabezado, §1, §9, §10 y §11 («sin backend», «no hay cuentas», «simulación»); luego secciones posteriores que ya hablan de cuentas reales: el documento **se contradice a sí mismo** |
| `docs/backend-readiness.md` (2026-10-26) | Aportes del panel «pendiente»; recuperación de clave «pendiente»; vencimiento «no se aplica»; 144 pruebas |
| `docs/e2e-coverage.md` (2026-10-23) | 98 pruebas; «publicación simulada» |
| `docs/frontend-production-readiness.md` | Estado previo al backend (no verificado línea por línea) |
| `docs/auditoria-ux-conversion/findings.md` | F-03 (Google), F-06/F-12 ya resueltos parcialmente |

Estos documentos son **históricos con fecha** en su mayoría; el problema es que nada en ellos lo indica de forma visible.

---

## 2. Decisiones abiertas (DP)

Todas **siguen abiertas**. «Quién valida» indica quién debería aportar el criterio; **decide la dueña**.

| ID | Decisión | Origen | Por qué importa | Parte del producto bloqueada | Quién valida | Qué no hacer hasta resolverla |
|---|---|---|---|---|---|---|
| DP-01 | Seguridad extra del cambio de alias: confirmación fuera de banda, espera cancelable, TOTP (P5) | `02`, `06` | Un cambio indebido desvía las transferencias | Flujo de cambio de alias, segundo factor del propietario | Dueña con asesoramiento de seguridad | Pantalla o endpoint de cambio de datos bancarios nuevos |
| DP-02 | Qué documentos son respaldo contable y sus plazos; los comprobantes de invitados **no se asumen** contables (P6) | `02b`, `06` | Define qué debe conservarse y por cuánto | Retención de lo financiero y de comprobantes; factura de Weda | Contador, con abogado | Eliminar o archivar registros financieros; fijar plazos |
| DP-03 | Política de cancelación y reembolso de planes (P26) | `06` | Sin ella no se puede cobrar con responsabilidad | Cobros reales, estado «cancelada», reembolsos | Abogado y contador | Cobros reales; reembolsos o cancelaciones automáticas |
| DP-04 | Tratamiento posterior al cierre de cada clase de dato, incluida la ficha comercial (P30, P7, P34) | `02d` §6, `06` | Minimización frente a obligaciones | Depuración, eliminación de borradores por inactividad, historial de la cuenta | Asesor legal en protección de datos y contador | Cualquier eliminación o anonimización automática; plazos en el código |
| DP-05 | Requisitos mínimos para publicar automáticamente (P35) | `02d` §10.4 | La publicación no puede fallar tras un pago ni bloquearse por secciones opcionales | Publicación automática al confirmar el pago | Dueña (producto) y seguridad | Publicación automática |
| DP-06 | Redacción definitiva de las seis condiciones de vigencia; las cláusulas 1 y 2 se ajustaron a «pagar = activar + publicar» (P33) | `02d` §1.4 | Constancia de lo que la pareja aceptó | Confirmación de la contratación | Dueña y abogado | Confirmar contrataciones sin la aceptación |
| DP-07 | Fundamento legal de eliminar por inactividad y avisos previos (P19) | `02d` §2.8 | Eliminar datos de personas necesita base | Limpieza automática de borradores | Asesor legal | Trabajos de eliminación o avisos de inactividad |
| DP-08 | Detalle de los avisos: hora de envío, plantillas, reintentos; si se envía un correo al activar (P23) | `02d` §1.5 | Experiencia y evidencia | Avisos de vencimiento | Dueña | — (se resuelve al implementar) |
| DP-09 | Exportaciones: cómo generar Excel sin nueva dependencia, tope del ZIP, vida de los archivos (P25) | `02d` §5.4 | Es la única forma de salvar los datos antes del cierre | Descargas finales | Dueña y técnica | Agregar dependencias sin decidirlo |
| DP-10 | Precio de un plan nuevo para quien ya tuvo un evento; planes en USD (P3, P4) | `02`, `06` | Modelo comercial | Recontratación, órdenes en USD | Dueña | Cambiar `plans.ts` o la moneda |
| DP-11 | Política de celdas pequeñas y evaluación de riesgo de las métricas (P8) | `05` §7 | Reidentificación | Conservar agregados sin vencimiento | Asesor legal / estadístico | Publicar o conservar métricas históricas |
| DP-12 | Plazos de gracia al eliminar, propietario ausente, si el cupo incluye al invitado (P9, P10, P12) | `02` §8 | Cierra procedimientos | Eliminación de cuentas, invitaciones con cupo | Dueña | — |
| DP-13 | Base y consentimiento de la analítica del navegador; unir visita con registro (P14, P16) | `05` | Privacidad | Eventos del navegador | Asesor legal | Encender eventos del navegador |
| DP-14 | **Hosting y base de datos de producción** (disco persistente o base administrada) | `backend-readiness.md` §11.1; `deployment-checklist.md` | Sin disco persistente se pierden datos; es el prerrequisito de todo lo demás | Todo lo productivo | Dueña y técnica | Desplegar; vender |
| DP-15 | **Proveedor de pagos**, medios aceptados, impuestos y facturación | `payment-integration.md` | Sin cobro no hay negocio | Cobro real y activación | Dueña, contador | Habilitar pagos reales sin verificador |
| DP-16 | Indexar o no las invitaciones públicas (hoy `noindex`) y si habrá búsqueda pública | `backend-readiness.md` §11.7; `production-readiness.md` | Privacidad de las parejas e invitados | SEO de invitaciones, `/encontrar` | Dueña, asesor legal | Quitar `noindex` |
| DP-17 | Confirmar precios definitivos, «pago único» y si incluyen impuestos | IC-11 | Coherencia comercial | Landing, términos, factura | Dueña, contador | — |
| DP-18 | Medio «tarjeta» y Mercado Pago como medio de regalo | `plans.ts`, `payment-integration.md` | El plan lo promete | Regalos con tarjeta | Dueña | Prometerlo en textos |
| DP-19 | Autenticidad y permiso de los testimonios | F-10 | Publicidad engañosa | Landing | Dueña | Publicar testimonios sin respaldo |
| DP-20 | Si la tarjeta se menciona en el plan «Regalos» mientras no exista | IC-07 | Promesa vs. realidad | Landing y planes | Dueña | — |
| DP-21 | Autorizar la actualización de los documentos originales listados en §1.1 | IC-10 | Evitar lecturas falsas | Documentación | Dueña | — |
| DP-22 | Si el envío de invitaciones (correo o WhatsApp) forma parte del producto | GST-10 | Hoy la pareja comparte el enlace por su cuenta; el modelo habla de invitaciones con enlace personal | Invitaciones | Dueña | — |

---

## 3. Riesgos (RK)

Probabilidad e impacto son **juicio de esta auditoría**, no mediciones.

| ID | Riesgo | Evidencia | Prob. | Impacto | Mitigación | Fase del roadmap |
|---|---|---|---|---|---|---|
| RK-01 | **Pérdida de datos por hosting sin disco persistente o sin respaldos probados** | No hay hosting definido; Vercel no sirve; sin backups (`deployment-checklist.md`) | Alta | **Crítico** | Decidir DP-14; volumen persistente; respaldo diario de `weda.db`, `receipts/` y `media/`; restauración probada | R1 |
| RK-02 | **Cobro real inexistente**: publicar sin pagar | `WEDA_REQUIRE_PAID_ORDER` apagado; solo adaptador de prueba | Alta | **Crítico** | Proveedor real con verificación de firma; compuerta siempre encendida | R2 |
| RK-03 | **Pagos reales sin verificador** y sin política de reembolsos | `PI`; el webhook real responde 501 | Alta | **Crítico** | Adaptador verificado, conciliación, P26 antes de cobrar | R2 |
| RK-04 | **Promesa incumplida de la vigencia**: textos y servidor dicen 6 meses; la decisión es 12; pago y publicación separados | IC-01, IC-02 | Alta | Alto | Alinear textos, servidor y contratos antes de vender | R2 |
| RK-05 | **Integridad financiera**: estado de aporte mutable, sin libro, importes sin moneda, `ON DELETE CASCADE` | `db.ts`; IC-15 | Media | Alto | Libro inmutable, moneda explícita, restricciones de borrado antes de cualquier función de eliminación | R3 |
| RK-06 | **Alias sin controles** | IC-04 | Media | Alto | Reautenticación, auditoría, versionado | R3 |
| RK-07 | **Suplantación en RSVP** y spam público | IC-09; límites solo en memoria | Media | Medio | Enlaces personales con token hasheado; límites persistentes | R4 |
| RK-08 | **Privacidad y legal en borrador**: términos y privacidad sin revisión; AAIP sin inscribir; plazos de derechos contradictorios | `PR`, `DP`, IC-13/14 | Alta | Alto | Revisión legal; inscripción; procedimiento de derechos | R0, R6 |
| RK-09 | **Correo real nunca probado**: sin él no hay constancia ni recuperación de clave | `PR` («No salen correos») | Alta | Alto | Configurar Resend y DNS; prueba de punta a punta | R1 |
| RK-10 | **Concurrencia en operaciones críticas**: un solo proceso con SQLite; límites en memoria; `X-Forwarded-For` falseable | `BR` §9–§10 | Media | Medio | Un solo proceso con proxy de confianza; transacciones; mover límites a almacenamiento persistente al escalar | R1, R8 |
| RK-11 | **Migración de importes e invitados** hacia el modelo decidido sin pérdida | IC-15 | Media | Alto | Respaldo verificado, migraciones reversibles, pruebas de datos reales | R3, R4 |
| RK-12 | **Pérdida de acceso del cliente al vencer** sin haber descargado (no hay descargas ni avisos) | BR-07, BR-10 | Alta (a los 12 meses) | Alto | Exportaciones y avisos **antes** del primer vencimiento | R5 |
| RK-13 | **Aislamiento entre eventos al agregar membresías y eventos múltiples** | `owner_id UNIQUE` hoy simplifica | Media | Alto | Reescribir y reprobar todas las pruebas de aislamiento | R5 |
| RK-14 | **`node:sqlite` experimental** y requisito de Node 22.5 | `BR` §1 | Baja–Media | Medio | Fijar versión; evaluar alternativa estable al elegir hosting | R1 |
| RK-15 | **Fotos limitadas a 6 MB por guardado** | `BR` §8, `PR` | Media | Medio | Subida directa de fotos | R7 |
| RK-16 | **Pruebas de navegador no verificadas hoy** y sin pruebas con personas | E2E no ejecutadas; F-14 | Media | Medio | Reejecutar y registrar; pruebas con personas | R0 |
| RK-17 | **Anonimización efectiva** de lo que se conserve | `05` §7 | Media | Alto | Evaluación de riesgo antes de conservar agregados | R8 |
| RK-18 | **Tokens en URLs** (comprobante, baja, invitaciones futuras) | `comprobante.tsx`, `unsubscribe` | Baja–Media | Medio | Hash, expiración y política de referencia | R4 |

### Los cinco riesgos más importantes (para la dueña)

1. **RK-01** — No hay dónde alojar ni respaldar el producto.
2. **RK-02 / RK-03** — No se puede cobrar de verdad ni conciliar un pago real.
3. **RK-04** — Lo que se promete (6 meses, publicación manual) no es lo decidido (12 meses, pagar = publicar).
4. **RK-05 / RK-06** — El dinero de los regalos y el alias no tienen las protecciones decididas.
5. **RK-08** — Las condiciones legales y de privacidad no están revisadas.
