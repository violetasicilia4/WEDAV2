# Weda · Product Blueprint

**Auditoría integral y documento maestro del producto** · Fecha de la auditoría: 2026-10-31

Este documento reúne en un solo lugar qué es Weda, qué está realmente construido, qué falta y si las reglas son coherentes entre sí. **No es un diseño nuevo ni una fase de implementación:** no se modificó código, base de datos, API ni documentos originales. Todo lo que afirma sobre el código fue verificado leyendo el código (no los informes previos).

**Anexos** (la profundidad vive ahí; este documento los resume y los cita):
[01 · Inventario de funcionalidades](01-feature-inventory.md) · [02 · Catálogo de reglas de negocio](02-business-rules-catalog.md) · [03 · Decisiones abiertas, inconsistencias y riesgos](03-open-decisions-and-risks.md) · [04 · Preparación comercial](04-mvp-readiness.md) · [05 · Roadmap propuesto](05-implementation-roadmap.md)

## Cómo leer los estados

| Estado | Significa |
|---|---|
| **DECIDIDO** | La dueña lo aprobó explícitamente |
| **DOCUMENTADO** | Está en documentos; no consta aprobación explícita |
| **IMPLEMENTADO** | Verificado directamente en el código |
| **PROBADO** | Hay pruebas automáticas que lo cubren |
| **PARCIAL** | Existe una parte; falta otra |
| **PENDIENTE** | Falta una decisión |
| **NO IMPLEMENTADO** | Está diseñado pero no existe en el código |
| **NO VERIFICADO** | No hay evidencia en ningún sentido |

Dos advertencias que se aplican a todo el documento: **que una entidad exista en el modelo conceptual no significa que la función exista en la aplicación**, y **que una prueba pase no es validación en producción** (las pruebas usan una base temporal y un adaptador de pago de prueba; nunca tocaron un proveedor, un correo ni un dominio reales).

## Evidencia reunida el 2026-10-31

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npx vitest run` | **195 de 195 pruebas pasan** (18 archivos: 127 de interfaz y lógica en 10 archivos; 68 de servidor en 8) |
| Pruebas E2E (navegador) | **No se ejecutaron** en esta auditoría → NO VERIFICADO |
| `npm run build`, navegador real móvil/desktop | No se ejecutaron (la tarea prohíbe cambiar el comportamiento y no era necesario para auditar) |
| Servicios reales (pagos, correo, dominio con HTTPS), pruebas de carga, pruebas con personas | No existen |

---

## Índice

1. [Visión del producto](#1-visión-del-producto)
2. [Mapa completo del producto](#2-mapa-completo-del-producto)
3. [Flujos completos](#3-flujos-completos)
4. [Reglas de negocio](#4-reglas-de-negocio)
5. [Modelo de datos](#5-modelo-de-datos)
6. [Estado real de implementación](#6-estado-real-de-implementación)
7. [UX y experiencia](#7-ux-y-experiencia)
8. [Seguridad, privacidad y finanzas](#8-seguridad-privacidad-y-finanzas)
9. [Inconsistencias y decisiones pendientes](#9-inconsistencias-y-decisiones-pendientes)
10. [Qué falta para vender Weda](#10-qué-falta-para-vender-weda)
11. [Roadmap propuesto](#11-roadmap-propuesto)
12. [Resumen ejecutivo para la dueña](#12-resumen-ejecutivo-para-la-dueña)

---

## 1. Visión del producto

Solo se usa el posicionamiento que respaldan `PRODUCT.md` y las decisiones documentadas. Lo que no está respaldado se marca como tal.

**Qué es Weda.** Una aplicación web en español rioplatense que crea y gestiona la experiencia digital de un casamiento: una **página pública del evento** (micrositio) con su **lista de regalos simbólicos**, la **gestión de invitados y confirmaciones de asistencia (RSVP)**, mesas y vista previa. *(DOCUMENTADO: `PRODUCT.md`, `CLAUDE.md`. IMPLEMENTADO en gran parte; ver capítulo 6.)*

**Problema que resuelve.** Organizar en un solo lugar la invitación, las confirmaciones y los regalos de un casamiento, sin planillas ni mensajes dispersos. *(DOCUMENTADO.)*

| Aspecto | Qué dicen las fuentes | Estado |
|---|---|---|
| Usuario principal | La pareja que organiza el casamiento, aprox. 22 a 35 años | DOCUMENTADO (`PRODUCT.md`); no hay investigación con personas que lo respalde → NO VERIFICADO |
| Usuario secundario | El invitado: ve la página, confirma asistencia y elige cómo regalar | IMPLEMENTADO |
| Propuesta de valor | Una página bonita y simple, más una lista de regalos que ordena y acompaña los aportes de los invitados | DOCUMENTADO |
| Diferencial | **La lista de regalos unida al micrositio** | DOCUMENTADO (`PRODUCT.md`); la competencia no fue investigada en esta auditoría → NO VERIFICADO |
| Función principal | Que los invitados puedan regalar (transferencia a un alias que muestra la pareja) y la pareja lleve el control | IMPLEMENTADO con límites serios (cap. 8) |
| Planes | Matriz de planes en pesos argentinos (`src/lib/weda/plans.ts`) | IMPLEMENTADO; los precios definitivos y si incluyen impuestos son **PENDIENTES** (DP-17) |

**Principio que atraviesa todo: Weda no custodia ni verifica dinero.** Los invitados transfieren directamente a la cuenta de la pareja; Weda solo registra el aporte y el comprobante que carga el invitado. La pareja confirma a mano. *(DECIDIDO.)* El código respeta esto en lo esencial (no mueve dinero), pero la interfaz todavía usa palabras como «recibido» que sugieren una verificación que no existe (IC-07).

**Regla comercial central.** Una única contratación por evento con **vigencia de 12 meses desde la confirmación del pago de Weda**; pagar significa **activar y publicar** el evento; sin renovación, extensión ni reactivación; al vencer, la URL queda «no disponible» y el evento se cierra para todos. *(DECIDIDO.)* **El código hace otra cosa** (cap. 4 y 9).

**Fuera de alcance (no existe ni está comprometido)**: marketplace de proveedores, cupones y referidos, Spotify real, directorio público de invitaciones, envío de invitaciones por correo o WhatsApp (todavía sin decidir), tarjeta de crédito como medio de regalo (sin decidir), planes en USD (sin decidir). Ver DP-10, DP-16, DP-18, DP-22 y PO-04…PO-07.

**Lo que no se afirma:** no hay datos de mercado, métricas de uso ni testimonios verificados. Los testimonios de la landing son los cargados por la dueña el 2026-10-29 y su autenticidad y permiso están sin confirmar (DP-19).

---

## 2. Mapa completo del producto

Estado real = lo que se verificó en el código y las pruebas. Detalle por funcionalidad (102 en total) en el [anexo 01](01-feature-inventory.md).

| Módulo | Objetivo | Qué hace hoy | Usuario | Depende de | Estado real |
|---|---|---|---|---|---|
| **Landing y adquisición** (LAN) | Convencer y llevar al registro | Página de venta, planes, FAQ, ejemplo público `/ejemplo`, testimonios | Visitante | Textos de planes y vigencia | IMPLEMENTADO; los textos dicen 6 meses (IC-02); poco probado (5 de 7 sin pruebas) |
| **Registro y acceso** (AUTH) | Crear cuenta y entrar | Registro con correo y clave (scrypt), cookie `HttpOnly`, recuperación de clave (token 1 h, un solo uso), CSRF por `Origin` | Pareja | Correo para recuperar | IMPLEMENTADO y PROBADO; Google = botón que informa que no está habilitado; sin verificar correo |
| **Onboarding** (ONB) | Pasar de cuenta a evento armado | Asistente de pasos con datos de la boda | Pareja | Registro | IMPLEMENTADO y PROBADO |
| **Contratación y planes** (PAY) | Cobrar el plan | Matriz de planes, orden de compra, **solo adaptador de prueba (`none`/`test`)**; sin proveedor real | Pareja | Proveedor de pagos (DP-15) | PARCIAL: la contratación real está NO IMPLEMENTADA (6 de 11 diseñadas) |
| **Panel · inicio y cuenta** (DASH) | Ver el estado y gestionar la cuenta | Resumen, perfil, cambio de clave, preferencias de correo | Pareja | Datos del evento | IMPLEMENTADO en parte; sin eliminación de cuenta ni exportación |
| **Lista de regalos y aportes** (GIFT) | El diferencial | Crear regalos, alias, aporte del invitado con comprobante obligatorio, revisión (API) | Pareja e invitado | Alias, comprobantes, libro | IMPLEMENTADO con **contradicciones** (regalo «tomado», sin botones de confirmar/rechazar); 7 de 14 diseñadas sin construir |
| **Micrositio y constructor** (SITE) | Armar la página | Editor de secciones, fotos (6 MB por guardado), vista previa, borrador | Pareja | Estado compartido `src/lib/weda/` | IMPLEMENTADO y PROBADO en lo central; rendimiento NO VERIFICADO |
| **Invitados y RSVP** (GST) | Saber quién viene | Lista de invitados, acompañantes, mesas, importación de planilla, formulario público | Pareja e invitado | — | IMPLEMENTADO y PROBADO; **RSVP por nombre normalizado** (sobrescribe); sin invitaciones personales |
| **Publicación y vigencia** (PUB) | Poner la página en línea y cerrarla | Publicar es una acción aparte; el snapshot público se congela; vence a los **6 meses**; la URL vencida responde 410 | Pareja | Pago, vigencia | PARCIAL: no existe cierre del evento, avisos de vencimiento ni exportaciones |
| **Correo, privacidad y datos** (PRIV) | Cumplir y comunicar | Envío por Resend si hay clave; consentimiento de marketing separado; páginas de términos y privacidad **en borrador** | Todos | Revisión legal | PARCIAL: correo real nunca probado; sin procedimiento de derechos |
| **Administración interna** (ADM) | Operar Weda | **No existe** | Equipo Weda | Roles de personal | NO IMPLEMENTADO |
| **Roles, membresías y eventos múltiples** (ACC) | Equipos y varios eventos | `weddings.owner_id UNIQUE`: un evento por cuenta | Pareja | Modelo de membresías | NO IMPLEMENTADO |
| **Analítica** (ANL) | Medir el negocio | Tabla `funnel_events` simple; sin identidad ni retención | Equipo Weda | Diseño de tres capas | Solo la versión simple; el diseño de tres capas NO IMPLEMENTADO |
| **Operación e infraestructura** (OPS) | Mantener el servicio | Servidor Nitro + SQLite local; `/api/health`; límites de uso en memoria | Equipo Weda | Hosting, respaldos | PARCIAL: sin hosting de producción, respaldos ni alertas definidos |

---

## 3. Flujos completos

Para cada flujo: **recorrido**, **fricciones o errores** y **pasos no implementados**. Todos los hallazgos son de lectura de código salvo que se indique.

### F-01 · Visitante → landing → registro
Recorrido: landing → planes → «Crear cuenta» → correo y clave → onboarding.
- Fricción: la landing y el diálogo de planes prometen **6 meses**; la decisión es 12 (IC-02). Falta la explicación previa de la vigencia (IC-24).
- No implementado: ingreso con Google (botón informativo); verificación de correo.

### F-02 · Crear un evento
Recorrido: onboarding → datos básicos → panel.
- Fricción: **un solo evento por cuenta** (IC-06): no se puede crear un segundo ni conservar el primero como histórico.
- No implementado: eventos múltiples, estados del evento (en armado / activo / finalizado).

### F-03 · Configurar regalos
Recorrido: panel de regalos → crear regalos → cargar alias y datos bancarios.
- Fricción: el alias se edita como cualquier campo, sin controles (IC-04); el plan «Regalos» promete «alias y tarjeta» y la tarjeta no existe (IC-07, DP-20).
- No implementado: versiones del alias, contraseña reciente, aviso al propietario.

### F-04 · Construir el micrositio
Recorrido: constructor → secciones → fotos → vista previa.
- Fricción: fotos limitadas a 6 MB por guardado (RK-15); no hay aviso de «cambios sin publicar» (NE-03).
- Rendimiento con 500 invitados y 100 regalos: NO VERIFICADO.

### F-05 · Contratar y pagar
Recorrido: elegir plan → orden → pago.
- **No existe pago real.** Solo un adaptador de prueba que, activado, marca la orden como paga. **Por defecto no se exige el pago para publicar** (`WEDA_REQUIRE_PAID_ORDER` apagado; IC-17).
- No implementado: proveedor, verificación de firma, conciliación, factura, cancelación y reembolso, aceptación versionada de condiciones (IC-22).

### F-06 · Activación y publicación automática
Regla DECIDIDA: pagar = activar + publicar, con un único instante de inicio.
- **No coincide con el código** (IC-01): el pago y la publicación son dos acciones; el plazo corre desde la **primera publicación manual** (IC-16), no desde el pago. Puede haber pago sin publicación.
- No implementado: mínimos de publicación (P35, DP-05), atomicidad e idempotencia de la activación.

### F-07 · Administrar invitados y RSVP
Recorrido: panel de invitados → agregar, importar planilla, acompañantes, mesas.
- Fricción: el servidor identifica la respuesta por nombre normalizado y la **sobrescribe** (IC-09).
- No implementado: invitaciones con enlace personal, cupos fijados por la pareja, historial de respuestas.

### F-08 · El invitado recibe la invitación y confirma
Recorrido: abre la URL pública → responde el formulario.
- Fricción: cualquiera que conozca el enlace puede responder por otra persona (RK-07). El correo del invitado es opcional en el servidor pero la documentación dice obligatorio (IC-12).
- No implementado: envío de la invitación (DP-22).

### F-09 · El invitado elige un regalo y carga el comprobante
Recorrido: elige regalo → ve el alias → transfiere por fuera → vuelve y carga el comprobante (obligatorio) y su correo.
- **Fricción grave:** un regalo con un aporte activo responde 409 y la página muestra «Ya elegido» (IC-03), contra la decisión de regalos repetibles.
- Importes sin moneda explícita (IC-23, RK-05).

### F-10 · La pareja revisa el comprobante
Recorrido: panel → aportes → ver comprobante.
- **Paso roto (IC-08):** la API para confirmar o rechazar existe y tiene pruebas, pero **el panel no tiene botones**. Un aporte nunca llega a «confirmado» desde la interfaz.
- La interfaz dice «recibido» (IC-07).

### F-11 · Modificar el alias
Recorrido: panel de regalos → editar el campo.
- Sin controles de seguridad (IC-04). Un acceso indebido a la cuenta cambia adónde se transfiere el dinero de los invitados.

### F-12 · El evento llega al vencimiento
- Hoy, a los **6 meses**, se bloquea publicar y la página pública responde 410. **La pareja sigue editando y gestionando** (IC-05). No hay avisos a 30, 7 y 1 día, ni descargas finales (RK-12).

### F-13 · La cuenta conserva el historial comercial de un evento finalizado
Regla DECIDIDA (P34): la cuenta conserva solo la información comercial del evento cerrado.
- **NO IMPLEMENTADO**: sin estado «finalizado» ni vista de historial (IC-06). Además, todas las tablas del casamiento tienen `ON DELETE CASCADE`: si en el futuro se borra un casamiento, se perderían en cascada también los registros financieros (IC-15, RK-05). Hoy no existe API de borrado, por lo que es un riesgo latente, no activo.

### F-14 · Crear un evento nuevo
Regla DECIDIDA: un evento nuevo es independiente.
- **NO IMPLEMENTADO** (IC-06, `owner_id UNIQUE`). Precio del plan para quien ya tuvo un evento: PENDIENTE (DP-10).

**Pasos transversales no implementados:** recuperar acceso tras vencer, soporte con visibilidad de órdenes y pagos (MV-21), eliminación de cuenta, procedimiento de derechos (MV-19).

---

## 4. Reglas de negocio

El catálogo completo es el [anexo 02](02-business-rules-catalog.md): **61 reglas (BR-01 a BR-61)**. Cada una indica aprobación, documentos, implementación actual, pruebas e inconsistencias, sin inventar reglas.

| Estado en el código | Reglas |
|---|---:|
| IMPLEMENTADO | 20 |
| PARCIAL | 11 |
| **CONTRADICE** lo decidido | **4** (BR-03, BR-19, BR-33, BR-43) |
| NO IMPLEMENTADO | 26 |

**Las reglas centrales y dónde chocan con el código**

| Regla (DECIDIDA) | Qué hace el código | Referencia |
|---|---|---|
| Vigencia de **12 meses desde la confirmación del pago** | 6 meses desde la primera publicación | IC-02, IC-16 |
| **Pagar = activar + publicar** | Dos acciones separadas | IC-01 |
| Publicar exige pago confirmado | Apagado por defecto | IC-17 |
| Al vencer, **cierre definitivo** para todos los roles | Solo se bloquea publicar; la pareja sigue editando | IC-05 |
| Un regalo puede aportarse **varias veces** | Se agota con el primer aporte activo (409) | IC-03 |
| Control reforzado del alias | Campo editable sin controles | IC-04 |
| El RSVP **nunca sobrescribe por nombre** | Sobrescribe por nombre normalizado | IC-09 |
| «Evento nuevo» independiente; historial en la cuenta | Un evento por cuenta | IC-06 |
| Weda no verifica transferencias | La interfaz dice «recibido» | IC-07 |

**Lo que está bien y es coherente** (muestra): contraseñas con scrypt; cookie `HttpOnly` y `SameSite=Lax`; verificación `Origin`; token de recuperación de un solo uso que cierra las sesiones; comprobantes privados; aislamiento por propietario; consentimiento de marketing separado; el servidor decide el vencimiento y el plan (el cliente no puede declararse «pagado»).

---

## 5. Modelo de datos

**Dos modelos distintos que no deben confundirse.**
- **Modelo conceptual** ([`docs/data-architecture/`](../data-architecture/)): 86 entidades en 13 dominios. Es un diseño; **no está implementado**.
- **Base real** (`src/server/db.ts`): **16 tablas** en SQLite.

**Entidades fundamentales del diseño, por dominio** (cuáles existen hoy)

| Dominio | Entidades clave | ¿Existe en la base real? |
|---|---|---|
| Usuarios y acceso | Usuario, sesión, token de recuperación, credencial | Sí, en forma simple (usuario, sesiones, restablecimiento) |
| Evento | Evento, configuración, estado en cuatro ejes (comercial, operativo, publicación, retención) | Parcial: un casamiento por usuario, sin los cuatro estados |
| Permisos y membresías | Membresía, rol, invitación de colaborador, transferencia | **No** |
| Comercial | Plan, orden, pago, suscripción, aceptación de condiciones, reembolso | Parcial: orden y pago simples; sin suscripción ni aceptación |
| Publicación | Borrador, versión, snapshot, URL, vencimiento | Parcial: borrador JSON y snapshot; sin versiones |
| Invitados y RSVP | Invitado, invitación, cupo, acompañante, respuesta, mesa | Parcial: invitados y respuestas por nombre; sin invitaciones |
| Regalos y aportes | Regalo, aporte, comprobante, alias, **libro** de confirmaciones | Parcial: regalos y aportes con 3 estados; **sin libro ni versiones del alias** |
| Contenido | Medios, fotos, secciones | Parcial |
| Comunicación | Mensajes, avisos, preferencias, bajas | Parcial (correo opcional, baja) |
| Financiero | Libro, conciliación, informe final | **No** |
| Privacidad y retención | Solicitudes de derechos, política de retención, ejecuciones | **No** |
| Auditoría | Registro de acciones, cambios sensibles | **No** |
| Analítica | Eventos, instantáneas mensuales, agregados | Solo `funnel_events` simple |

**Qué no coincide con la base actual (resumen)**: faltan libro financiero, invitaciones personales, membresías, suscripción, versiones, auditoría y retención; los importes no llevan moneda; los estados de aporte son 3 (el diseño tiene 6); el alias vive dentro del JSON del borrador y se publica en el snapshot; todas las tablas del casamiento tienen `ON DELETE CASCADE`. Detalle y consecuencias en IC-15, IC-23 y RK-05, RK-11.

**Cómo se llega del uno al otro** es una decisión de migración (RK-11) y está en el [roadmap](05-implementation-roadmap.md), no hecha.

---

## 6. Estado real de implementación

Matriz resumida por módulo. El anexo [01](01-feature-inventory.md) contiene la matriz completa de las **102 funcionalidades** con las columnas *Módulo · Funcionalidad · Estado documental · Estado en código · Tests · Observaciones*.

| Clasificación | Cantidad |
|---|---:|
| Implementada y probada | 44 |
| Implementada, sin pruebas suficientes | 9 |
| Parcialmente implementada | 7 |
| Diseñada, no implementada | 39 |
| No diseñada | 1 |
| No verificada | 2 |
| **Total** | **102** |

| Módulo | Prob. | Sin pruebas | Parcial | Diseñada | No dis. | No verif. |
|---|---:|---:|---:|---:|---:|---:|
| Landing y adquisición | 2 | 5 | 0 | 0 | 0 | 0 |
| Registro y cuenta | 2 | 0 | 2 | 3 | 0 | 0 |
| Onboarding | 4 | 0 | 0 | 0 | 0 | 0 |
| Contratación, planes y pago | 5 | 0 | 0 | 6 | 0 | 0 |
| Panel (inicio y cuenta) | 1 | 2 | 1 | 3 | 0 | 0 |
| Lista de regalos y aportes | 6 | 0 | 1 | 7 | 0 | 0 |
| Micrositio y constructor | 4 | 1 | 0 | 1 | 0 | 1 |
| Invitados y RSVP | 6 | 0 | 1 | 2 | 1 | 0 |
| Publicación y vigencia | 5 | 0 | 1 | 4 | 0 | 0 |
| Correo, privacidad y datos | 3 | 0 | 0 | 4 | 0 | 1 |
| Administración interna | 0 | 0 | 0 | 2 | 0 | 0 |
| Roles, eventos múltiples y cuenta | 2 | 0 | 0 | 3 | 0 | 0 |
| Analítica | 1 | 0 | 0 | 2 | 0 | 0 |
| Operación e infraestructura | 3 | 1 | 1 | 2 | 0 | 0 |

**Cómo interpretar «implementada y probada».** Significa que existe y que una prueba automática la ejercita en un entorno de prueba. **No** significa que funcione en producción ni que su regla coincida con la decisión: varias funcionalidades «probadas» están probadas **contra la regla vieja** (por ejemplo `expiry` exige 6 meses y una prueba exige que un regalo tomado dé 409). Estas pruebas tendrían que cambiar cuando se cambie la regla.

**Lectura honesta.** La mitad inferior de la tabla (cobro, cierre, administración, derechos, analítica, eventos múltiples) es mayormente diseño. Lo que hoy funciona de punta a punta es el **ciclo de crear la página, cargar invitados, publicar y recibir respuestas y aportes con comprobante**, con las limitaciones de los capítulos 3 y 4.

---

## 7. UX y experiencia

Se separan los **problemas observados** (con evidencia en código o documentos) de las **recomendaciones** (criterio de esta auditoría, no decisiones). Se declara qué no se pudo verificar.

### 7.1 Qué no se verificó

- Las pruebas E2E de navegador **no se ejecutaron**; los resultados de octubre figuran en documentos viejos y no se pueden considerar vigentes (IC-21, RK-16).
- No hay evidencia de lector de pantalla, herramienta de contraste, pruebas con personas ni medición de rendimiento (NE-09, NE-10, NE-11).
- No se hizo una revisión visual en navegador durante esta auditoría.

### 7.2 Problemas observados

| Área | Observación | Referencia |
|---|---|---|
| Promesa de vigencia | La landing, los planes, los términos y la FAQ dicen 6 meses; la regla es 12 | IC-02 |
| Pago y publicación | Se paga y después hay que recordar «Publicar mi página» | IC-01 |
| Lista de regalos | «Ya elegido» agota un regalo simbólico | IC-03 |
| Panel de aportes | Sin botones para confirmar o rechazar; el estado queda siempre «A revisar» | IC-08 |
| Vocabulario | «Aportes recibidos», «Todavía no recibiste regalos»: afirma una verificación inexistente | IC-07 |
| Plan Regalos | Promete «tarjeta» que no existe | IC-07, DP-20 |
| Ingreso con Google | Botón que informa que no está habilitado (decisión 2026-10-29; consistente con la regla «sin botones decorativos» solo en la medida en que explica) | IC-20 |
| Invitado | Debe cargar comprobante y correo para aportar; es una barrera deliberada (control del dinero) pero no se midió | — |
| Avisos | No hay «cambios sin publicar» ni avisos de vencimiento | NE-03, NE-04 |
| Fotos | Límite de 6 MB por guardado | RK-15 |
| Estados vacíos, de error y de carga | Existen en el panel y el constructor; la cobertura exacta en cada pantalla no se auditó pantalla por pantalla | NO VERIFICADO |
| Confirmaciones | Sin `alert` del navegador (regla del proyecto); diálogos propios | IMPLEMENTADO |
| Consistencia visual | Reglas de identidad (landing, panel gris neutro, sitio público) documentadas en `docs/design-system.md`; no se auditó cada pantalla | DOCUMENTADO |

### 7.3 Recomendaciones (para tu decisión, no cerradas)

1. Alinear todos los textos de vigencia y de dinero antes de cualquier otro cambio visible: es lo más barato y evita la promesa incumplida.
2. Agregar confirmar y rechazar aportes en el panel antes de abrir ventas: sin ese paso el producto no cumple su propia promesa.
3. Mostrar la fecha exacta de vencimiento en el resumen de contratación y en el panel.
4. Reejecutar las E2E y ampliar con las pantallas nuevas; sumar una prueba con 3 a 5 parejas reales antes de cobrar.

---

## 8. Seguridad, privacidad y finanzas

**No se hacen afirmaciones de cumplimiento legal.** La revisión legal y contable está pendiente (MV-17, DP-02).

| Tema | Implementado (verificado en código) | Solo diseñado o ausente |
|---|---|---|
| Autenticación | scrypt; cookie `HttpOnly`, `SameSite=Lax`; recuperación de clave con token de 1 h y un solo uso que cierra sesiones; límites de intentos **en memoria** | Verificación de correo; segundo factor; ingreso con Google |
| Autorización y aislamiento entre eventos | El propietario solo accede a su casamiento (`owner_id`); pruebas de aislamiento | Roles y membresías; pruebas de aislamiento con eventos múltiples (RK-13) |
| Sesiones y CSRF | Sesiones en base; verificación de `Origin` | Revocación por dispositivo no verificada |
| Protección del alias | Ninguna adicional | Contraseña reciente, confirmación fuera de banda, espera cancelable, TOTP (DP-01), versiones |
| Auditoría | — | Registro de acciones sensibles (no existe) |
| Integridad financiera | Los importes se validan; el estado del aporte lo cambia solo el propietario por API | **Libro inmutable**, moneda por aporte, correcciones relacionadas (RK-05) |
| Comprobantes | Privados, fuera de `public/`, acceso solo del propietario | Retención y borrado según política (DP-02, DP-04) |
| Datos personales | Consentimiento de marketing separado; baja por enlace | Procedimiento de derechos; política de retención; inscripción AAIP (MV-18, MV-19) |
| Retención y borrado | — (no existe API de borrado; `ON DELETE CASCADE` latente) | Política posterior al cierre (P30), borrado por inactividad (P19), anonimización |
| Analítica y seudonimización | `funnel_events` sin identidad | Tres capas con seudónimos y plazos de 13 y 25 meses |
| Tokens en URLs | El enlace del comprobante y de baja usan tokens | Revisión del riesgo y de la caducidad (RK-18) |
| Secretos y configuración | `WEDA_SECRET`, variables de entorno | Verificación de que producción no use el proveedor de prueba (MV-03) |

**Lo más sensible de este capítulo:** el dinero de los invitados va a un alias que la pareja puede cambiar sin ningún control (IC-04, RK-06); los aportes tienen un estado mutable sin libro (RK-05); y la privacidad y los términos están en borrador, con dos documentos que fijan plazos opuestos para los derechos de los titulares (IC-13).

---

## 9. Inconsistencias y decisiones pendientes

Este capítulo **no cierra ninguna decisión**. El registro completo (24 inconsistencias, 22 decisiones pendientes, 18 riesgos) está en el [anexo 03](03-open-decisions-and-risks.md). Aquí, lo prioritario.

| ID | Problema | Impacto | Documentación afectada | Implementación afectada | Decisión necesaria |
|---|---|---|---|---|---|
| IC-01 | Pago y publicación separados | Pago sin publicar; plazo depende de un clic | `02d`, `ux-flows` | `service.ts`, `publish-dialog.tsx` | Aprobar la operación única (ya DECIDIDA; falta autorizar su construcción) |
| IC-02 | Vigencia de 6 meses en código y textos | Promesa incumplida | landing, términos, privacidad, FAQ, `expiry.test` | `service.ts`, `plans.ts` | Autorizar el cambio y la redacción (DP-06, DP-17) |
| IC-17 | Publicar es gratis por defecto | Se publica sin cobrar | `deployment-checklist.md` | `config.ts`, `service.ts` | Encender la compuerta en producción |
| IC-03 | Regalo «tomado» vs. repetibles | Se agota un regalo simbólico | `02-domain-model.md` | `service.ts`, `gifts-page.tsx`, pruebas | Autorizar el cambio de regla y de pruebas |
| IC-04 | Alias sin controles | Desvío de transferencias | `02` | `service.ts`, snapshot | Definir el nivel de seguridad (DP-01) |
| IC-08 | Sin confirmar/rechazar en el panel | El estado «confirmado» es inalcanzable | `ux-flows` | `panel.regalos.tsx` | Autorizar construirlo |
| IC-05 | El vencimiento no cierra el evento | Se sigue operando tras el plazo | `02d` | `service.ts` | Aprobar el cierre y sus excepciones (DP-04, DP-09) |
| IC-06 | `owner_id UNIQUE` | Sin eventos múltiples ni historial | `02c`, `02d` | `db.ts` | Aprobar la migración |
| IC-22 | Sin aceptación versionada de condiciones | Sin evidencia de que se informó | `02d` | `crear.cuenta.tsx` | Aprobar la redacción (DP-06) |
| IC-15 | Modelo de 86 entidades vs 16 tablas | Lo diseñado no existe | `data-architecture` | `db.ts` | Aprobar el orden de migración (cap. 11) |
| IC-10 | Documentos originales desactualizados | Quien lea solo uno se confunde | README, PRODUCT, ux-flows, backend-readiness… | — | Autorizar su actualización (DP-21) |

**Decisiones sin tomar que bloquean trabajo** (resumen; todas en el anexo 03): hosting y base (DP-14), proveedor de pagos, medios, impuestos y facturación (DP-15), política de cancelación y reembolso (DP-03), mínimos de publicación (DP-05), redacción de las seis condiciones (DP-06), tratamiento posterior al cierre (DP-04), fundamento de la eliminación por inactividad (DP-07), precios definitivos (DP-17).

**Documentos originales que contradicen el código o entre sí** (tabla en anexo 03 §1.1): `README.md`, `PRODUCT.md`, `docs/ux-flows.md`, `docs/backend-readiness.md`, `docs/e2e-coverage.md`, `docs/frontend-production-readiness.md`, `docs/auditoria-ux-conversion/findings.md`. No se modificaron.

---

## 10. Qué falta para vender Weda

**Veredicto de esta auditoría: no hay evidencia suficiente para declarar que Weda esté lista para vender.** Detalle en el [anexo 04](04-mvp-readiness.md) (22 bloqueantes).

### 10.1 Bloqueantes para cobrar o publicar (MV-01…MV-22)

| Grupo | Bloqueantes | Por qué | Depende de |
|---|---|---|---|
| Infraestructura y operación | MV-01 hosting persistente, MV-02 respaldos probados, MV-03 secretos, MV-04 correo probado, MV-05 alertas | Hoy un reinicio o un disco efímero pierde datos; el correo real nunca se probó | DP-14 |
| Cobro, contratación y vigencia | MV-06 proveedor real, MV-07 cancelación y reembolso, MV-08 pagar = activar + publicar, MV-09 12 meses, MV-10 aceptación, MV-11 compuerta, MV-12 factura | No hay forma de cobrar; la regla comercial no está construida | DP-15, DP-03, DP-05, DP-06 |
| Dinero de los regalos y seguridad | MV-13 revisión manual, MV-14 alias, MV-15 integridad, MV-16 aislamiento | La promesa central del producto necesita control real | DP-01 |
| Privacidad y legal | MV-17 términos y privacidad, MV-18 AAIP, MV-19 derechos, MV-20 política posterior al cierre | Textos en borrador; sin procedimiento | Asesores |
| Soporte y pruebas | MV-21 soporte, MV-22 E2E y prueba de punta a punta | No se puede resolver un reclamo de cobro; pruebas no vigentes | — |

### 10.2 Necesario para una buena experiencia (NE-01…NE-12)
Regalos repetibles, invitaciones personales con cupo, aviso de cambios sin publicar, avisos de vencimiento, exportaciones, verificación de correo e ingreso con Google, fotos directas, USD, accesibilidad medida, rendimiento, pruebas con personas, y (si se decide) envío de invitaciones.

### 10.3 Antes de que el primer evento cumpla 12 meses (TV-01…TV-04)
Cierre definitivo, eventos múltiples e historial, exportaciones y avisos finales, política posterior al cierre y derechos.

### 10.4 Mejoras posteriores (PO-01…PO-07)
Roles y membresías, analítica de tres capas, administración interna completa, marketplace y cupones, borrado por inactividad, Spotify real, directorio público.

**Qué está sólido** (para no subestimar lo hecho): registro y acceso seguros, onboarding, constructor, invitados, RSVP básico, publicación con snapshot, aportes con comprobante privado y aislamiento por propietario, con 195 pruebas que pasan.

---

## 11. Roadmap propuesto

Propuesta, **sin implementar nada**. El detalle de cada fase (objetivo, alcance, dependencias, entregables, criterios de aceptación, pruebas, riesgos y qué queda fuera) está en el [anexo 05](05-implementation-roadmap.md).

| Fase | Objetivo | Depende de | Cubre |
|---|---|---|---|
| **R0** | Decisiones y alineación documental (sin código) | Asesores; proveedor | DP-05, DP-06, DP-14, DP-15, IC-10 |
| **R1** | Operación e infraestructura | R0 | MV-01…MV-05 |
| **R2** | Cobro, activación y vigencia de 12 meses | R1 | MV-06…MV-12, IC-01, IC-02, IC-17, IC-22 |
| **R3** | Dinero de los regalos | R1 | MV-13…MV-15, IC-03, IC-04, IC-07, IC-08 |
| **R4** | Invitaciones y RSVP | R1 | NE-02, IC-09 |
| **R5** | Eventos múltiples, cierre, avisos y exportaciones | R2, R3 | TV-01…TV-03, IC-05, IC-06 |
| **R6** | Privacidad, retención y derechos | R5 | MV-17…MV-20, TV-04 |
| **R7** | Administración interna y mejoras | R2, R3 | MV-21, NE-03, NE-06, NE-07, PO-01, PO-03 |
| **R8** | Analítica y escalado | R2…R6 | PO-02, IC-18 |

**Camino más corto a una primera venta controlada:** R0 → R1 → R2 → R3 (más soporte mínimo y las E2E reejecutadas). **El reloj del primer vencimiento:** lo que solo importa al cerrar un evento (R5, R6) debe estar listo antes de que el primer evento cumpla 12 meses, no antes de la primera venta; pero el contrato de R2 debe explicarlo desde el primer día.

---

## 12. Resumen ejecutivo para la dueña

**Qué es Weda hoy.** Una aplicación web que ya permite crear la página de un casamiento, cargar invitados, publicar, recibir confirmaciones y registrar aportes de regalos con comprobante. Es un producto real de punta a punta **en un entorno de prueba**; no tiene todavía lo necesario para cobrar ni para operar con datos reales.

**Qué está construido y funciona (con pruebas).** Registro, acceso y recuperación de clave seguros; onboarding; constructor del micrositio; invitados, acompañantes, mesas e importación; RSVP básico; publicación con snapshot; aportes con comprobante privado; aislamiento entre parejas. 44 de 102 funcionalidades están implementadas y probadas; 195 pruebas pasan.

**Qué está diseñado y no construido.** 39 funcionalidades: cobro real, activación automática, vigencia de 12 meses, cierre del evento, eventos múltiples, libro financiero, control del alias, invitaciones personales, exportaciones, avisos, administración interna, retención y derechos, analítica de tres capas.

**Decisiones cerradas** (tuyas): vigencia única de 12 meses desde la confirmación del pago; pagar = activar + publicar; sin renovación ni reactivación; URL «no disponible» al vencer; la cuenta conserva solo la información comercial del evento cerrado (P34); plazos de inactividad de borradores 12/6/6/12 meses (P19); Weda no custodia ni verifica el dinero; regalos repetibles; RSVP sin sobrescritura por nombre.

**Decisiones abiertas más importantes.** Hosting y base (DP-14); proveedor de pagos, impuestos y factura (DP-15); cancelación y reembolso (DP-03); mínimos de publicación (DP-05); redacción de las seis condiciones (DP-06); tratamiento posterior al cierre (DP-04); seguridad extra del alias (DP-01); precios definitivos (DP-17).

**Los 5 mayores riesgos**
1. **Pérdida de datos** por hosting sin disco persistente o sin respaldos probados (RK-01).
2. **Cobro y publicación sin control**: no hay cobro real, publicar es gratis por defecto y no hay verificador ni política de reembolsos (RK-02, RK-03).
3. **Promesa incumplida de la vigencia**: textos y servidor dicen 6 meses; tu decisión es 12 (RK-04).
4. **Integridad del dinero y del alias**: sin libro, sin moneda, sin controles sobre adónde transfieren los invitados, y la interfaz no permite confirmar aportes (RK-05, RK-06, IC-08).
5. **Privacidad y legal en borrador**, con correo real nunca probado (RK-08, RK-09).

**Los 5 próximos pasos que propone esta auditoría** (todos requieren tu aprobación)
1. Aprobar R0: cerrar hosting, proveedor de pagos, cancelación y reembolso, mínimos de publicación y redacción de condiciones.
2. Autorizar la actualización de los documentos originales desactualizados (DP-21).
3. R1: entorno persistente con respaldos restaurados y correo real probado.
4. R2: cobro real con «pagar = activar + publicar» y 12 meses en todos los textos.
5. R3: confirmar/rechazar aportes en el panel, regalos repetibles y control del alias.

**Evaluación honesta de preparación comercial.** Weda **no está lista para vender**. La base de producto es buena y avanzó mucho, pero faltan (a) cobrar y activar de verdad, (b) un entorno donde guardar datos reales sin perderlos, (c) que la lista de regalos —el diferencial— cumpla sus propias reglas, y (d) textos legales revisados. Hay 22 bloqueantes; ninguno está resuelto. El camino más corto a una primera venta controlada es R0–R3.

---

*Trazabilidad:* cada afirmación sobre el código se corresponde con las fuentes citadas en los anexos (código en `src/server/`, `src/lib/weda/`, `src/routes/`, `src/components/`, pruebas en `src/test/` y `e2e/`; documentos en `docs/`). Lo que figura como NO VERIFICADO no tiene evidencia en ningún sentido.
