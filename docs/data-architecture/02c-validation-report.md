# Weda · Arquitectura de datos · Fase 2 — Informe de validación final

Fecha: 2026-10-30. Validación del modelo contra las decisiones A1–A8 y Q1–Q8, contra las funcionalidades actuales y contra el backend.
Alcance: documentación. No se tocó código, esquema ni dependencias.

**86 entidades en 13 dominios**: 50 «Ahora», 22 «Preparar» y 14 «Después» (solo documentadas).

---

## 1. Validaciones automáticas sobre el catálogo

El generador comprueba el catálogo del que salen `02`, `03`, `03b` y `04` (si algo no cierra, lo informa). Chequeos fallidos: **0**.

| Validación (punto del pedido) | Resultado | Evidencia |
|---|:-:|---|
| 2. Sin entidades duplicadas | ✅ | 86 entidades con nombre único; relaciones repetidas: ninguna. |
| 3. Dependencias entre dominios sin ciclos | ✅ | Grafo acíclico entre los 13 dominios. |
| 3. Cardinalidades válidas | ✅ | Todas las relaciones usan una cardinalidad definida. `ContributionItem → Gift` es opcional (el aporte libre no tiene regalo) y muchos a uno. |
| 5. Nada impide regalos repetidos | ✅ | Muchos renglones pueden apuntar al mismo regalo; el catálogo declara «ninguna restricción de unicidad sobre el regalo» y no existe un estado «tomado». |
| 6. Toda entidad con importes declara su moneda | ✅ | Entidades con importes sin moneda: ninguna. |
| 7. Propiedad única | ✅ | El catálogo declara un propietario activo por casamiento, transferencia como única vía de cambio y que una invitación a colaborar no puede crear propietarios. |
| 8. Permisos financieros protegidos | ✅ | Destino del dinero y moneda de recepción: solo el propietario, con reautenticación, confirmación, auditoría y notificación (`PayoutMethodChange`). |
| 9. Publicaciones versionadas | ✅ | La revisión es inmutable y la publicación solo apunta a la vigente. |
| 10. Se puede anonimizar sin perder lo financiero | ✅ | El libro (`GiftTransaction`) y los registros de Weda de clases B1/B2 no contienen datos personales; los datos de personas viven en entidades de clase A. Entidades financieras que mencionan datos personales: ninguna. |
| 11. Ciclo de vida: una sola vigencia de 12 meses, sin renovación ni copia | ✅ | La suscripción nace activa al confirmarse el pago y publicarse (un único instante), dura 12 meses y no tiene estado de espera; vencida es terminal; el casamiento declara «finalizado»; la orden no admite renovación y ninguna relación permite copiar o renovar un evento. |
| 18. Historial de eventos cerrados: ficha comercial sin datos del evento | ✅ | La suscripción guarda una ficha comercial congelada; la cuenta muestra el evento finalizado sin acceso a sus datos. |
| 19. Comprobantes de compra de Weda distintos de los de invitados | ✅ | Los comprobantes de compra de Weda (Order, Payment, Invoice) y los de invitados (PaymentProof) son entidades y clases de retención distintas. |
| 14. Aceptación de la vigencia: evidencia versionada vinculada a la contratación | ✅ | La aceptación guarda usuario, casamiento y orden, fecha y hora, versión y evidencia; la orden no se confirma sin ella. |
| 15. Avisos idempotentes y sin asumir entrega | ✅ | El mensaje saliente tiene clave de idempotencia y distingue enviado de entregado. |
| 16. URL pública no disponible tras el vencimiento | ✅ | La publicación y la dirección declaran que el servidor responde «no disponible» y que la dirección no se reutiliza. |
| 17. Derechos de las personas separados del acceso comercial | ✅ | La solicitud de derechos no reactiva el evento ni habilita el panel. |
| 13. Sin estados del modelo anterior (recuerdo, ventana, acceso privado propio) | ✅ | El catálogo no contiene los estados que solo existían para el vencimiento a los 6 meses ni la ventana de 90 días. |
| 12. Lo financiero no afirma fondos recibidos | ✅ | El libro y el aporte declaran que Weda no verifica transferencias y usan «confirmado manualmente», no «recibido» ni «acreditado». |
| 2. Entidades sin relaciones (a revisar) | ✅ | Aisladas por diseño (referencias débiles o independientes): WeddingMonthlySnapshot, OutboxEvent, SecurityEvent, BackgroundJob, FeatureFlag, AggregateMetric, RetentionRun. |
| 10. Cada entidad tiene una clase de retención | ✅ | W: 18, A: 14, B1: 13, B2: 4, B3: 1, C: 7, D: 4, S: 14, U: 4, R: 7. |

Estas comprobaciones verifican la **coherencia interna** del catálogo (nombres, relaciones, declaraciones). No prueban que el modelo funcione al implementarse: eso se verifica en las Fases 5 y 6.

---

## 2. Las doce validaciones obligatorias

### 2.1 Las decisiones no se contradicen

| Par de decisiones | Tensión | Resolución en el modelo |
|---|---|---|
| Propietario único (A2) ↔ eliminación de cuenta (Q8) | El único propietario no puede borrarse y dejar la boda sin dueño. | La eliminación queda en «pendiente de propiedad» hasta transferir (`OwnershipTransfer`) o cerrar la boda. Nunca cero propietarios. |
| Libro inmutable (A5) ↔ derecho de supresión (Q8) | No se puede borrar un asiento, pero sí hay que borrar a la persona. | El libro no tiene datos personales; lo identificable vive en `Contribution` (clase A) y se anonimiza. |
| Regalos repetibles (Q1) ↔ «ya tomado» actual | El código marca regalos como tomados. | No existe estado «tomado»; se elimina esa lógica (ver 2.11). |
| Vigencia única de 12 meses (Q6) ↔ fecha del casamiento | Quien publica con mucha anticipación puede quedar con el evento vencido **antes de la boda**; no hay extensión ni límite de anticipación. | **Decisión cerrada (P2)**: el evento vence igual; debe explicarse antes de contratar (P23, P33). Riesgo comercial aceptado. |
| P13 (solo editable con el evento activo) ↔ armado previo a contratar | Antes de pagar no corre ningún plazo y se arma el sitio. | Decidido: crear un borrador, registrarse, completar el onboarding o iniciar el pago sin confirmación **no** inician el plazo; el borrador se edita; si nunca se contrata rige P19. |
| Pagar ↔ publicar | Antes eran pasos separados y dejaban un «pagado sin publicar». | **Resuelto:** pagar = activar + publicar en una sola operación; no hay estado ni plazo intermedio (P18 eliminada). El riesgo restante es técnico: una falla entre la confirmación y la publicación se reintenta de forma atómica e idempotente. |
| Libro inmutable ↔ «dinero recibido» | Weda no verifica transferencias. | El libro registra lo que la pareja confirmó; los informes no hablan de fondos recibidos. |
| Moneda por aporte (Q3) ↔ analítica (Q8-C) | Agregar importes mezcla monedas. | Las métricas agregan **por moneda**, nunca en total. |
| Seguridad del alias (Q4) ↔ cambio de moneda (Q3) | Cambiar moneda es cambiar el destino. | Es un cambio de `PayoutMethod` con las mismas reglas de `PayoutMethodChange`. |
| Marketing opcional (Q8-D) ↔ eliminación de datos del evento (Q8-A) | Eliminar al invitado podría borrar el consentimiento. | `CommunicationConsent` es independiente de `Guest`. |
| Edición compartida (A8) ↔ versiones inmutables | Dos personas editando. | Revisión por bloque con control de versión; el conflicto se informa, no se pisa. |

**Resultado:** no se encontraron contradicciones irresolubles. Dependen de asesoramiento P30, P6 y P26 (y P5, definición de seguridad); P34 es una propuesta adoptada pendiente de validar la conservación de cada categoría; P35 define los mínimos de publicación; y varias son de tipo «procedimiento a definir» (P10). Las inconsistencias resueltas con la vigencia única y con «pagar = activar + publicar» están en `02d-event-lifecycle-and-final-export.md` §9.

### 2.2 Entidades duplicadas o innecesarias

- **Sin duplicados** por nombre ni por función (chequeo automático).
- **Candidatas a fusionar** en el diseño físico (no se elimina el concepto): `RsvpSettings`/`GiftSettings` → columnas de `Wedding`; `ContributionEvent`/`RsvpResponseEvent` → historial común; `Feature`/`PlanFeature`.
- **Entidades «Más adelante»** (marketplace, `Coupon*`, `Invoice`, `Refund`, `CampaignSpend`, `AdCampaign`, `Review`, `ModerationCase`) están **documentadas, no modeladas físicamente**: se justifican por decisiones de producto previas, pero **no deben construirse** hasta que existan.
- **`PaymentIntent`** no tiene proveedor real; está en el modelo para la distinción Q1/A5 pero se difiere.
- **Riesgo de sobrediseño:** 16 tablas actuales frente a la cantidad del catálogo. Mitigado por etapas, pero es el riesgo principal (§5).

### 2.3 Relaciones y cardinalidades

Se revisó cada relación del diagrama detallado (`03b`). Las que más importan:

| Relación | Cardinalidad | Por qué |
|---|---|---|
| `Wedding` → `WeddingMember` | 1:N, **un** miembro con rol propietario activo | A2 |
| `Contribution` → `ContributionItem` → `Gift` | N:M a través del renglón; `Gift` opcional | Q1: varios aportes al mismo regalo; aporte libre sin regalo |
| `Contribution` → `GiftTransaction` | 1:N (confirmación, reversión, reembolso, corrección) | A5: correcciones como asientos nuevos |
| `PaymentProof` → `Contribution` | N:1, **separada** del asiento | A5 |
| `Invitation` → `Guest` | 1:N (grupo familiar) | A6 |
| `Invitation` → `InvitationAccess` | 1:N (renovaciones, revocaciones) | A6 |
| `Microsite` → `MicrositeBlock` → `MicrositeRevision` | 1:N; revisión inmutable | A8 |
| `Publication` → `MicrositeRevision` | N:1 (apunta a la vigente) | A8 |
| `Order` → `OrderLine` → `PlanPrice` | 1:N; el renglón copia el precio | Q5 |
| `Subscription` → `Order` | N:1 | Q6 |

Observaciones: `Guest → Invitation` es obligatoria (todo invitado pertenece a una invitación); el invitado «individual» es una invitación de un integrante. `EventInvitee` es la relación N:M entre invitados y momentos.

### 2.4 Soporta todas las funcionalidades actuales

| Funcionalidad actual | Entidades que la sostienen |
|---|---|
| Cuenta, inicio y cierre de sesión, recuperación de clave | `User`, `AuthIdentity`, `Session`, `AuthToken` |
| Onboarding y datos de la boda | `Wedding`, `EventMoment` |
| Editor del sitio, vista previa, galería, fotos | `Microsite`, `MicrositeBlock`, `GalleryItem`, `MediaAsset`, `Theme` |
| Publicación y dirección pública | `Publication`, `MicrositeRevision`, `PublicAddress` |
| Lista de regalos y aportes | `GiftCollection`, `Gift`, `GiftSettings`, `Contribution`, `ContributionItem` |
| Datos de cobro (alias/CBU) | `PayoutMethod`, `PayoutMethodChange` |
| **Vigencia única de 12 meses, evento finalizado y descargas durante la vigencia** (P13) | `Wedding` (estados operativo y de retención), `Subscription` (terminal), `Publication` (no disponible), `DataExportJob`, `RetentionRun`, `AuditLog` |
| **Pagar = activar + publicar en una sola operación; vigencia desde la confirmación** | `Order`, `Payment`, `Subscription` (nace activa), `Publication`, `Wedding` |
| **Aceptación expresa de la vigencia al contratar** (P33) | `TermsAcceptance`, `Order`, `Wedding` |
| **Avisos de vencimiento a 30, 7 y 1 día y fecha visible** (P23) | `OutboundMessage`, `MessageDeliveryEvent`, `Subscription`, `Wedding` |
| **Evento finalizado en la cuenta con historial comercial y contractual** (P34) | `Subscription` (ficha comercial), `Order`, `Payment`, `TermsAcceptance`, `Invoice` (documentada) |
| **Derechos de acceso, rectificación y supresión sobre eventos cerrados** (P32) | `DeletionRequest`, `AuditLog`, `StaffRole` |
| Aporte registrado, comprobante, revisado, confirmado manualmente, rechazado, reembolso o corrección | `Contribution`, `PaymentProof`, `ContributionEvent`, `GiftTransaction` |
| Comprobantes | `PaymentProof`, `MediaAsset` |
| Invitados, grupos, importación | `Guest`, `Invitation`, `GuestImport` |
| Confirmación (RSVP) | `RsvpSettings`, `RsvpResponse`, `RsvpResponseEvent`, `InvitationAccess` |
| Mesas | `SeatingTable` |
| Planes, órdenes y pagos | `Plan`, `PlanPrice`, `Order`, `OrderLine`, `Payment`, `Subscription` |
| Correos transaccionales | `OutboundMessage`, `MessageDeliveryEvent` |
| Consentimientos de marketing | `CommunicationConsent` |
| Analítica del embudo | `Visitor`, `VisitSession`, `ProductEvent` |

**Sin cobertura (aceptable, no existe hoy):** inicio de sesión con Google (`AuthIdentity` lo prevé), marketplace, cupones.

### 2.5 Las restricciones no impiden regalos repetidos

Cumple (chequeo automático #5). Se verifica en tres capas: (a) ninguna restricción de unicidad sobre el regalo en `ContributionItem`; (b) no hay contador de stock ni estado «tomado»; (c) cualquier cupo de un regalo sería informativo, no bloqueante. **Atención al implementar:** el código actual tiene lógica de «regalo tomado» (`gift_taken`, `takenGiftIds`) que se debe retirar en la misma etapa.

### 2.6 Las monedas están aisladas

Cada fila financiera lleva `currency`; una `Contribution`, `Order`, `Payment` o `PayoutMethod` tiene **una sola moneda**; el total de una boda se calcula **por moneda**; ninguna entidad guarda una conversión. Cambiar la moneda de recepción cuando existen aportes: los aportes anteriores **no se convierten ni se reetiquetan** y la nueva configuración rige hacia adelante; la pareja ve dos totales. La moneda **de visualización** (por ejemplo, mostrar el equivalente) es presentación y no se persiste como importe. **Falta decidir** el aviso a quien aporte con el enlace viejo (P-menor, Fase 4).

### 2.7 Propietario único

`WeddingMember` con rol propietario: **uno activo** (restricción única parcial + regla transaccional); `MemberInvite` no puede crear propietarios; `OwnershipTransfer` es la única vía (dos pasos, aceptación del destinatario, vencimiento, auditoría). Dos integrantes de la pareja no son dos propietarios: el segundo es administrador. El caso del propietario que desaparece es P10.

### 2.8 Permisos financieros protegidos

Solo el propietario cambia alias, banco y moneda de recepción; exige contraseña reciente, confirmación explícita, auditoría (quién, cuándo, valor anterior enmascarado), notificación al propietario y, recomendado, confirmación por correo. Las versiones del destino son inmutables, de modo que un cambio indebido se detecta y se revierte. Los permisos se verifican en el servidor (A3/A7). **Pendiente:** TOTP y espera cancelable (P5).

### 2.9 Publicaciones versionadas

Cada guardado de bloque crea una revisión inmutable; publicar apunta `Publication` a una revisión; republicar crea una nueva; restaurar = volver al borrador o republicar la anterior como revisión nueva. Los cambios simultáneos se detectan por versión y no se pisan en silencio. El historial de direcciones públicas permite redirigir enlaces viejos.

### 2.10 Anonimizar sin destruir lo financiero

Cumple (chequeo #10): el libro y los registros B1/B2 no contienen datos personales; las referencias apuntan a lápidas; los datos de personas viven en la clase A. Se conserva el **detalle financiero** y se pierde la **identidad del invitado**. **Límite honesto:** si un contador determina que el nombre de quien aportó es parte del respaldo requerido, ese dato debería migrar a una estructura B restringida; el modelo lo admite pero hoy no lo hace (P6).

### 2.11 Contradicciones con el backend actual

| # | Backend actual | Modelo | Impacto |
|---|---|---|---|
| 1 | `owner_id UNIQUE`: un casamiento por cuenta, sin colaboradores (R4) | Membresías y propietario único | Migración de la clave y de todo filtro por `userId` |
| 2 | Importes `INTEGER` en pesos sin moneda (R12) | Unidades menores + moneda | Migración con redondeo; decisión sobre si los pesos pasan a centavos |
| 3 | `gift_taken` / `takenGiftIds` en la capa de aplicación | Regalos repetibles sin estado | Retirar lógica y mensajes de «ya tomado» |
| 4 | RSVP por `name_key`, sobrescribe (R3) | Invitación con acceso hasheado | Cambio de flujo público |
| 5 | Publicación con PK `wedding_id`, sin historial (R13) | Revisiones y puntero | Nueva estructura |
| 6 | Borrador en `weddings.draft` (JSON) con alias y datos de cobro dentro | Extracción progresiva; cobro fuera | Migrar y **sanear** el alias del borrador |
| 7 | Cascadas de borrado de casamiento a aportes, órdenes y comprobantes | Lo financiero sobrevive (lápidas) | Revisar toda cascada antes de implementar la eliminación |
| 8 | Sin borrado de cuenta ni retención (R8) | `DeletionRequest`, `RetentionRun` | Nuevo |
| 9 | Precios en `plans.ts` (código) | `Plan`/`PlanPrice` en base, con administración interna | Prerrequisito: la administración (R17) no existe |
| 10 | Sesiones sin rotación ni lista (R9) | `Session` con reautenticación | Cambio en login |
| 11 | Analítica sin identidad (R14) | `Visitor`/`VisitSession`/`ProductEvent` | Fase 3 |
| 12 | Límites de uso en memoria (R6) | Necesarios para tokens y alias | Mover a almacenamiento persistente |
| 13 | El servidor bloquea **publicar** al vencer, pero **no bloquea editar**; no existe el estado «finalizado»; el vencimiento cuenta desde la primera publicación pero a los **6 meses**, y las páginas públicas, RSVP y regalos responden `410` | Una sola vigencia de **12 meses** desde que Weda confirma el pago y activa la publicación; evento **finalizado**: guardia de estado en toda escritura, vencimiento evaluado en cada pedido, acceso al panel cerrado para todos los roles | Cambio en el servicio de publicación, panel y API; constantes y textos de «6 meses» en `plans.ts`, landing, diálogo de publicar y Ayuda |
| 14 | `weddings.owner_id UNIQUE`: una cuenta, un casamiento | Una persona con varios casamientos (uno finalizado y uno nuevo, sin copia) | Cambio de esquema y de todo filtro por `userId` |
| 15 | No existe exportación de invitados, aportes ni comprobantes | Cuatro entregables **solo durante la vigencia** (se bloquean al vencer) | Funcionalidad nueva; el formato Excel requeriría decidir cómo generarlo (P25) |
| 16 | Hoy la página pública, el RSVP y los regalos devuelven `410` a los **6 meses** desde la primera publicación y el panel no se cierra | A los **12 meses** (no antes) la página no está disponible, el RSVP y los regalos públicos se deshabilitan y se cierra el panel para todos los roles | Cambio de la duración y del cierre; sin vista de recuerdo |
| 20 | Hoy no hay vista de cuenta con eventos cerrados y cada cuenta tiene un solo casamiento | El evento vencido aparece en la cuenta del propietario como «Finalizado» con solo información comercial y contractual (P34) | Funcionalidad nueva; ficha comercial en `Subscription` |
| 21 | Hoy el pago confirmado solo **habilita** el botón «Publicar mi página»: pagar y publicar son **dos acciones separadas** (el inicio cuenta desde la primera publicación manual) | **Pagar = activar + publicar**: al confirmarse el pago se activa la contratación y se publica automáticamente, en una operación atómica e idempotente; el inicio es el momento de la confirmación | Cambio en el flujo de pago y publicación; definir los mínimos de publicación (P35); sin estado «pagado y esperando publicación» |
| 22 | Hoy no hay política de borradores abandonados (R8 de la Fase 1) | P19 adoptada: eliminación escalonada por inactividad de lo nunca contratado (12, 6, 6 y 12 meses), con avisos recomendados | Sin implementar; el fundamento legal requiere validación |
| 17 | Hoy no existe constancia de aceptación de términos al contratar (la compra no registra aceptación) | `TermsAcceptance` vinculada a la orden y al casamiento, con versión, hash del texto y evidencia; la orden no se confirma sin ella (P33) | Funcionalidad nueva; requisito documentado, sin implementar; consideraciones legales en `02d` §1.3 |
| 18 | Hoy `mail_log` guarda `kind` y `ref` pero **sin restricción de unicidad** y con estados solo «enviado, omitido, fallido» (nunca «entregado»), y no hay avisos de vencimiento | Avisos a 30, 7 y 1 día (panel y correo) con clave de idempotencia y registro de estados; «enviado» distinto de «entregado» (P23) | Generalizar el registro de correos (`OutboundMessage`) y recibir estados del proveedor (`MessageDeliveryEvent`) |
| 19 | Hoy no hay procedimiento de derechos ni eliminación | Procedimiento de derechos separado del acceso comercial, también sobre eventos cerrados (P32) | Funcionalidad nueva; plazos legales sin definir |

### 2.12 Migración futura a PostgreSQL

El modelo es independiente del motor, pero conviene saber qué cambia respecto de SQLite:

| Tema | Con SQLite hoy | En PostgreSQL |
|---|---|---|
| Fechas | Texto ISO | `timestamptz`; decidir zona horaria de las fechas de boda (`date`) |
| JSON restante | Texto | `jsonb` con índices opcionales |
| Texto sin distinguir mayúsculas (correo) | Normalizado en la aplicación | `citext` o índice sobre `lower()` |
| Restricción única parcial (propietario único) | Soportada | Soportada |
| Superposición de vigencias de precio | Verificada en la aplicación | `EXCLUDE` con rangos |
| Inmutabilidad (libro, revisiones) | Por convención | Triggers o permisos de la base |
| Aislamiento por casamiento | Filtros y claves compuestas | Claves compuestas más seguridad a nivel de fila (opcional) |
| Concurrencia | Un solo escritor | Varios; revisar transacciones y bloqueos (propietario único, ledger) |
| Esquemas | Un solo archivo | Esquemas por dominio posibles; separar lo financiero |
| Tipado | Flexible | Estricto: datos existentes pueden fallar al migrar |
| Migraciones | `PRAGMA user_version` | Herramienta de migraciones versionada |
| Conexiones | Embebida | Pool de conexiones, especialmente en serverless |

**Conclusión:** adoptar el diseño sobre SQLite es viable para empezar; el problema del hosting (R1) es previo e independiente. Conviene que las claves y los tipos nuevos ya se definan pensando en PostgreSQL.

---

## 3. Decisiones que siguen pendientes

Son P1–P30 de `02-domain-model.md` §8: **cerradas P1, P13, P15, P17, P20 y P21**; las abiertas están en el mismo cuadro. **P2, P5 y P6 deben resolverse antes de la Fase 5.**

## 4. Riesgos técnicos

| Riesgo | Gravedad | Detalle |
|---|---|---|
| Sobrediseño y complejidad frente al tamaño actual | Alta | Mitigar con etapas y fusiones |
| Migración de importes y de invitados sin pérdida | Alta | Respaldos verificados primero (R2) |
| Hosting sin disco persistente (R1) | Alta | Bloquea todo lo que requiera datos reales |
| Inmutabilidad y propietario único requieren transacciones correctas | Media | Pruebas de concurrencia |
| Anonimización insuficiente (reidentificación) | Media | Umbral y pruebas |
| Aislamiento entre casamientos (A7) por error de filtro | Alta | Claves compuestas y pruebas automáticas |
| Tokens en URL (invitación, transferencia) se filtran por `Referer` o historial | Media | Hash, expiración, política de referencia |
| Integración de pagos reales sin verificador (R11) | Media | Diseñar con el proveedor elegido |

## 5. Riesgos legales que requieren asesoramiento

Ver `02b-retention-privacy-deletion.md` §12. En síntesis: plazos de conservación, clasificación contable del art. 328 CCyC, transferencias internacionales, inscripción de la base, plazos de respuesta a derechos, fundamento de la analítica, efectividad de la anonimización, comunicaciones comerciales, menores, defensa del consumidor. **Este informe no afirma cumplimiento de ninguna norma.**

## 6. Cambios estructurales necesarios a futuro

1. Base persistente con respaldos probados (hosting).
2. Lápidas y retiro de cascadas sobre lo financiero.
3. Importes en unidades menores con moneda.
4. Membresías y reescritura del filtrado por `userId`.
5. Retiro de «regalo tomado».
6. Invitaciones con acceso hasheado y cupo.
7. Extracción del borrador a bloques y revisiones.
8. Precios y planes en base con administración interna.
9. Persistencia de límites de uso.
10. Jobs de retención y exportación.

## 7. Orden de implementación recomendado

1. **Operación:** hosting con disco o base gestionada, respaldos y restauración verificados.
2. **Integridad:** lápidas, revisión de cascadas, saneamiento del alias en el borrador.
3. **Regalos y dinero:** moneda, unidades menores, libro, regalos repetibles, destino de cobro versionado.
4. **Invitaciones y RSVP** con cupo y acceso hasheado.
5. **Membresías** y propietario único.
6. **Administración interna y precios**; vigencia.
7. **Micrositio por bloques y publicación versionada.**
8. **Analítica, retención y eliminación** (Fases 3–4 del plan maestro).

Cada etapa debe poder revertirse y convivir con los datos existentes. No se inicia ninguna sin aprobación.
