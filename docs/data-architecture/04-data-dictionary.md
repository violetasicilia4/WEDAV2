# Weda · Arquitectura de datos · Fase 2 — Diccionario de datos conceptual

Fecha: 2026-10-30 (revisión con las decisiones definitivas A1–A8 y Q1–Q8). Documento generado a partir de un único catálogo de entidades y relaciones (las mismas que dibujan `03-entity-relationship.*` y `03b-entity-relationship-detail.*`), así que los tres no pueden contradecirse.

**Es conceptual.** No define tablas, tipos, índices ni migraciones: eso es la Fase 5. «Contiene» enumera la información que la entidad debe poder representar, no columnas.

## Cómo leerlo

| Horizonte | Significa |
|---|---|
| **Ahora** | Se necesita para cumplir las decisiones D1–D5 o para lo que el producto ya hace. Entra al diseño físico. |
| **Preparar** | Se define su forma y sus relaciones hoy para que cuando llegue la función no haya que reescribir; se construye cuando exista la necesidad. |
| **Después** | Solo documentado, para no cerrar puertas. No se modela físicamente. |

Sensibilidad: **Pública** (la ve un invitado o internet) · **Mixta** (según el archivo) · **Operativa** · **PII** (datos personales) · **Financiera** · **Secreto** (credenciales y tokens: solo hash o cifrado) · **Pseudónimo** (identificador sin nombre).

## Resumen

**86 entidades en 13 dominios:** 50 ahora · 22 preparar · 14 después.

| Dominio | Ahora | Preparar | Después | Para qué existe |
|---|---:|---:|---:|---|
| **Identidad y acceso** | 5 | 0 | 0 | Quién es la persona y cómo prueba que lo es. Credenciales, sesiones y tokens de un solo uso. |
| **Casamientos y membresías** | 4 | 1 | 0 | El casamiento como raíz de aislamiento, quién lo administra y sus momentos. |
| **Micrositio y publicación** | 6 | 1 | 1 | Lo que se edita (borrador), lo que se publica (revisiones inmutables) y dónde se encuentra (direcciones). |
| **Archivos** | 1 | 0 | 0 | Metadatos y reglas de los archivos; los binarios viven fuera de las tablas. |
| **Regalos y aportes** | 9 | 3 | 0 | El dinero de los regalos: de la pareja hacia ella. Weda no pasa por ese dinero. |
| **Invitados y RSVP** | 7 | 3 | 0 | Personas invitadas, invitaciones personales, respuestas y mesas. |
| **Planes y facturación Weda** | 8 | 2 | 2 | Lo que la pareja le compra a Weda: planes, precios, contrataciones, órdenes y pagos. |
| **Adquisición y marketing** | 0 | 5 | 2 | Visitantes, campañas, leads y atribución, antes de que exista una cuenta. |
| **Analítica de producto** | 2 | 2 | 0 | Eventos de comportamiento y de negocio, separados de los datos transaccionales. |
| **Mensajería** | 1 | 2 | 0 | Todo lo que Weda envía a una persona y su estado de entrega. |
| **Privacidad y consentimiento** | 4 | 0 | 0 | Consentimientos, aceptaciones legales y derechos de las personas sobre sus datos. |
| **Plataforma y auditoría** | 3 | 3 | 1 | Auditoría, seguridad, personal interno e integraciones con proveedores externos. |
| **Marketplace (futuro)** | 0 | 0 | 8 | Proveedores de servicios y publicidad. Solo documentado. |

Clases de retención (Q8; **propuesta a validar**, no conclusión legal):

| Clase | Qué es | Plazo propuesto |
|---|---|---|
| `W` | Contenido de la pareja | Mientras exista la cuenta o el casamiento; al eliminar queda una lápida sin nombres. |
| `A` | Datos personales y operativos (categoría A) | Mientras opera el evento (12 meses desde que se confirma el pago y se activa); después, según la política posterior al cierre (plazos por clase a validar con asesoramiento; se elimina o anonimiza de forma efectiva). |
| `B1` | Registros financieros y contractuales de Weda (categoría B) | Según obligaciones contables y fiscales de Weda; candidato 10 años (art. 328 CCyC), a validar con asesoramiento contable. |
| `B2` | Registro financiero de los regalos (categoría B) | Libro inmutable sin datos personales, separado de lo operativo; plazo a validar (no es contabilidad de Weda). |
| `B3` | Evidencia operativa de pagos (categorías A/B) | Comprobantes de invitados: descargables durante la vigencia; luego según la política posterior al cierre (a validar), salvo disputa o que se determine que son respaldo contable; a clasificar. |
| `C` | Analítica de producto (categoría C) | Eventos seudónimos 13 meses; fotografía mensual por casamiento 25 meses; luego solo métricas agregadas que superaron la evaluación de riesgo. |
| `D` | Comercial y marketing (categoría D) | Mientras haya consentimiento vigente; se elimina o se bloquea al revocarlo. |
| `S` | Seguridad, auditoría y operación | Plazos propios y cortos para registros técnicos; auditoría financiera y de administración según su categoría. |
| `U` | Cuenta | Mientras exista la cuenta; al eliminarla queda una lápida anonimizada. |
| `R` | Referencia y configuración | Sin datos personales; sin plazo. |

## Índice

| Entidad | Dominio | Horizonte | Retención | Reemplaza o proviene de |
|---|---|---|---|---|
| `User` | Identidad y acceso | Ahora | `U` | users (parcial) |
| `AuthIdentity` | Identidad y acceso | Ahora | `U` | users.password_hash (parcial) |
| `Session` | Identidad y acceso | Ahora | `S` | sessions |
| `AuthToken` | Identidad y acceso | Ahora | `S` | password_resets (generaliza) |
| `MfaFactor` | Identidad y acceso | Ahora | `U` | — |
| `Wedding` | Casamientos y membresías | Ahora | `W` | weddings (parcial) + weddings.draft (datos básicos) |
| `WeddingMember` | Casamientos y membresías | Ahora | `W` | weddings.owner_id (reemplaza) |
| `OwnershipTransfer` | Casamientos y membresías | Ahora | `S` | — |
| `MemberInvite` | Casamientos y membresías | Preparar | `S` | — |
| `EventMoment` | Casamientos y membresías | Ahora | `W` | weddings.draft → site.events |
| `Microsite` | Micrositio y publicación | Ahora | `W` | weddings.draft → site (configuración general) |
| `MicrositeBlock` | Micrositio y publicación | Ahora | `W` | weddings.draft → site.* (cada sección) |
| `GalleryItem` | Micrositio y publicación | Ahora | `W` | weddings.draft → site.gallery.photos |
| `MicrositeRevision` | Micrositio y publicación | Ahora | `W` | publications.snapshot (generaliza) |
| `Publication` | Micrositio y publicación | Ahora | `W` | publications (estado) |
| `PublicAddress` | Micrositio y publicación | Ahora | `W` | weddings.slug (reemplaza) |
| `Theme` | Micrositio y publicación | Preparar | `R` | — |
| `CustomDomain` | Micrositio y publicación | Después | `W` | — |
| `MediaAsset` | Archivos | Ahora | `W` | archivos en disco (media/, receipts/) sin metadatos |
| `GiftCollection` | Regalos y aportes | Preparar | `R` | catalog.ts (código) |
| `GiftCatalogItem` | Regalos y aportes | Preparar | `R` | catalog.ts (código) |
| `Gift` | Regalos y aportes | Ahora | `W` | weddings.draft → gifts.items |
| `GiftSettings` | Regalos y aportes | Ahora | `W` | weddings.draft → gifts (preferencias) |
| `PayoutMethod` | Regalos y aportes | Ahora | `B2` | weddings.draft → gifts.alias/bank/cbu/acceptCard |
| `PayoutMethodChange` | Regalos y aportes | Ahora | `B2` | — |
| `Contribution` | Regalos y aportes | Ahora | `A` | contributions |
| `ContributionItem` | Regalos y aportes | Ahora | `A` | contribution_items |
| `ContributionEvent` | Regalos y aportes | Ahora | `A` | contribution_events |
| `PaymentProof` | Regalos y aportes | Ahora | `B3` | receipts |
| `GiftTransaction` | Regalos y aportes | Ahora | `B2` | — |
| `PaymentIntent` | Regalos y aportes | Preparar | `B2` | — |
| `Guest` | Invitados y RSVP | Ahora | `A` | guests (parcial) |
| `Invitation` | Invitados y RSVP | Ahora | `A` | — |
| `InvitationAccess` | Invitados y RSVP | Ahora | `A` | — |
| `InvitationDelivery` | Invitados y RSVP | Preparar | `A` | — |
| `RsvpSettings` | Invitados y RSVP | Ahora | `W` | weddings.draft → site.rsvp |
| `RsvpResponse` | Invitados y RSVP | Ahora | `A` | guests.status / guests.menu |
| `RsvpResponseEvent` | Invitados y RSVP | Ahora | `A` | rsvp_events |
| `SeatingTable` | Invitados y RSVP | Ahora | `A` | weddings.draft → groups |
| `GuestImport` | Invitados y RSVP | Preparar | `A` | — |
| `EventInvitee` | Invitados y RSVP | Preparar | `A` | — |
| `Plan` | Planes y facturación Weda | Ahora | `R` | plans.ts (código) |
| `PlanPrice` | Planes y facturación Weda | Ahora | `B1` | plans.ts (código) |
| `Feature` | Planes y facturación Weda | Ahora | `R` | plans.ts (features) |
| `PlanFeature` | Planes y facturación Weda | Ahora | `R` | plans.ts (features) |
| `Subscription` | Planes y facturación Weda | Ahora | `B1` | publications (plan y vencimiento) |
| `Order` | Planes y facturación Weda | Ahora | `B1` | orders |
| `OrderLine` | Planes y facturación Weda | Ahora | `B1` | orders (plan_id, amount) |
| `Payment` | Planes y facturación Weda | Ahora | `B1` | orders (provider, provider_ref) |
| `Coupon` | Planes y facturación Weda | Preparar | `B1` | — |
| `CouponRedemption` | Planes y facturación Weda | Preparar | `B1` | — |
| `Invoice` | Planes y facturación Weda | Después | `B1` | — |
| `Refund` | Planes y facturación Weda | Después | `B1` | — |
| `Visitor` | Adquisición y marketing | Preparar | `C` | — |
| `VisitSession` | Adquisición y marketing | Preparar | `C` | — |
| `Campaign` | Adquisición y marketing | Preparar | `C` | — |
| `Lead` | Adquisición y marketing | Preparar | `D` | — |
| `IdentityLink` | Adquisición y marketing | Preparar | `D` | — |
| `CampaignSpend` | Adquisición y marketing | Después | `B1` | — |
| `ReferralCode` | Adquisición y marketing | Después | `D` | — |
| `ProductEvent` | Analítica de producto | Ahora | `C` | funnel_events |
| `WeddingMonthlySnapshot` | Analítica de producto | Preparar | `C` | — |
| `OutboxEvent` | Analítica de producto | Preparar | `C` | — |
| `OutboundMessage` | Mensajería | Ahora | `S` | mail_log |
| `MessageDeliveryEvent` | Mensajería | Preparar | `S` | — |
| `NotificationPreference` | Mensajería | Preparar | `U` | — |
| `CommunicationConsent` | Privacidad y consentimiento | Ahora | `D` | marketing_consents |
| `TermsAcceptance` | Privacidad y consentimiento | Ahora | `B1` | — |
| `DeletionRequest` | Privacidad y consentimiento | Ahora | `S` | — |
| `DataExportJob` | Privacidad y consentimiento | Ahora | `S` | — |
| `AuditLog` | Plataforma y auditoría | Ahora | `S` | — |
| `SecurityEvent` | Plataforma y auditoría | Preparar | `S` | — |
| `StaffRole` | Plataforma y auditoría | Ahora | `S` | — |
| `ProviderEvent` | Plataforma y auditoría | Ahora | `B1` | payment_events (generaliza) |
| `BackgroundJob` | Plataforma y auditoría | Preparar | `S` | — |
| `FeatureFlag` | Plataforma y auditoría | Después | `R` | — |
| `Vendor` | Marketplace (futuro) | Después | `W` | — |
| `VendorMember` | Marketplace (futuro) | Después | `W` | — |
| `VendorProfile` | Marketplace (futuro) | Después | `W` | — |
| `VendorService` | Marketplace (futuro) | Después | `W` | — |
| `Inquiry` | Marketplace (futuro) | Después | `A` | — |
| `Review` | Marketplace (futuro) | Después | `A` | — |
| `ModerationCase` | Marketplace (futuro) | Después | `S` | — |
| `AdCampaign` | Marketplace (futuro) | Después | `B1` | — |
| `AggregateMetric` | Analítica de producto | Ahora | `C` | — |
| `RetentionRun` | Plataforma y auditoría | Preparar | `S` | — |

---

## Identidad y acceso

Quién es la persona y cómo prueba que lo es. Credenciales, sesiones y tokens de un solo uso.

### User

*Ahora* · sensibilidad **PII** · proviene de: users (parcial)

- **Qué representa:** Una persona con acceso al panel de Weda. Es una identidad global: no pertenece a un casamiento ni a un tipo de cliente.
- **Clase de retención:** `U` — Cuenta
- **Contiene (conceptualmente):** nombre visible, correo principal (único, sin distinguir mayúsculas) y si está verificado, estado (activo, suspendido, eliminación solicitada, anonimizado), idioma y zona horaria preferidos, fechas de alta y último acceso.
- **Por qué es una entidad aparte:** Separa a la persona de su credencial. Una misma persona puede ser propietaria de una boda y colaboradora de otra, y a futuro administrar un proveedor. Al eliminar la cuenta la fila no se borra: queda como «lápida» anonimizada para no romper referencias de registros que deben conservarse.
- **Relaciones:**
  - **se autentica con** → `AuthIdentity` (uno a muchos)
  - **abre** → `Session` (uno a muchos)
  - **recibe** → `AuthToken` (uno a muchos)
  - **protege con** → `MfaFactor` (uno a muchos)
  - **participa como** → `WeddingMember` (uno a muchos)
  - **queda vinculado en** → `IdentityLink` (uno a muchos)
  - **prefiere** → `NotificationPreference` (uno a muchos)
  - **acepta** → `TermsAcceptance` (uno a muchos)
  - **solicita** → `DeletionRequest` (uno a muchos)
  - **es referida por** `AuditLog` (muchos a cero o uno (opcional); «realizada por»)
  - **es personal de Weda** → `StaffRole` (uno a cero o uno)
  - **participa en** → `VendorMember` (uno a muchos)

### AuthIdentity

*Ahora* · sensibilidad **Secreto** · proviene de: users.password_hash (parcial)

- **Qué representa:** Una forma de ingresar de un usuario: correo y clave hoy, Google mañana.
- **Clase de retención:** `U` — Cuenta
- **Contiene (conceptualmente):** proveedor (password, google), identificador en el proveedor, correo declarado por el proveedor, fecha de verificación, y para el proveedor «password» el hash de la clave con sus parámetros y la fecha del último cambio.
- **Por qué es una entidad aparte:** La credencial es un secreto con ciclo de vida propio (rotación, algoritmo). Vivir aparte evita exponerla en consultas de perfil y permite sumar Google sin tocar `User`. El hash nunca sale del módulo de identidad.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «se autentica con»)

### Session

*Ahora* · sensibilidad **Secreto** · proviene de: sessions

- **Qué representa:** Un inicio de sesión activo en un dispositivo.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** hash del token de la cookie, usuario, fecha de creación, último uso, vencimiento, **fecha de la última reautenticación con contraseña**, y huella mínima del dispositivo (agente resumido, país aproximado).
- **Por qué es una entidad aparte:** Hoy no hay último uso ni dispositivo, así que no se pueden listar ni cerrar sesiones. La fecha de reautenticación permite exigir «contraseña reciente» antes de operaciones críticas (cambiar el destino del dinero, transferir la propiedad, eliminar la cuenta) sin pedirla en cada pantalla.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «abre»)

### AuthToken

*Ahora* · sensibilidad **Secreto** · proviene de: password_resets (generaliza)

- **Qué representa:** Un token de un solo uso enviado por correo para una acción sensible: recuperar la clave, verificar el correo.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** propósito (password_reset, email_verification), usuario, hash del token, vencimiento, fecha de uso, fecha de creación.
- **Por qué es una entidad aparte:** Evita crear una tabla por cada flujo con token. El propósito va dentro del hash verificado, así un token de verificación no sirve para cambiar la clave.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «recibe»)

### MfaFactor

*Ahora* · sensibilidad **Secreto** · proviene de: —

- **Qué representa:** Un segundo factor de autenticación de un usuario (aplicación TOTP, a futuro clave de seguridad).
- **Clase de retención:** `U` — Cuenta
- **Contiene (conceptualmente):** usuario, tipo, secreto cifrado, fecha de activación y de último uso, códigos de recuperación (solo hash).
- **Por qué es una entidad aparte:** Es obligatorio para el personal de Weda desde que existe la administración interna de precios (Q5), y se recomienda a los propietarios porque protege el cambio del destino del dinero (Q4). Cuando un propietario lo activa, pasa a ser exigido en esa operación.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «protege con»)

---

## Casamientos y membresías

El casamiento como raíz de aislamiento, quién lo administra y sus momentos.

### Wedding

*Ahora* · sensibilidad **PII** · proviene de: weddings (parcial) + weddings.draft (datos básicos)

- **Qué representa:** El casamiento: la raíz de aislamiento («tenant») de todo lo que es de una pareja.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** nombres de las dos personas, fecha del casamiento y zona horaria (**la fecha no determina ninguna vigencia**), idioma, **estado operativo** (en armado, activo, finalizado) y **estado de retención** (datos completos, en retención posterior al cierre, depurado, lápida), cada uno con la fecha de su transición (en particular la de finalización), estado del onboarding, quién lo creó y cuándo. **No guarda al propietario: eso es una membresía.** El acceso privado **no es un estado propio**: está abierto en «en armado» y «activo» y cerrado en «finalizado».
- **Por qué es una entidad aparte:** Hoy el casamiento está atado a un único usuario (`owner_id UNIQUE`) y arrastra dentro de un JSON casi todo el dominio. Se convierte en una raíz liviana. **«Finalizado» lo produce el cumplimiento de los 12 meses desde la primera publicación efectiva y no tiene vuelta atrás**: no hay renovación, extensión ni reactivación (ni por soporte), y ni cambiar la fecha ni publicar de nuevo lo reabren. Con el evento finalizado se cierra el acceso de gestión para todos los roles, incluido el propietario. **El estado «activo» lo produce la confirmación del pago, que activa y publica el evento en la misma operación.** **El estado comercial vive en `Subscription`, el público en `Publication` y la retención se registra aparte; no se mezclan en una sola máquina** (`02d`). **La existencia de una cuenta activa no modifica el estado de un evento vencido.** Un evento nuevo es otro `Wedding` creado desde cero, sin ningún vínculo de copia con el anterior. Una misma persona puede ser propietaria de varios casamientos (hoy `owner_id UNIQUE` lo impide). Al eliminar un casamiento no se borra la fila: queda una «lápida» (identificador, fechas, plan contratado, sin nombres) a la que siguen apuntando los registros financieros y de auditoría que deben conservarse.
- **Relaciones:**
  - **es administrado por** → `WeddingMember` (uno a uno o más)
  - **invita colaboradores** → `MemberInvite` (uno a muchos)
  - **tiene momentos** → `EventMoment` (uno a muchos)
  - **tiene un sitio** → `Microsite` (uno a uno)
  - **publica** → `Publication` (uno a cero o uno)
  - **se encuentra en** → `PublicAddress` (uno a muchos)
  - **usa dominio propio** → `CustomDomain` (uno a muchos)
  - **posee archivos** → `MediaAsset` (uno a muchos)
  - **lista** → `Gift` (uno a muchos)
  - **recibe por** → `PayoutMethod` (uno a muchos)
  - **recibe** → `Contribution` (uno a muchos)
  - **invita** → `Invitation` (uno a muchos)
  - **se confirma según** → `RsvpSettings` (uno a uno)
  - **organiza** → `SeatingTable` (uno a muchos)
  - **importa** → `GuestImport` (uno a muchos)
  - **contrata** → `Subscription` (uno a muchos)
  - **compra** → `Order` (uno a muchos)
  - **refiere con** → `ReferralCode` (uno a muchos)
  - **es referida por** `TermsAcceptance` (muchos a cero o uno (opcional); «refiere a»)
  - **es referida por** `CommunicationConsent` (muchos a cero o uno (opcional); «origen»)
  - **exporta** → `DataExportJob` (uno a muchos)
  - **es referida por** `AuditLog` (muchos a cero o uno (opcional); «afecta a»)
  - **consulta** → `Inquiry` (uno a muchos)
  - **escribe** → `Review` (uno a muchos)
  - **configura regalos** → `GiftSettings` (uno a uno)
  - **transfiere la propiedad** → `OwnershipTransfer` (uno a muchos)
  - **cambia el destino** → `PayoutMethodChange` (uno a muchos)

### WeddingMember

*Ahora* · sensibilidad **Operativa** · proviene de: weddings.owner_id (reemplaza)

- **Qué representa:** La pertenencia de un usuario a un casamiento, con un rol y un estado. Es la única fuente de «quién puede qué» y también de «quién es el propietario».
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, usuario, rol (propietario, administrador, colaborador), estado (invitado, activo, suspendido, retirado), quién lo agregó, fechas.
- **Por qué es una entidad aparte:** Separa propiedad de acceso. **Invariante A2: hay exactamente un propietario activo por casamiento** (a lo sumo uno por una restricción de unicidad parcial; al menos uno, verificado en la transacción que cambia roles o retira miembros). La propiedad solo cambia por una transferencia (`OwnershipTransfer`). Que la pareja sean dos personas no las hace dos propietarias: la segunda suele ser administradora.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «participa como»)
  - **es referida por** `Wedding` (uno a uno o más; «es administrado por»)
  - **es referida por** `OwnershipTransfer` (muchos a uno (obligatoria); «de (propietario saliente)»)
  - **es referida por** `OwnershipTransfer` (muchos a uno (obligatoria); «a (propietario entrante)»)
  - **solicita** → `PayoutMethodChange` (uno a muchos)

### OwnershipTransfer

*Ahora* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** El procedimiento seguro para pasar la propiedad de un casamiento a otro miembro.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** casamiento, propietario actual, miembro destinatario, estado (solicitada, aceptada, completada, cancelada, vencida), hash del token de aceptación, fechas de solicitud, aceptación y vencimiento, evidencia de reautenticación y de aceptación.
- **Por qué es una entidad aparte:** Debe existir siempre un propietario válido. La transferencia exige contraseña reciente (y segundo factor si está activo) del propietario, aceptación explícita del destinatario (que ya debe ser miembro con correo verificado), y se completa en **una sola transacción** que baja al anterior a administrador y sube al nuevo. Cada paso queda en auditoría y se notifica a ambas partes. Es también el paso previo obligatorio si el propietario quiere eliminar su cuenta y la boda tiene otros miembros.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «transfiere la propiedad»)
  - **de (propietario saliente)** → `WeddingMember` (muchos a uno (obligatoria))
  - **a (propietario entrante)** → `WeddingMember` (muchos a uno (obligatoria))

### MemberInvite

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** La invitación a colaborar en un casamiento enviada a un correo, aún no aceptada.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** casamiento, correo invitado, rol propuesto (administrador o colaborador; nunca propietario), hash del token, quién invita, vencimiento, fecha de aceptación o revocación.
- **Por qué es una entidad aparte:** Un colaborador puede no tener cuenta todavía. Es distinta de la «invitación» de la boda (que va a los invitados): se llama así para no confundir los dos conceptos. No puede crear propietarios: esa vía es solo la transferencia. El modelo se prepara ahora; la interfaz puede venir después.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «invita colaboradores»)

### EventMoment

*Ahora* · sensibilidad **Pública** · proviene de: weddings.draft → site.events

- **Qué representa:** Un momento del casamiento con lugar y horario: ceremonia, recepción, fiesta.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, tipo o ícono, nombre dado por la pareja, lugar, dirección, enlace de mapa, inicio y duración, nota, si se muestra, orden.
- **Por qué es una entidad aparte:** Lo usan el micrositio, el calendario del invitado, el seguimiento de asistencia y, a futuro, la invitación a momentos puntuales. Vive como entidad para no duplicar datos entre esas funciones y poder consultarlos.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «tiene momentos»)
  - **convoca** → `EventInvitee` (uno a muchos)

---

## Micrositio y publicación

Lo que se edita (borrador), lo que se publica (revisiones inmutables) y dónde se encuentra (direcciones).

### Microsite

*Ahora* · sensibilidad **Pública** · proviene de: weddings.draft → site (configuración general)

- **Qué representa:** El sitio web de la pareja en su estado de trabajo (borrador).
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, tema, imagen de portada, texto de portada, opciones generales (mostrar cuenta regresiva, «save the date»), metadatos para buscadores y redes, contador de revisión del borrador.
- **Por qué es una entidad aparte:** Separa lo que se edita (borrador) de lo que ven los invitados (publicación) y de lo que es el casamiento en sí.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a uno; «tiene un sitio»)
  - **se compone de** → `MicrositeBlock` (uno a muchos)
  - **portada** → `MediaAsset` (muchos a cero o uno (opcional))
  - **usa el tema** → `Theme` (muchos a cero o uno (opcional))
  - **congela al publicar** → `MicrositeRevision` (uno a muchos)

### MicrositeBlock

*Ahora* · sensibilidad **Pública** · proviene de: weddings.draft → site.* (cada sección)

- **Qué representa:** Una sección configurable del sitio: dress code, texto libre, galería, música, mensaje final, acceso a regalos, RSVP, eventos.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** micrositio, tipo de bloque, posición, si está visible, contenido validado (JSON con versión de esquema), contador de revisión propio.
- **Por qué es una entidad aparte:** Con varios colaboradores, guardar un único JSON gigante pisa cambios ajenos. Un bloque por fila permite concurrencia por sección, habilitar bloques según el plan, reordenar y medir clics por tipo de bloque. El contenido sigue siendo JSON porque es presentacional y siempre se lee junto al bloque. Con el evento finalizado ningún bloque se edita ni se vuelve a publicar.
- **Relaciones:**
  - **es referida por** `Microsite` (uno a muchos; «se compone de»)
  - **contiene fotos** → `GalleryItem` (uno a muchos)

### GalleryItem

*Ahora* · sensibilidad **Pública** · proviene de: weddings.draft → site.gallery.photos

- **Qué representa:** Una foto dentro del bloque de galería.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** bloque, archivo, texto alternativo, posición.
- **Por qué es una entidad aparte:** Hace falta saber qué archivos se usan para borrarlos con seguridad, reemplazarlos y respetar los límites del plan. Un JSON con rutas no da integridad ni permite consultar «en qué lugares se usa este archivo».
- **Relaciones:**
  - **es referida por** `MicrositeBlock` (uno a muchos; «contiene fotos»)
  - **usa el archivo** → `MediaAsset` (muchos a uno (obligatoria))

### MicrositeRevision

*Ahora* · sensibilidad **Pública** · proviene de: publications.snapshot (generaliza)

- **Qué representa:** Una versión inmutable del sitio, congelada al publicar.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** micrositio, número de versión, contenido completo renderizable (JSON), plan con el que se publicó, quién publicó, fecha.
- **Por qué es una entidad aparte:** Hoy la publicación se sobrescribe y no hay historial. Con revisiones inmutables se puede auditar, comparar y volver atrás **mientras el plan está vigente**, y lo que ve un invitado nunca cambia por una edición del borrador. Con el evento finalizado las revisiones quedan bloqueadas: no se restauran, no se republican y no sirven de base de otro evento.
- **Relaciones:**
  - **es referida por** `Microsite` (uno a muchos; «congela al publicar»)
  - **es referida por** `Publication` (muchos a cero o uno (opcional); «muestra la vigente»)

### Publication

*Ahora* · sensibilidad **Operativa** · proviene de: publications (estado)

- **Qué representa:** El estado público actual del sitio: qué revisión se muestra.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, **estado público** (publicada, dada de baja, no disponible), revisión vigente, **suscripción que la activó** (la primera publicación efectiva es la activación de esa suscripción: no guarda una fecha propia de primera publicación, para no duplicar el instante), fechas de baja y de retiro definitivo.
- **Por qué es una entidad aparte:** Separa «qué hay publicado ahora» (un puntero) de «qué versiones existieron» (revisiones). Despublicar y republicar no reinicia ni extiende la vigencia, que corre desde la **primera** publicación efectiva —que ocurre automáticamente cuando Weda confirma el pago— y no depende de la fecha de la boda. **La publicación no se bloquea por secciones opcionales incompletas**: solo exige lo estrictamente necesario para generar una página pública válida y segura (P35). **Al cumplirse los 12 meses pasa a «no disponible» de forma definitiva**: la dirección pública deja de estar disponible y **el servidor responde como evento no disponible, sin mostrar ningún contenido** (ni vista estática, ni sitio, ni RSVP, ni regalos, ni datos de invitados, ni información financiera, ni alias); no se publica, no se republica y la dirección no se reutiliza.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a cero o uno; «publica»)
  - **muestra la vigente** → `MicrositeRevision` (muchos a cero o uno (opcional))

### PublicAddress

*Ahora* · sensibilidad **Pública** · proviene de: weddings.slug (reemplaza)

- **Qué representa:** La dirección pública del sitio (`/sitio/<slug>`), con historial.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, slug único global, si es la dirección principal, fecha de alta y de retiro.
- **Por qué es una entidad aparte:** Hoy el slug no puede cambiar. Con historial se puede renombrar sin romper enlaces ya compartidos (los viejos redirigen) y reservar palabras. Prepara dominios propios. **Una dirección de un evento finalizado no se reutiliza nunca**: queda retirada de forma permanente para evitar suplantaciones, y el servidor responde como evento no disponible.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «se encuentra en»)

### Theme

*Preparar* · sensibilidad **Pública** · proviene de: —

- **Qué representa:** Una plantilla visual del sitio (colores, tipografía, estilo de bloques).
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, nombre, parámetros de estilo, plan mínimo, si está activo.
- **Por qué es una entidad aparte:** Hoy hay una sola apariencia. Es datos de referencia (puede vivir en el código) hasta que haya varias plantillas.
- **Relaciones:**
  - **es referida por** `Microsite` (muchos a cero o uno (opcional); «usa el tema»)

### CustomDomain

*Después* · sensibilidad **Pública** · proviene de: —

- **Qué representa:** Un dominio propio de la pareja apuntando a su sitio.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, nombre de dominio, estado de verificación DNS y del certificado.
- **Por qué es una entidad aparte:** Documentado como extensión. Exige verificación y certificados; no se construye ahora.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «usa dominio propio»)

---

## Archivos

Metadatos y reglas de los archivos; los binarios viven fuera de las tablas.

### MediaAsset

*Ahora* · sensibilidad **Mixta** · proviene de: archivos en disco (media/, receipts/) sin metadatos

- **Qué representa:** Un archivo guardado fuera de la base: foto de portada, foto de galería, imagen de regalo, comprobante, archivo importado.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** dueño (casamiento o, a futuro, proveedor), uso (foto, comprobante, importación), huella del contenido (sha256), tipo y tamaño verificados, dimensiones, ubicación en el almacenamiento, visibilidad (pública, privada), estado (pendiente, listo, en cuarentena, eliminado), quién lo subió, retención.
- **Por qué es una entidad aparte:** Hoy los archivos no tienen metadatos: no se sabe de quién son, no hay forma de limpiarlos al borrar un casamiento ni de mover el almacenamiento. Los binarios siguen fuera de las tablas; la base guarda la referencia y las reglas.
- **Relaciones:**
  - **es referida por** `GalleryItem` (muchos a uno (obligatoria); «usa el archivo»)
  - **es referida por** `Microsite` (muchos a cero o uno (opcional); «portada»)
  - **es referida por** `Wedding` (uno a muchos; «posee archivos»)
  - **es referida por** `Gift` (muchos a cero o uno (opcional); «imagen»)
  - **es referida por** `PaymentProof` (muchos a uno (obligatoria); «archivo privado»)

---

## Regalos y aportes

El dinero de los regalos: de la pareja hacia ella. Weda no pasa por ese dinero.

### GiftCollection

*Preparar* · sensibilidad **Pública** · proviene de: catalog.ts (código)

- **Qué representa:** Un set de regalos sugeridos por Weda (luna de miel, hogar).
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, nombre, descripción, orden, si está activo.
- **Por qué es una entidad aparte:** Datos de referencia. Pueden seguir en el código; se vuelve tabla cuando el equipo de Weda los edite sin desplegar.
- **Relaciones:**
  - **agrupa** → `GiftCatalogItem` (uno a muchos)

### GiftCatalogItem

*Preparar* · sensibilidad **Pública** · proviene de: catalog.ts (código)

- **Qué representa:** Un regalo sugerido del catálogo de Weda.
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, nombre, texto, imagen, categoría, ícono, importes sugeridos por moneda, colección.
- **Por qué es una entidad aparte:** El regalo de una pareja se origina en un ítem del catálogo pero luego es independiente: cambiar el catálogo no debe alterar listas ya armadas.
- **Relaciones:**
  - **es referida por** `GiftCollection` (uno a muchos; «agrupa»)
  - **es referida por** `Gift` (muchos a cero o uno (opcional); «se origina en»)

### Gift

*Ahora* · sensibilidad **Pública** · proviene de: weddings.draft → gifts.items

- **Qué representa:** Un regalo de la lista de una pareja. Es el «qué» que se quiere recibir, nunca algo que se agota.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, origen en el catálogo (opcional), nombre, texto, imagen, categoría, ícono, **importe sugerido y su moneda**, posición, estado (activo, archivado, en espera de reprecio si la pareja cambió de moneda).
- **Por qué es una entidad aparte:** Debe ser una entidad con identidad estable: los aportes la referencian. Sin stock, sin bloqueo exclusivo y sin contador de «tomado»; un aporte jamás la modifica. Si fue aportada, se archiva en lugar de borrarse.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «lista»)
  - **se origina en** → `GiftCatalogItem` (muchos a cero o uno (opcional))
  - **imagen** → `MediaAsset` (muchos a cero o uno (opcional))
  - **es referida por** `ContributionItem` (muchos a cero o uno (opcional); «regala (si es un regalo)»)

### GiftSettings

*Ahora* · sensibilidad **Financiera** · proviene de: weddings.draft → gifts (preferencias)

- **Qué representa:** Las reglas de la lista de regalos de un casamiento, en particular **en qué moneda recibe la pareja**.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, moneda de recepción (ARS o USD), si se aceptan aportes de importe libre, importe mínimo opcional, quién y cuándo cambió la moneda por última vez.
- **Por qué es una entidad aparte:** La moneda elegida determina cómo se expresan los importes de la lista y de los aportes. Es un dato financiero con permisos reforzados (solo el propietario) y consecuencias al cambiarlo con aportes existentes (§ de moneda en `02-domain-model.md`). Cambiar la **moneda de recepción no convierte dinero** ni reescribe operaciones anteriores.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a uno; «configura regalos»)

### PayoutMethod

*Ahora* · sensibilidad **Financiera** · proviene de: weddings.draft → gifts.alias/bank/cbu/acceptCard

- **Qué representa:** **Una versión inmutable** del destino del dinero de los regalos: cuenta bancaria (alias y CBU/CVU, banco, titular) o, a futuro, cuenta de Mercado Pago.
- **Clase de retención:** `B2` — Registro financiero de los regalos (categoría B)
- **Contiene (conceptualmente):** casamiento, tipo, moneda que acepta, datos de destino, versión que reemplaza (si la hay), estado (vigente, reemplazada), quién y cuándo la creó, huella (hash) del destino para auditar sin exponerlo.
- **Por qué es una entidad aparte:** Cambiar el alias no edita la fila: crea una versión nueva y marca la anterior como reemplazada. Así cada aporte conserva a qué destino se le informó al invitado. Solo el propietario puede crearla, y siempre a través de `PayoutMethodChange`. Una cuenta recibe una sola moneda y debe coincidir con la moneda de recepción vigente.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «recibe por»)
  - **es referida por** `Contribution` (muchos a uno (obligatoria); «informa el destino»)
  - **es referida por** `PayoutMethodChange` (muchos a cero o uno (opcional); «crea la versión»)
  - **es referida por** `PayoutMethodChange` (muchos a cero o uno (opcional); «reemplaza a»)

### PayoutMethodChange

*Ahora* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** La solicitud, protegida, de cambiar el alias o los datos bancarios de recepción.
- **Clase de retención:** `B2` — Registro financiero de los regalos (categoría B)
- **Contiene (conceptualmente):** casamiento, miembro solicitante (propietario), destino anterior y nuevo (como referencias y huellas, nunca en claro en registros), estado (solicitada, confirmada, cancelada, vencida), evidencia de reautenticación y de segundo factor, confirmación explícita, aviso enviado, fechas, y si el cambio exige confirmación fuera de banda o espera de cancelación.
- **Por qué es una entidad aparte:** Un error o un acceso indebido aquí envía transferencias a una cuenta equivocada. La solicitud separa «pedir» de «activar»: reautenticación con contraseña, confirmación explícita y notificación al propietario por correo antes de que el destino nuevo se muestre a los invitados. Es el registro que permite decir quién, cuándo y desde dónde.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «cambia el destino»)
  - **es referida por** `WeddingMember` (uno a muchos; «solicita»)
  - **crea la versión** → `PayoutMethod` (muchos a cero o uno (opcional))
  - **reemplaza a** → `PayoutMethod` (muchos a cero o uno (opcional))
  - **se notifica con** → `OutboundMessage` (muchos a cero o uno (opcional))

### Contribution

*Ahora* · sensibilidad **PII** · proviene de: contributions

- **Qué representa:** El acto de un invitado que declara un aporte: «regalé esto, o aporté este importe, con este mensaje».
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, quién aporta (nombre, correo), mensaje, **moneda** y total, destino informado (la versión de `PayoutMethod` que vio), invitación de origen (si vino de un enlace personal), estado del flujo (iniciado, pendiente de revisión, confirmado, rechazado, revertido), clave de idempotencia, capacidad de gestión del invitado (hash del token).
- **Por qué es una entidad aparte:** Es la intención social del invitado, distinta del dinero. Admite regalos con importe sugerido y aportes de importe libre en el mismo flujo. Una persona puede hacer cuantos aportes quiera y un mismo regalo puede estar en cualquier cantidad de aportes: **ninguna restricción de unicidad sobre el regalo**. Una sola moneda por aporte. Sus datos personales (nombre, correo, mensaje) se eliminan o anonimizan de forma efectiva según la política posterior al cierre del evento (plazo a validar con asesoramiento, P30); los importes quedan en el libro. Los estados nombran lo que Weda sabe: «comprobante cargado», «revisado», «confirmado manualmente por la pareja», «rechazado», «reembolso o corrección registrada»; nunca «recibido» ni «acreditado».
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «recibe»)
  - **incluye** → `ContributionItem` (uno a uno o más)
  - **informa el destino** → `PayoutMethod` (muchos a uno (obligatoria))
  - **tiene historial** → `ContributionEvent` (uno a muchos)
  - **se acompaña con** → `PaymentProof` (uno a muchos)
  - **se concreta en** → `GiftTransaction` (uno a muchos)
  - **intenta pagar con** → `PaymentIntent` (uno a muchos)
  - **viene del enlace de** → `Invitation` (muchos a cero o uno (opcional))

### ContributionItem

*Ahora* · sensibilidad **Financiera** · proviene de: contribution_items

- **Qué representa:** Un renglón de un aporte: un regalo de la lista o un aporte libre.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** aporte, tipo (regalo, aporte libre), regalo (obligatorio solo si el tipo es regalo), nombre del regalo, **importe sugerido en ese momento** y **importe aportado** (pueden diferir), moneda.
- **Por qué es una entidad aparte:** Hoy ya admite el mismo regalo en varios aportes. Se agregan el tipo (para el aporte libre, sin regalo) y la moneda explícita. La copia del nombre y de los importes mantiene el historial aunque se edite o archive el regalo. La suma de los renglones es el total del aporte, verificada al crearlo.
- **Relaciones:**
  - **es referida por** `Contribution` (uno a uno o más; «incluye»)
  - **regala (si es un regalo)** → `Gift` (muchos a cero o uno (opcional))

### ContributionEvent

*Ahora* · sensibilidad **Operativa** · proviene de: contribution_events

- **Qué representa:** Cada cambio de estado o acción sobre un aporte, en orden.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** aporte, tipo de evento (iniciado, comprobante cargado, **revisado**, confirmado, rechazado, revertido, corrección), quién actuó (invitado, miembro, sistema), estado anterior y nuevo, nota, fecha.
- **Por qué es una entidad aparte:** Es la trazabilidad del flujo. No reemplaza al registro de auditoría general porque se consulta por aporte desde el panel.
- **Relaciones:**
  - **es referida por** `Contribution` (uno a muchos; «tiene historial»)

### PaymentProof

*Ahora* · sensibilidad **Financiera** · proviene de: receipts

- **Qué representa:** El comprobante que adjunta quien aporta (captura o PDF de la transferencia). Es una **prueba**, no el dinero ni la confirmación, y **no es un comprobante de compra de Weda** (esos son `Order`, `Payment` e `Invoice`, con otra clase y otros plazos).
- **Clase de retención:** `B3` — Evidencia operativa de pagos (categorías A/B)
- **Contiene (conceptualmente):** aporte, archivo (MediaAsset privado), quién lo subió, fecha, estado de revisión (pendiente, aceptado, rechazado), quién lo revisó y cuándo, clase de documento (evidencia operativa por defecto).
- **Por qué es una entidad aparte:** Separado de la transacción confirmada: el comprobante puede reemplazarse o rechazarse sin tocar el libro. Clasificado como **evidencia operativa**, no como respaldo contable de Weda, salvo que el asesoramiento contable indique otra cosa. Se descarga en el archivo comprimido de comprobantes durante la vigencia. **Al vencer el evento la pareja deja de acceder**; qué se conserva y por cuánto tiempo (por ejemplo, ante una disputa) lo define la política posterior al cierre, pendiente de asesoramiento (P30). Weda no verifica el contenido del archivo.
- **Relaciones:**
  - **es referida por** `Contribution` (uno a muchos; «se acompaña con»)
  - **archivo privado** → `MediaAsset` (muchos a uno (obligatoria))
  - **es referida por** `GiftTransaction` (muchos a cero o uno (opcional); «respaldada por»)

### GiftTransaction

*Ahora* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** El hecho que la pareja confirmó (o corrigió) sobre un aporte: una confirmación, un reembolso, una reversión o una corrección. **Registro inmutable de lo que Weda sabe**: Weda no arbitra ni verifica transferencias bancarias y este registro no prueba que el dinero haya llegado a ninguna cuenta. **Libro inmutable.**
- **Clase de retención:** `B2` — Registro financiero de los regalos (categoría B)
- **Contiene (conceptualmente):** casamiento (lápida si se cierra), aporte, tipo (confirmación, reembolso, reversión, corrección), importe y moneda (siempre positivos; el tipo da el sentido), **transacción a la que corrige o revierte** (si corresponde), comprobante que la respaldó (opcional), **método de confirmación** (hoy siempre manual, por un miembro con permiso; a futuro, notificación verificada de un proveedor de pagos) y quién la confirmó, referencia del proveedor, fecha del hecho. **Sin nombres ni correos de personas.**
- **Por qué es una entidad aparte:** «Confirmado» deja de ser una marca editable. Nunca se edita ni se borra: un error se corrige con un movimiento nuevo relacionado. Al no contener datos personales, sobrevive a la anonimización del aporte sin perder la información financiera. La inmutabilidad se refuerza en la base (impedir modificar y borrar) además de en la aplicación.
- **Relaciones:**
  - **es referida por** `Contribution` (uno a muchos; «se concreta en»)
  - **es referida por** `PaymentIntent` (uno a muchos; «origina»)
  - **confirmada por** → `ProviderEvent` (muchos a cero o uno (opcional))
  - **corrige o revierte a** → `GiftTransaction` (muchos a cero o uno (opcional))
  - **es referida por** `GiftTransaction` (muchos a cero o uno (opcional); «corrige o revierte a»)
  - **respaldada por** → `PaymentProof` (muchos a cero o uno (opcional))

### PaymentIntent

*Preparar* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** La intención de pagar a través de un proveedor (por ejemplo Mercado Pago) antes de saber el resultado.
- **Clase de retención:** `B2` — Registro financiero de los regalos (categoría B)
- **Contiene (conceptualmente):** aporte, proveedor, importe y moneda, estado (creada, en proceso, exitosa, fallida, cancelada, vencida), referencia del proveedor, clave de idempotencia, vencimiento.
- **Por qué es una entidad aparte:** Hoy no hay proveedor real. Con transferencia no hace falta: el aporte declarado y su comprobante cumplen ese papel. Se define el lugar para que, cuando exista, el aporte no se acople a un proveedor.
- **Relaciones:**
  - **es referida por** `Contribution` (uno a muchos; «intenta pagar con»)
  - **origina** → `GiftTransaction` (uno a muchos)

---

## Invitados y RSVP

Personas invitadas, invitaciones personales, respuestas y mesas.

### Guest

*Ahora* · sensibilidad **PII** · proviene de: guests (parcial)

- **Qué representa:** Una persona invitada al casamiento (integrante de una invitación). No necesita cuenta de Weda.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, invitación a la que pertenece, nombre y apellido, correo y teléfono opcionales, restricciones alimentarias, notas de la pareja, mesa asignada (opcional), **cómo se dio de alta** (la pareja, importación, el propio invitado desde su enlace como acompañante, formulario abierto) y si está verificada.
- **Por qué es una entidad aparte:** Una persona pertenece a una sola invitación; la respuesta es otra entidad. Cada integrante tiene identidad propia, así no se confunde con otro por tener el mismo nombre. Se elimina o anonimiza según la política posterior al cierre del evento (plazo a validar con asesoramiento, P30); la pareja puede exportarlo mientras el evento está vigente.
- **Relaciones:**
  - **es referida por** `Invitation` (uno a uno o más; «agrupa a»)
  - **responde** → `RsvpResponse` (uno a cero o uno)
  - **se sienta en** → `SeatingTable` (muchos a cero o uno (opcional))
  - **es convocado a** → `EventInvitee` (uno a muchos)

### Invitation

*Ahora* · sensibilidad **PII** · proviene de: —

- **Qué representa:** La unidad que se invita y que recibe un enlace personal: una persona o un grupo familiar.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, etiqueta («Familia Pérez»), tipo (individual, grupal), **cupo de personas autorizadas** (definido por la pareja, no modificable por el invitado), contacto de envío, estado derivado (sin enviar, enviada, vista, respondida), fechas de primer acceso y de última respuesta.
- **Por qué es una entidad aparte:** El acceso no se decide por nombre sino por el enlace de la invitación. El cupo cuenta a todas las personas, incluidas las ya nombradas; el invitado puede registrar nombres de acompañantes hasta completarlo y no puede aumentarlo. Cantidades **derivadas, no guardadas**: autorizadas (cupo), nombradas (integrantes registrados), con respuesta, que asistirán.
- **Relaciones:**
  - **es referida por** `Contribution` (muchos a cero o uno (opcional); «viene del enlace de»)
  - **es referida por** `Wedding` (uno a muchos; «invita»)
  - **agrupa a** → `Guest` (uno a uno o más)
  - **se accede con** → `InvitationAccess` (uno a muchos)
  - **se envía por** → `InvitationDelivery` (uno a muchos)

### InvitationAccess

*Ahora* · sensibilidad **Secreto** · proviene de: —

- **Qué representa:** Un enlace personal y revocable para una invitación.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** invitación, hash del token, estado (activo, revocado, vencido), fecha de creación, vencimiento, último uso y cantidad de usos, quién lo emitió, motivo de revocación.
- **Por qué es una entidad aparte:** El token real sale una sola vez al generarlo; la base guarda solo el hash. Poder rotar y revocar sin borrar la invitación ni sus respuestas. Una invitación puede tener varios enlaces a lo largo del tiempo.
- **Relaciones:**
  - **es referida por** `Invitation` (uno a muchos; «se accede con»)
  - **es referida por** `RsvpResponse` (muchos a cero o uno (opcional); «respondida con»)

### InvitationDelivery

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Un intento de hacer llegar una invitación por un canal (correo, WhatsApp, copiado a mano).
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** invitación, canal, mensaje saliente asociado, estado, fecha.
- **Por qué es una entidad aparte:** Para saber qué invitaciones se enviaron y cuáles no, y para medir apertura y respuesta. Hoy no se envían invitaciones desde Weda.
- **Relaciones:**
  - **es referida por** `Invitation` (uno a muchos; «se envía por»)
  - **usa** → `OutboundMessage` (muchos a cero o uno (opcional))

### RsvpSettings

*Ahora* · sensibilidad **Operativa** · proviene de: weddings.draft → site.rsvp

- **Qué representa:** Las reglas de confirmación de asistencia de un casamiento.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** casamiento, modo de acceso (enlace personal o formulario abierto), fecha límite, hasta cuándo se puede modificar, si se pregunta restricción alimentaria, si se permite registrar acompañantes, si se pide correo.
- **Por qué es una entidad aparte:** Son reglas de negocio que el servidor valida en cada respuesta, no presentación del bloque del sitio.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a uno; «se confirma según»)

### RsvpResponse

*Ahora* · sensibilidad **PII** · proviene de: guests.status / guests.menu

- **Qué representa:** La respuesta vigente de **un integrante**: asistirá, no asistirá, pendiente.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** invitado, estado, restricción alimentaria declarada, comentario, vía (enlace de la invitación, la pareja, importación), enlace con el que se respondió, fecha de la última respuesta.
- **Por qué es una entidad aparte:** Separar «la persona» de «lo que respondió» permite pendiente real, historial y cambios. Cada integrante tiene su propio estado individual; el grupo no responde como un bloque indivisible.
- **Relaciones:**
  - **es referida por** `Guest` (uno a cero o uno; «responde»)
  - **tiene historial** → `RsvpResponseEvent` (uno a muchos)
  - **respondida con** → `InvitationAccess` (muchos a cero o uno (opcional))

### RsvpResponseEvent

*Ahora* · sensibilidad **PII** · proviene de: rsvp_events

- **Qué representa:** Cada cambio de una respuesta, en orden.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** respuesta o invitado, estado anterior y nuevo, vía y actor, fecha.
- **Por qué es una entidad aparte:** Se conserva el historial para resolver disputas («yo había confirmado»). Se puede acotar la retención.
- **Relaciones:**
  - **es referida por** `RsvpResponse` (uno a muchos; «tiene historial»)

### SeatingTable

*Ahora* · sensibilidad **Operativa** · proviene de: weddings.draft → groups

- **Qué representa:** Una mesa o grupo de ubicación del salón.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, nombre, capacidad, nota.
- **Por qué es una entidad aparte:** Hoy se llama «grupo» y se confunde con el grupo familiar de la invitación. Son conceptos distintos: la invitación define quién responde juntos; la mesa define dónde se sientan. Con una clave real (`Guest → SeatingTable`) desaparecen las referencias huérfanas.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «organiza»)
  - **es referida por** `Guest` (muchos a cero o uno (opcional); «se sienta en»)

### GuestImport

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Un lote de invitados cargado desde una planilla.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, quién importó, archivo original (opcional, con retención corta), cantidades (filas, creados, actualizados, con error), resumen de errores, estado, fecha.
- **Por qué es una entidad aparte:** Hoy la importación ocurre solo en el navegador y no deja rastro, así que no se puede medir su éxito ni deshacerla. No se guardan las filas completas por privacidad.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «importa»)

### EventInvitee

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** La convocatoria de un invitado a un momento puntual (por ejemplo, solo a la fiesta).
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** invitado, momento, estado de la respuesta para ese momento.
- **Por qué es una entidad aparte:** Hoy todos los invitados son de todos los momentos. Se reserva la clave para cuando haya invitados «solo a la ceremonia» sin migrar respuestas.
- **Relaciones:**
  - **es referida por** `Guest` (uno a muchos; «es convocado a»)
  - **es referida por** `EventMoment` (uno a muchos; «convoca»)

---

## Planes y facturación Weda

Lo que la pareja le compra a Weda: planes, precios, contrataciones, órdenes y pagos.

### Plan

*Ahora* · sensibilidad **Pública** · proviene de: plans.ts (código)

- **Qué representa:** Una oferta comercial de Weda (Regalos, Invitación, Completo).
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, nombre, descripción, plazo de vigencia en meses, si está a la venta (activo/inactivo), orden de presentación.
- **Por qué es una entidad aparte:** Pasa del código a la base: **lo administra el responsable de Weda desde la administración interna** (Q5), sin desplegar. El plan es una oferta comercial, no un permiso. Activar o desactivar un plan no afecta contrataciones existentes.
- **Relaciones:**
  - **tiene precios** → `PlanPrice` (uno a muchos)
  - **incluye** → `PlanFeature` (uno a muchos)
  - **es referida por** `Subscription` (muchos a uno (obligatoria); «de»)

### PlanPrice

*Ahora* · sensibilidad **Pública** · proviene de: plans.ts (código)

- **Qué representa:** El precio de un plan en una moneda durante un período. **Inmutable.**
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** plan, moneda, importe, vigencia desde y hasta, quién lo cargó y cuándo.
- **Por qué es una entidad aparte:** Cambiar un precio no edita la fila: cierra la vigente y crea una nueva. Así se pueden consultar precios anteriores y cada compra conserva el precio contratado. Regla: no pueden superponerse vigencias del mismo plan y moneda. Reemplaza los precios esparcidos por el código.
- **Relaciones:**
  - **es referida por** `Plan` (uno a muchos; «tiene precios»)
  - **es referida por** `OrderLine` (muchos a cero o uno (opcional); «aplica el precio»)

### Feature

*Ahora* · sensibilidad **Pública** · proviene de: plans.ts (features)

- **Qué representa:** Una funcionalidad habilitable (galería, música, invitados, mesas).
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, nombre, descripción.
- **Por qué es una entidad aparte:** Es el vocabulario de los permisos técnicos que el plan concede. La clave existe en el código (la define quien programa la función); la asignación a planes es dato.
- **Relaciones:**
  - **se concede en** → `PlanFeature` (uno a muchos)

### PlanFeature

*Ahora* · sensibilidad **Pública** · proviene de: plans.ts (features)

- **Qué representa:** Qué funcionalidades concede un plan y con qué límite.
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** plan, funcionalidad, límite opcional (por ejemplo, cantidad de fotos), vigencia.
- **Por qué es una entidad aparte:** Hace explícito que plan y permisos son cosas distintas. Se administra desde la administración interna y se audita; las contrataciones ya hechas se evalúan con la configuración vigente al contratar si así se decide (pendiente P3).
- **Relaciones:**
  - **es referida por** `Plan` (uno a muchos; «incluye»)
  - **es referida por** `Feature` (uno a muchos; «se concede en»)

### Subscription

*Ahora* · sensibilidad **Operativa** · proviene de: publications (plan y vencimiento)

- **Qué representa:** El derecho de un casamiento a usar un plan durante la vigencia única de 12 meses del evento. **Nace ya activa**: se crea en la misma operación en que Weda confirma el pago y publica el micrositio; no existe un estado ni un plazo entre el pago y la primera publicación.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** casamiento, plan, estado (activa, vencida, reemplazada, cancelada), orden y pago de origen, **inicio de vigencia = el momento en que Weda confirma el pago y activa la publicación** (un único instante: es a la vez la confirmación del pago, la activación comercial y la primera publicación efectiva; si el proveedor avisa con demora se usa el momento de la confirmación de Weda y la hora que informó el proveedor se guarda aparte, en el pago), **fecha de vencimiento** (inicio + 12 meses calendario), **copia de las funcionalidades y límites vigentes al contratar**, suscripción a la que reemplaza (solo por mejora de plan; **no existe renovación ni extensión**), **ficha comercial del evento** congelada al finalizar (nombres de la pareja y fecha de la boda tal como figuraban, plan, inicio y vencimiento).
- **Por qué es una entidad aparte:** Es el único reloj de la vigencia. **Pagar, activar y publicar son una única acción**: crear un borrador, registrarse, completar el onboarding, iniciar el checkout o hacer clic en pagar sin confirmación **no** inician la vigencia; la inicia la confirmación del pago por Weda. Una republicación, una baja, una mejora de plan o un cambio de fecha del casamiento no la reinician ni extienden. Durante los 12 meses el evento está completamente operativo. **Al cumplirse, el evento pasa a finalizado y `vencida` es un estado terminal**: se bloquea toda edición, publicación, gestión y exportación para todos los roles; el acceso de la pareja al evento se cierra; no hay renovación, extensión ni reactivación. Lo que vence se evalúa en el servidor con la fecha en cada pedido, sin depender de que haya corrido un trabajo. Invariantes: una sola vigente por casamiento; el inicio de la suscripción, la confirmación del pago y la primera publicación comparten el mismo instante; ningún contrato nuevo sobre un casamiento finalizado (un plan nuevo se contrata para un casamiento nuevo). Las funcionalidades habilitadas se derivan de esta entidad. **La ficha comercial permite que la cuenta del propietario muestre el evento como «Finalizado» (junto con el historial de órdenes y pagos) sin dar acceso a ningún dato del evento y aunque los datos del casamiento ya hayan sido depurados**; su plazo de conservación se valida con asesoramiento (P34, P30).
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «contrata»)
  - **de** → `Plan` (muchos a uno (obligatoria))
  - **originada en** → `Order` (muchos a cero o uno (opcional))
  - **reemplaza a (mejora)** → `Subscription` (muchos a cero o uno (opcional))
  - **es referida por** `Subscription` (muchos a cero o uno (opcional); «reemplaza a (mejora)»)

### Order

*Ahora* · sensibilidad **Financiera** · proviene de: orders

- **Qué representa:** Una compra de Weda a una pareja (plan inicial o mejora de un plan vigente; **no hay renovación del mismo evento**).
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** casamiento, tipo (compra, mejora), moneda, total, estado (pendiente, pagada, fallida, cancelada), cupón aplicado, fechas.
- **Por qué es una entidad aparte:** Se separa del pago: una orden puede tener varios intentos. No se mezclan monedas. Es registro contable de Weda: clase financiera B1. **No se confirma sin la aceptación de las condiciones de vigencia** (`TermsAcceptance`). **Al confirmarse el pago, en la misma operación, se activa la contratación y se publica el micrositio**: no hay una orden «pagada y esperando publicación».
- **Relaciones:**
  - **es referida por** `Subscription` (muchos a cero o uno (opcional); «originada en»)
  - **es referida por** `Wedding` (uno a muchos; «compra»)
  - **detalla** → `OrderLine` (uno a uno o más)
  - **se paga con** → `Payment` (uno a muchos)
  - **es referida por** `CouponRedemption` (muchos a uno (obligatoria); «en»)
  - **se factura en** → `Invoice` (uno a muchos)
  - **es referida por** `TermsAcceptance` (muchos a cero o uno (opcional); «condiciona la confirmación de»)

### OrderLine

*Ahora* · sensibilidad **Financiera** · proviene de: orders (plan_id, amount)

- **Qué representa:** Un renglón de una orden: un plan, una mejora o un descuento.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** orden, tipo, **precio aplicado (referencia a `PlanPrice`) y copia del importe**, moneda, descripción.
- **Por qué es una entidad aparte:** Conserva el precio contratado aunque después cambie la lista: una modificación de precios nunca altera retroactivamente compras anteriores.
- **Relaciones:**
  - **es referida por** `Order` (uno a uno o más; «detalla»)
  - **aplica el precio** → `PlanPrice` (muchos a cero o uno (opcional))

### Payment

*Ahora* · sensibilidad **Financiera** · proviene de: orders (provider, provider_ref)

- **Qué representa:** Un intento de pago de una orden de Weda.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** orden, proveedor, importe y moneda, estado, referencia del proveedor, clave de idempotencia, **momento en que Weda confirma el pago** (es el inicio de la vigencia) y, aparte, **la hora que informó el proveedor** (para trazabilidad, sin usarse como inicio).
- **Por qué es una entidad aparte:** Es el dinero que la pareja le paga a Weda, distinto del dinero de los regalos. Se mantiene en otro dominio porque la contraparte, las reglas y la facturación son otras. Comparte con los regalos solo el patrón técnico (notificaciones del proveedor).
- **Relaciones:**
  - **es referida por** `Order` (uno a muchos; «se paga con»)
  - **confirmado por** → `ProviderEvent` (muchos a cero o uno (opcional))
  - **se devuelve con** → `Refund` (uno a muchos)

### Coupon

*Preparar* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Un código de descuento de Weda.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** código, tipo de descuento, moneda o porcentaje, vigencia, usos máximos, planes alcanzados.
- **Por qué es una entidad aparte:** Se diseña el lugar; no se construye hasta que haya una campaña que lo necesite.
- **Relaciones:**
  - **se canjea** → `CouponRedemption` (uno a muchos)

### CouponRedemption

*Preparar* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** El uso de un cupón en una orden.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** cupón, orden, importe descontado y su moneda.
- **Por qué es una entidad aparte:** Permite límites de uso y medir campañas.
- **Relaciones:**
  - **es referida por** `Coupon` (uno a muchos; «se canjea»)
  - **en** → `Order` (muchos a uno (obligatoria))

### Invoice

*Después* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** La factura o **comprobante de compra de Weda** que se emite a una pareja (no es un comprobante cargado por un invitado: esos son `PaymentProof`).
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** orden, tipo y número, datos fiscales del comprador, importes con su moneda, fecha, referencia del organismo fiscal.
- **Por qué es una entidad aparte:** Requiere definir el régimen impositivo con un contador. No se modela físicamente todavía.
- **Relaciones:**
  - **es referida por** `Order` (uno a muchos; «se factura en»)

### Refund

*Después* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** La devolución de un pago de Weda.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** pago, importe y moneda (la del pago), motivo, estado, quién lo aprobó.
- **Por qué es una entidad aparte:** Documentado; la política de reembolsos es una decisión comercial pendiente.
- **Relaciones:**
  - **es referida por** `Payment` (uno a muchos; «se devuelve con»)

---

## Adquisición y marketing

Visitantes, campañas, leads y atribución, antes de que exista una cuenta.

### Visitor

*Preparar* · sensibilidad **Pseudónimo** · proviene de: —

- **Qué representa:** Un navegador anónimo que visitó Weda (no una persona identificada).
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** identificador anónimo, primera y última visita, primer origen conocido, estado de consentimiento de analítica.
- **Por qué es una entidad aparte:** Sin visitante no hay forma de unir la visita con el registro posterior. Se asocia a un dispositivo/navegador, nunca se «fusiona» con otra persona por compartir equipo.
- **Relaciones:**
  - **genera** → `VisitSession` (uno a muchos)
  - **se identifica en** → `IdentityLink` (uno a muchos)

### VisitSession

*Preparar* · sensibilidad **Pseudónimo** · proviene de: —

- **Qué representa:** Una sesión de navegación con su origen.
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** visitante, inicio, página de entrada, referente, parámetros de campaña (fuente, medio, campaña, contenido, término), tipo de dispositivo, país aproximado.
- **Por qué es una entidad aparte:** Guarda cada «toque» de adquisición. La atribución se calcula después sobre estos toques; no se pisa el origen en cada visita.
- **Relaciones:**
  - **es referida por** `Visitor` (uno a muchos; «genera»)
  - **es referida por** `Campaign` (uno a muchos; «origina»)
  - **es referida por** `Lead` (muchos a cero o uno (opcional); «capturado en»)
  - **es referida por** `ProductEvent` (muchos a cero o uno (opcional); «ocurre en»)

### Campaign

*Preparar* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Una campaña propia de Weda con un identificador interno.
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** clave de campaña, nombre, canal, fechas, objetivo, responsable.
- **Por qué es una entidad aparte:** Da nombre y orden a los parámetros de campaña y permite agrupar los gastos.
- **Relaciones:**
  - **origina** → `VisitSession` (uno a muchos)
  - **gasta** → `CampaignSpend` (uno a muchos)

### Lead

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Una persona que dejó sus datos por interés comercial, todavía sin cuenta.
- **Clase de retención:** `D` — Comercial y marketing (categoría D)
- **Contiene (conceptualmente):** correo o teléfono, formulario de origen, fecha, estado (nuevo, contactado, convertido, descartado), toque de adquisición asociado, clave anti-duplicado.
- **Por qué es una entidad aparte:** Un lead no es un usuario ni un invitado. Evita confundir quien pidió información con quien creó un casamiento.
- **Relaciones:**
  - **queda vinculado en** → `IdentityLink` (uno a muchos)
  - **capturado en** → `VisitSession` (muchos a cero o uno (opcional))

### IdentityLink

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** El vínculo, con evidencia y fecha, entre un visitante anónimo y una identificación posterior (lead o usuario).
- **Clase de retención:** `D` — Comercial y marketing (categoría D)
- **Contiene (conceptualmente):** visitante, lead o usuario, método (formulario, registro, ingreso), fecha, consentimiento vigente.
- **Por qué es una entidad aparte:** Une la visita anónima con la conversión cuando es técnica y legalmente posible, sin fusionar identidades por inercia. Se puede borrar el vínculo sin perder los eventos agregados.
- **Relaciones:**
  - **es referida por** `Visitor` (uno a muchos; «se identifica en»)
  - **es referida por** `Lead` (uno a muchos; «queda vinculado en»)
  - **es referida por** `User` (uno a muchos; «queda vinculado en»)

### CampaignSpend

*Después* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** La inversión de una campaña en un período.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** campaña, fecha, importe, moneda.
- **Por qué es una entidad aparte:** Permite costo por lead y por adquisición. Se agrega cuando haya inversión real.
- **Relaciones:**
  - **es referida por** `Campaign` (uno a muchos; «gasta»)

### ReferralCode

*Después* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Un código para que una pareja refiera a otra.
- **Clase de retención:** `D` — Comercial y marketing (categoría D)
- **Contiene (conceptualmente):** casamiento dueño, código, vigencia, beneficio.
- **Por qué es una entidad aparte:** Documentado como extensión de crecimiento.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «refiere con»)

---

## Analítica de producto

Eventos de comportamiento y de negocio, separados de los datos transaccionales.

### ProductEvent

*Ahora* · sensibilidad **Pseudónimo** · proviene de: funnel_events

- **Qué representa:** Un hecho de comportamiento o de negocio, con el sobre común de eventos.
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** identificador único del evento, **clave de idempotencia** (única por origen: un hecho de negocio produce un solo evento aunque se reintente), nombre, **versión del esquema**, momento del hecho y momento de recepción, origen (navegador o servidor), identificador anónimo, sesión, **seudónimo de usuario y de casamiento** (identificadores aleatorios propios de la analítica, no las claves operativas; se borran al eliminar la cuenta o el casamiento), página, propiedades de una lista cerrada.
- **Por qué es una entidad aparte:** Hoy el evento no dice quién ni de qué sesión es, así que no se pueden armar embudos. Es solo de agregar y se mantiene separado físicamente de las tablas transaccionales para poder moverlo a otro almacenamiento.
- **Relaciones:**
  - **ocurre en** → `VisitSession` (muchos a cero o uno (opcional))

### WeddingMonthlySnapshot

*Preparar* · sensibilidad **Pseudónimo** · proviene de: —

- **Qué representa:** La **fotografía mensual por casamiento**: una fila por casamiento y mes con indicadores resumidos, derivada por lectura de lo operativo y lo financiero (segunda capa de la analítica).
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** **seudónimo de casamiento** (no la clave operativa), mes, estados al cierre del mes (operativo, público, de retención), plan contratado, meses transcurridos desde la activación, días hasta la boda en rangos, cantidades (bloques por tipo, regalos, invitaciones, personas autorizadas, respuestas, personas que asistirán, aportes por estado), **importes y cantidades por moneda** (moneda siempre explícita, nunca sumadas), sesiones del panel en el mes, versión de la definición.
- **Por qué es una entidad aparte:** Permite cohortes y retención sin conservar la secuencia de acciones ni datos de invitados individuales: **ningún dato de personas**, solo cantidades. Sin clave hacia lo operativo; el seudónimo se borra al eliminar el casamiento. Vive 25 meses y luego solo sobreviven los agregados evaluados (`05-analytics-architecture.md`). No es fuente de verdad: se recalcula desde lo operativo y lo financiero con consultas de solo lectura.

### OutboxEvent

*Preparar* · sensibilidad **Pseudónimo** · proviene de: —

- **Qué representa:** Un evento de negocio crítico escrito en la misma transacción que el cambio que lo origina, para enviarlo después a un sistema externo.
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** identificador, nombre, carga, estado de envío, intentos, fechas.
- **Por qué es una entidad aparte:** Garantiza que un registro o una publicación no pierda su evento si falla el envío. Solo hace falta cuando haya un destino externo; mientras los eventos vivan en la misma base alcanza con escribirlos en la misma transacción.

### AggregateMetric

*Ahora* · sensibilidad **Anónima** · proviene de: —

- **Qué representa:** Una métrica histórica **agregada y anonimizada** (por ejemplo, conversión de registro a publicación, importe promedio de regalos por moneda).
- **Clase de retención:** `C` — Analítica de producto (categoría C)
- **Contiene (conceptualmente):** clave de la métrica y versión de su definición, período (mes), dimensiones gruesas (plan, moneda, dispositivo, canal en categorías amplias), valor, cantidad de casos, momento de cálculo, **referencia a la evaluación de riesgo de privacidad que autorizó conservarla** (sin evaluación aprobada no se guarda sin plazo).
- **Por qué es una entidad aparte:** Permite conservar la evolución del negocio sin conservar a las personas. Sin identificadores ni vínculo con casamientos, usuarios o invitados; con **control de celdas pequeñas** (agrupar u omitir) como una de varias medidas, **sin asumir** que un umbral por sí solo garantice anonimización (ver `05-analytics-architecture.md` §7). Nunca mezcla monedas. Se conserva sin vencimiento automático **solo después de la evaluación de riesgo**; una métrica sin evaluación aprobada se trata como dato de la capa con plazo.

---

## Mensajería

Todo lo que Weda envía a una persona y su estado de entrega.

### OutboundMessage

*Ahora* · sensibilidad **PII** · proviene de: mail_log

- **Qué representa:** Un mensaje saliente de Weda a una persona por un canal (correo hoy, WhatsApp mañana).
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** canal, propósito (constancia de regalo, recuperar clave, invitación, **aviso de vencimiento**), destinatario, contenido por plantilla y versión, **clave de idempotencia** (única por mensaje lógico; por ejemplo, suscripción + aviso de 30, 7 o 1 día), estado (en cola, enviado al proveedor, entregado, rebotado, fallido, omitido) —**intentar enviar no es haber entregado**—, referencia del proveedor, intentos, entidad relacionada.
- **Por qué es una entidad aparte:** Generaliza el registro de correos: sirve a notificaciones, invitaciones y marketing y permite reintentos sin duplicar envíos. Nunca guarda el cuerpo completo si contiene datos sensibles. Los avisos de vencimiento usan una clave determinista para no enviarse dos veces y solo pasan a «entregado» cuando el proveedor lo notifica (`MessageDeliveryEvent`); un fallo se reintenta y se registra, nunca se da por entregado.
- **Relaciones:**
  - **es referida por** `InvitationDelivery` (muchos a cero o uno (opcional); «usa»)
  - **recibe estados** → `MessageDeliveryEvent` (uno a muchos)
  - **es referida por** `PayoutMethodChange` (muchos a cero o uno (opcional); «se notifica con»)

### MessageDeliveryEvent

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Una actualización de entrega de un mensaje (entregado, rebotado, abierto, clic).
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** mensaje, tipo, fecha, referencia del proveedor.
- **Por qué es una entidad aparte:** Los estados de entrega llegan después del envío; van aparte para no reescribir el mensaje.
- **Relaciones:**
  - **es referida por** `OutboundMessage` (uno a muchos; «recibe estados»)

### NotificationPreference

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Qué avisos quiere recibir un usuario y por qué canal.
- **Clase de retención:** `U` — Cuenta
- **Contiene (conceptualmente):** usuario, tipo de aviso, canal, activo.
- **Por qué es una entidad aparte:** Separa preferencias operativas (avisarme de un regalo) del consentimiento de marketing, que es otro derecho.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «prefiere»)

---

## Privacidad y consentimiento

Consentimientos, aceptaciones legales y derechos de las personas sobre sus datos.

### CommunicationConsent

*Ahora* · sensibilidad **PII** · proviene de: marketing_consents

- **Qué representa:** El consentimiento expreso de una persona para recibir comunicaciones comerciales por un canal y con un propósito.
- **Clase de retención:** `D` — Comercial y marketing (categoría D)
- **Contiene (conceptualmente):** contacto (correo o teléfono normalizado), canal, propósito, texto y versión aceptados, origen (formulario, regalo, RSVP), fecha de alta y de baja, evidencia mínima.
- **Por qué es una entidad aparte:** Hoy está limitado a correo y a dos orígenes. Debe ser independiente de aceptar términos y de la cuenta, para poder demostrar cuándo y qué se aceptó y respetar la baja.
- **Relaciones:**
  - **origen** → `Wedding` (muchos a cero o uno (opcional))

### TermsAcceptance

*Ahora* · sensibilidad **PII** · proviene de: —

- **Qué representa:** La aceptación expresa de un documento por un usuario: términos de uso, política de privacidad y, **antes de confirmar una contratación, las condiciones de vigencia del evento**: (1) 12 meses desde que Weda confirma el pago y activa la publicación; (2) registrarse, crear el borrador, completar el onboarding o iniciar el pago sin confirmación no inician el plazo; (3) despublicar o republicar no reinicia ni extiende la vigencia; (4) la fecha de la boda no modifica el vencimiento; (5) al vencer el evento se cierra, sin renovación ni extensión; (6) después del vencimiento no hay acceso al panel ni exportaciones.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** **usuario que aceptó**, **casamiento y orden de contratación relacionados** (para las condiciones de vigencia), tipo de documento, **versión identificable** de los términos y huella (hash) del texto exactamente mostrado, **fecha y hora de aceptación** (del servidor), **evidencia de aceptación** (acción expresa y separada, sesión y dispositivo resumidos; guardar o no la dirección IP es un punto pendiente de validación legal), cláusulas aceptadas.
- **Por qué es una entidad aparte:** Aceptar los términos no es consentir marketing. **La contratación no se confirma sin la aceptación vigente de las condiciones de vigencia**, verificada en el servidor y vinculada a esa orden. Es evidencia contractual: **solo se agrega, nunca se edita**; una versión nueva de los términos no altera lo aceptado antes (la vigencia de un evento ya contratado no cambia). Hoy no queda constancia.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «acepta»)
  - **condiciona la confirmación de** → `Order` (muchos a cero o uno (opcional))
  - **refiere a** → `Wedding` (muchos a cero o uno (opcional))

### DeletionRequest

*Ahora* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Una solicitud de acceso, rectificación, portabilidad, oposición o eliminación (de cuenta o de casamiento), y su procedimiento.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** solicitante, tipo, alcance, estado (recibida, identidad verificada, pendiente de resolver propiedad, en período de gracia, ejecutándose, completada, cancelada, rechazada con motivo), plazos, pasos cumplidos, resultado, quién la resolvió.
- **Por qué es una entidad aparte:** Convierte un derecho en un proceso con plazo y trazabilidad. Es un **procedimiento separado del acceso comercial al producto**: atender un derecho de acceso, rectificación o supresión (también sobre un evento cerrado) **no reactiva el evento ni vuelve a habilitar el panel**; se verifica la identidad, lo resuelve personal autorizado y se entrega un informe puntual y auditado. Es obligatorio para poder eliminar cuentas de forma auditable (Q8): resuelve primero la propiedad de las bodas activas, revoca sesiones y accesos y ejecuta la anonimización conservando solo lo que tiene fundamento.
- **Relaciones:**
  - **es referida por** `User` (uno a muchos; «solicita»)

### DataExportJob

*Ahora* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Una exportación de los datos de un casamiento. Alcances: invitados y respuestas, regalos y aportes, comprobantes (archivo comprimido), resumen financiero; **disponibles solo durante los 12 meses de vigencia**: al vencer el evento se bloquean las descargas y exportaciones.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** casamiento, solicitante, alcance, formato, hora de corte de los datos, archivo generado (temporal), estado, vencimiento del enlace y del archivo, cantidad descargas.
- **Por qué es una entidad aparte:** La pareja descarga sus datos mientras el evento está vigente; no hay ventana adicional. También sirve a la portabilidad y deja registro de quién exportó datos de terceros. El archivo generado contiene datos personales: se elimina a poco de generarse y puede volver a generarse mientras el evento esté vigente. Los pedidos de derechos de una persona (acceso, supresión) **no** pasan por esta función: tienen su propio canal (`DeletionRequest`, `02b`).
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «exporta»)

---

## Plataforma y auditoría

Auditoría, seguridad, personal interno e integraciones con proveedores externos.

### AuditLog

*Ahora* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** El registro de acciones sensibles, atribuibles a un actor, separado en flujos con retención distinta.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** actor (usuario, personal de Weda, sistema, invitado por capacidad), acción, **categoría (seguridad, financiera, administración, privacidad)**, casamiento afectado (opcional), referencia de lo afectado, cambios mínimos **sin datos sensibles** (huellas o valores enmascarados), dispositivo resumido, fecha.
- **Por qué es una entidad aparte:** Quién cambió un rol, un alias o un precio, quién confirmó un aporte, quién publicó, quién accedió como soporte. Es el único lugar donde se admite una referencia genérica a «tipo + id»: es de solo agregar y debe sobrevivir a lo que describe. Los registros financieros y de administración tienen retención propia.
- **Relaciones:**
  - **afecta a** → `Wedding` (muchos a cero o uno (opcional))
  - **realizada por** → `User` (muchos a cero o uno (opcional))

### SecurityEvent

*Preparar* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Eventos de seguridad de cuenta: inicios fallidos, cambios de clave, accesos desde dispositivos nuevos, bloqueos.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** usuario o contacto, tipo, resultado, dispositivo resumido, fecha.
- **Por qué es una entidad aparte:** Base para alertas y detección de abuso; hoy los límites de intentos viven en memoria y se pierden al reiniciar.

### StaffRole

*Ahora* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Un rol interno de Weda sobre un usuario (administración de precios, soporte, finanzas).
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** usuario, rol, quién lo otorgó, fechas, vigencia.
- **Por qué es una entidad aparte:** La administración interna de precios (Q5) necesita identificar al responsable. Exige segundo factor y cada acción queda en `AuditLog`. El personal usa la misma tabla de usuarios, pero sus permisos son sobre la plataforma, no sobre un casamiento.
- **Relaciones:**
  - **es referida por** `User` (uno a cero o uno; «es personal de Weda»)

### ProviderEvent

*Ahora* · sensibilidad **Financiera** · proviene de: payment_events (generaliza)

- **Qué representa:** Una notificación recibida de un proveedor externo (webhook) y su procesamiento.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** proveedor, identificador del evento, firma verificada, huella de la carga, estado (recibido, procesado, ignorado, fallido), intentos, fechas.
- **Por qué es una entidad aparte:** Garantiza que cada notificación se procese una sola vez, sirve a regalos y a facturación y deja registro de los fallos. Es el patrón de «bandeja de entrada» común a las integraciones.
- **Relaciones:**
  - **es referida por** `GiftTransaction` (muchos a cero o uno (opcional); «confirmada por»)
  - **es referida por** `Payment` (muchos a cero o uno (opcional); «confirmado por»)

### BackgroundJob

*Preparar* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Una tarea diferida con reintentos (enviar un correo, procesar una importación, exportar datos).
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** tipo, carga, estado, intentos, próxima ejecución, error.
- **Por qué es una entidad aparte:** Evita hacer trabajo lento dentro de la petición y reintentar sin duplicar. Solo se justifica cuando haya envíos en volumen.

### FeatureFlag

*Después* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Un interruptor de funcionalidades para activarlas gradualmente.
- **Clase de retención:** `R` — Referencia y configuración
- **Contiene (conceptualmente):** clave, estado, alcance, fechas.
- **Por qué es una entidad aparte:** Distinto de los permisos por plan. Puede resolverse con configuración hasta que haga falta experimentar.

### RetentionRun

*Preparar* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Una ejecución auditable del procedimiento de retención: qué categoría se procesó, con qué política y qué se eliminó o anonimizó.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** categoría (A, B, C, D), versión de la política posterior al cierre, alcance (casamiento o lote), cantidades por tipo de dato, estado, fechas, errores.
- **Por qué es una entidad aparte:** Eliminar datos es una operación destructiva e irreversible: debe ser repetible, reanudable y demostrable. Registra cantidades, no datos eliminados. **No se ejecuta en el momento del vencimiento por defecto**: aplica la política posterior al cierre (plazos por clase, a validar con asesoramiento) y exige que las métricas del evento estén calculadas. La política es una configuración versionada, sin plazos fijos en el código.

---

## Marketplace (futuro)

Proveedores de servicios y publicidad. Solo documentado.

### Vendor

*Después* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Un negocio proveedor de servicios para casamientos (salón, fotografía, catering).
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** razón social, estado, plan, contacto comercial.
- **Por qué es una entidad aparte:** Es una cuenta distinta de una pareja. Se separa para que proveedor y casamiento nunca compartan tablas ni permisos.
- **Relaciones:**
  - **tiene** → `VendorMember` (uno a muchos)
  - **publica** → `VendorProfile` (uno a cero o uno)
  - **ofrece** → `VendorService` (uno a muchos)
  - **recibe** → `Inquiry` (uno a muchos)
  - **recibe** → `Review` (uno a muchos)
  - **contrata** → `AdCampaign` (uno a muchos)

### VendorMember

*Después* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** La pertenencia de un usuario a un proveedor, con rol.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** proveedor, usuario, rol, estado.
- **Por qué es una entidad aparte:** Misma idea que la membresía de un casamiento. Un mismo usuario puede participar en ambos mundos.
- **Relaciones:**
  - **es referida por** `Vendor` (uno a muchos; «tiene»)
  - **es referida por** `User` (uno a muchos; «participa en»)

### VendorProfile

*Después* · sensibilidad **Pública** · proviene de: —

- **Qué representa:** El perfil público comercial de un proveedor.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** nombre, descripción, categorías, zonas, portfolio, contacto público.
- **Por qué es una entidad aparte:** Lo que ven las parejas; moderable.
- **Relaciones:**
  - **es referida por** `Vendor` (uno a cero o uno; «publica»)

### VendorService

*Después* · sensibilidad **Pública** · proviene de: —

- **Qué representa:** Un servicio ofrecido por un proveedor.
- **Clase de retención:** `W` — Contenido de la pareja
- **Contiene (conceptualmente):** proveedor, nombre, categoría, rango de precios, moneda.
- **Por qué es una entidad aparte:** Habilita búsqueda y filtros.
- **Relaciones:**
  - **es referida por** `Vendor` (uno a muchos; «ofrece»)

### Inquiry

*Después* · sensibilidad **PII** · proviene de: —

- **Qué representa:** Una consulta comercial de una pareja a un proveedor.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, proveedor, mensaje, datos compartidos con consentimiento, estado.
- **Por qué es una entidad aparte:** Es el lead que Weda deriva. Solo expone los datos que la pareja decidió compartir.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «consulta»)
  - **es referida por** `Vendor` (uno a muchos; «recibe»)

### Review

*Después* · sensibilidad **Pública** · proviene de: —

- **Qué representa:** Una reseña de una pareja sobre un proveedor.
- **Clase de retención:** `A` — Datos personales y operativos (categoría A)
- **Contiene (conceptualmente):** casamiento, proveedor, puntaje, texto, estado de moderación.
- **Por qué es una entidad aparte:** Requiere moderación y verificación de que hubo una relación real.
- **Relaciones:**
  - **es referida por** `Wedding` (uno a muchos; «escribe»)
  - **es referida por** `Vendor` (uno a muchos; «recibe»)
  - **se modera en** → `ModerationCase` (uno a muchos)

### ModerationCase

*Después* · sensibilidad **Operativa** · proviene de: —

- **Qué representa:** Un caso de moderación sobre una reseña o un perfil.
- **Clase de retención:** `S` — Seguridad, auditoría y operación
- **Contiene (conceptualmente):** objeto, motivo, decisión, quién resolvió.
- **Por qué es una entidad aparte:** Trazabilidad de decisiones de contenido.
- **Relaciones:**
  - **es referida por** `Review` (uno a muchos; «se modera en»)

### AdCampaign

*Después* · sensibilidad **Financiera** · proviene de: —

- **Qué representa:** Una campaña publicitaria de un proveedor.
- **Clase de retención:** `B1` — Registros financieros y contractuales de Weda (categoría B)
- **Contiene (conceptualmente):** proveedor, ubicación, vigencia, presupuesto, estado.
- **Por qué es una entidad aparte:** Anuncios y posiciones patrocinadas deben tener su propia facturación y medición.
- **Relaciones:**
  - **es referida por** `Vendor` (uno a muchos; «contrata»)
