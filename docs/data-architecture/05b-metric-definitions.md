# Weda · Arquitectura de datos · Fase 3 — Definiciones de métricas

Fecha: 2026-10-30. Estado: **definiciones para revisión; no hay nada implementado.** Complementa `05-analytics-architecture.md` (§6).
Cada métrica define **numerador, denominador, período, fuente y reglas de exclusión**. Cuando una métrica no tiene denominador (es un conteo o una suma) se dice.

---

## 0. Convenciones comunes

| Tema | Regla |
|---|---|
| **Zona horaria y mes** | Los meses se cierran en la zona `America/Argentina/Buenos_Aires`; las fechas se guardan en UTC. |
| **Fuentes** | **E** = `ProductEvent` (solo del servidor salvo que se indique); **O** = tablas operativas leídas en modo solo lectura; **F-W** = registros financieros de Weda (`Order`, `Payment`, `Subscription`); **F-P** = registro de aportes de las parejas (`Contribution`, `GiftTransaction`); **S** = `WeddingMonthlySnapshot`. |
| **Dos dinero que no se mezclan** | Los **ingresos de Weda** (F-W) y el **dinero de los regalos** (F-P) nunca se suman, comparan ni muestran en la misma cifra. |
| **Moneda** | Todo importe se agrupa por moneda (`ARS`, `USD`). **Nunca** se suma, promedia ni convierte entre monedas. Una celda sin moneda explícita es inválida. |
| **Lo que Weda sabe de los aportes** | Se dice «confirmado manualmente por la pareja», «comprobante cargado», «declarado». Nunca «recibido» ni «acreditado»: Weda no verifica transferencias. |
| **Cohortes** | Las tasas de conversión usan cohortes mensuales; una cohorte se publica **solo cuando terminó su período de observación** (no se informa una tasa parcial). |
| **Cierre mensual congelado** | Un mes cerrado no se recalcula cuando se eliminan después datos de origen (eliminación de cuentas o cierre de eventos): los números ya calculados se conservan según la capa que los guarda. Una corrección de definición crea una **versión nueva**. |
| **Poblaciones chicas** | Una métrica con pocos casos no se publica, se agrupa o se informa solo como conteo grueso. El criterio y la evaluación de riesgo están en `05` §7; **no hay un umbral numérico que garantice anonimato**. |
| **Estado de cada métrica** | Ninguna superó todavía la evaluación de riesgo: hasta que lo haga se trata como dato de las capas con plazo (13 y 25 meses), no como histórico sin vencimiento. |

### Reglas de exclusión comunes (EX)

| Código | Se excluye | Por qué |
|---|---|---|
| **EX1** | Cuentas y casamientos de personal de Weda o de prueba (marcados) | No son clientes |
| **EX2** | Órdenes, pagos y notificaciones del **proveedor de prueba** | No son pagos reales; se informan aparte |
| **EX3** | Eventos duplicados (misma clave de idempotencia) y tráfico de bots | Calidad |
| **EX4** | Cuentas o casamientos eliminados **antes** del cierre del mes de la métrica, salvo que la métrica ya estuviera calculada | Evita reconstruir datos eliminados |
| **EX5** | Casamientos «en armado» (sin contratación), salvo en las métricas de activación y embudo | Todavía no inició la vigencia |
| **EX6** | Aportes e invitaciones de casamientos excluidos por EX1 | Idem |

### Eventos del servidor que sostienen las métricas

Los eventos del navegador permanecen **apagados** (P14): ninguna métrica de este documento los necesita **salvo las marcadas «requiere navegador»**. Para medir actividad se agrega el evento diario de actividad `wedding_active_day`: una vez por día y por casamiento, en la primera escritura del panel, **sin contenido** (clave de idempotencia: seudónimo del casamiento + día).

---

## A. Adquisición y conversión

**A1 · Registros de cuentas**
- **Numerador:** cuentas creadas en el mes. **Denominador:** no tiene (conteo).
- **Período:** mes calendario. **Fuente:** O (`User`) y E (`signup_completed`, clave: cuenta). **Exclusiones:** EX1, EX3.
- **Dimensiones:** dispositivo (si se conoce), canal grueso (solo con consentimiento). **Servidor:** sí.

**A2 · Creación de bodas (conteo) y tasa de creación**
- **A2 (conteo):** casamientos creados en el mes (O, `Wedding`).
- **A2r (tasa) — Numerador:** cuentas de la cohorte de registro con casamiento creado dentro de **14 días** del registro. **Denominador:** cuentas de la cohorte de registro. **Período:** cohorte mensual; se publica cuando todas tienen 14 días de observación.
- **Exclusiones:** EX1, EX3, EX4. **Servidor:** sí.

**A3 · Contratación de planes**
- **Numerador:** compras pagadas (tipo compra, no mejora) cuyo pago se confirmó en el mes, **por plan y por moneda**. **Denominador:** no tiene (conteo).
- **Fuente:** F-W (`Order`, `Payment`). **Exclusiones:** EX1, EX2 (las del proveedor de prueba se informan aparte). Las **mejoras** se cuentan en una métrica aparte (A3b) y no se suman.
- **Dimensiones:** plan, moneda. **Servidor:** sí.

**A4 · Conversión de registro a pago (= a evento activo y publicado)**
- **Numerador:** cuentas de la cohorte de registro con al menos una compra pagada dentro de **90 días** del registro. **Denominador:** cuentas de la cohorte de registro.
- **Nota:** como pagar activa y publica el evento, esta conversión **es** la conversión a evento activo; **no existe** una métrica de conversión entre el pago y la primera publicación. **Período:** cohorte mensual; se publica cuando la cohorte tiene 90 días. **Fuente:** O + F-W. **Exclusiones:** EX1, EX2, EX3, EX4. **Servidor:** sí.

---

## B. Activación

**B1 · Tiempo hasta completar el micrositio**
- **Valor:** mediana y percentiles 25 y 75 de **días entre la creación del casamiento y el momento en que el micrositio cumple el criterio mínimo** (versión del criterio definida por Producto: por ejemplo, portada con nombres y fecha, al menos un momento y un bloque de contenido).
- **Denominador:** casamientos que alcanzaron el criterio en el período; se informa **aparte** el porcentaje que **no** lo alcanzó (datos censurados).
- **Fuente:** O (`MicrositeBlock`, `EventMoment`) vía `WeddingMonthlySnapshot`. **Exclusiones:** EX1, EX3, EX4. **Servidor:** sí (derivada; no requiere el evento del navegador `microsite_completed`).

**B2 · Tiempo hasta contratar y publicar (activación)**
- **Valor:** mediana y percentiles de **días entre la creación del casamiento y el momento en que Weda confirma el pago y activa la publicación** (que es también la primera publicación efectiva).
- **Denominador:** casamientos activados en el período; se informa aparte el % de casamientos creados que **nunca se contrataron** (datos censurados). **Fuente:** O (`Wedding`, `Subscription`). **Exclusiones:** EX1, EX2, EX4. **Servidor:** sí.

**B3 · Abandono del onboarding por paso**
- **Numerador:** cuentas que completaron el paso N−1 y **no** completaron el paso N dentro de **7 días**. **Denominador:** cuentas que completaron el paso N−1 hace al menos 7 días.
- **Período:** cohorte por fecha de finalización del paso N−1. **Fuente:** E (`onboarding_step_completed`, clave: cuenta+paso). **Exclusiones:** EX1, EX3, EX4; cuentas con menos de 7 días de observación.
- **B3t (total):** cuentas registradas **sin casamiento creado a los 14 días** ÷ cuentas con 14 días de observación. «Abandono» es **derivado** (ausencia de actividad), no un evento. **Servidor:** sí.

**B4 · Uso de funcionalidades**
- **Numerador:** casamientos activos (con la vigencia en curso) que **usaron** la función F en el período. **Denominador:** casamientos activos (con la vigencia en curso) **que tienen F incluida en su plan** (según la copia de funcionalidades de `Subscription`).
- **Definición de «usó»:** una acción real y mensurable por función (por ejemplo, ≥ 1 bloque de ese tipo editado, ≥ 1 regalo creado, ≥ 1 invitación enviada, ≥ 1 mesa creada, ≥ 1 colaborador activo). Cada función declara su acción y versión.
- **Período:** mes. **Fuente:** S. **Exclusiones:** EX1, EX5; funciones no incluidas en el plan. **Servidor:** sí.

---

## C. Invitados

Se calculan **por casamiento desde datos operativos y se guardan como conteos**; no se guarda ningún invitado individual. El valor «final» de un evento se fija **al vencer el evento** (a los 12 meses de la primera publicación; después ya no se modifican invitados ni respuestas) y se toma en la fotografía final, antes de cualquier depuración.

**C1 · Invitaciones generadas**
- **C1:** invitaciones creadas en el período (`Invitation`). **C1b:** invitaciones **enviadas**. **Denominador:** no tiene.
- **Exclusiones:** EX1, EX6; invitaciones borradas antes de enviarse (se cuentan en C1, no en C1b). **Servidor:** sí.

**C2 · Invitados por boda**
- **Valor:** distribución (mediana, percentiles, bandas) de **personas autorizadas** (suma de cupos de las invitaciones) por casamiento. **Denominador:** casamientos con al menos una invitación enviada.
- **Fuente:** O vía S. **Exclusiones:** EX1, EX5, importaciones de prueba. **Dimensiones:** plan, banda de tamaño. **Servidor:** sí.

**C3 · Tasa de confirmación**
- **Numerador:** invitaciones con **al menos una respuesta** registrada. **Denominador:** invitaciones **enviadas**.
- **Período:** valor **final** al vencer el evento; además, curva a 14 y 30 días del envío. **Fuente:** O (`RsvpResponse`, `Invitation`). **Exclusiones:** EX1, EX6; invitaciones revocadas antes de responder; las del **formulario abierto** (sin invitación) se informan aparte. **Servidor:** sí.

**C4 · Tasa de asistencia declarada**
- **Numerador:** personas que **declararon que asistirán**. **Denominador:** personas **autorizadas** (cupo) de las invitaciones **con respuesta**. Es una **declaración**, no la asistencia real.
- **Período:** valor final al vencer el evento. **Fuente:** O vía S. **Exclusiones:** EX1, EX6; invitaciones sin respuesta. **Servidor:** sí.

**C5 · Acompañantes registrados**
- **Numerador:** personas registradas como **acompañantes**. **Denominador:** invitaciones con cupo mayor a 1 (que permiten acompañantes); también el **uso del cupo**: acompañantes nombrados ÷ lugares de acompañantes disponibles.
- **Fuente:** O vía S. **Exclusiones:** EX1, EX6; casamientos que desactivaron acompañantes. **Servidor:** sí.

---

## D. Regalos

Todas se calculan **por moneda**. «Aporte» significa el registro hecho por un invitado; lo que Weda sabe de su estado es lo que declaró el invitado y lo que la pareja marcó.

**D1 · Cantidad de regalos**
- **Valor:** distribución del número de regalos **activos** por casamiento; conteo de regalos creados en el período. **Denominador:** casamientos con lista creada (≥ 1 regalo).
- **Fuente:** O (`Gift`) vía S. **Exclusiones:** EX1, EX5; regalos archivados. **Servidor:** sí.

**D2 · Cantidad de aportes**
- **Numerador:** aportes registrados en el período, **por estado** (registrado, con comprobante cargado, revisado, confirmado manualmente, rechazado, con reembolso o corrección registrada) y **por moneda**. **Denominador:** no tiene.
- **Fuente:** F-P (`Contribution`, `ContributionEvent`, `GiftTransaction`). **Exclusiones:** EX1, EX3, EX6. **Servidor:** sí.

**D3 · Aportes por moneda**
- **Valor:** cantidad e **importe** de aportes **declarados** y de aportes **confirmados manualmente por la pareja**, **separado por moneda** (`ARS` y `USD` nunca se suman).
- **Fuente:** F-P. **Período:** mes del hecho; valor final al vencer el evento. **Exclusiones:** EX1, EX3, EX6; los aportes con reembolso o corrección se informan **netos del movimiento relacionado**.

**D4 · Importe promedio por moneda**
- **Numerador:** suma de importes **confirmados manualmente** (netos de reembolsos y correcciones) **en la moneda M**. **Denominador:** cantidad de aportes confirmados manualmente en la moneda M.
- **Se informa también la mediana y percentiles**, que son menos sensibles a valores extremos. **Período:** mes. **Fuente:** F-P (`GiftTransaction`).
- **Exclusiones:** EX1, EX3, EX6; aportes no confirmados. **Control:** si un solo casamiento domina una celda, se agrupa u omite (`05` §7.3). **Servidor:** sí.

**D5 · Categorías de regalos más elegidas**
- **Numerador:** aportes registrados por categoría de regalo. **Denominador:** aportes registrados **con regalo** (los de importe libre no tienen categoría).
- **Fuente:** F-P (`ContributionItem`) + O (`Gift`). **Exclusiones:** EX1, EX6; aportes libres; categorías con pocos casos se agrupan. También se informa la versión «confirmados manualmente». **Servidor:** sí.

**D6 · Comprobantes cargados**
- **Numerador:** aportes con **al menos un comprobante cargado**. **Denominador:** aportes registrados. **Cargado no significa verificado.**
- **Fuente:** F-P (`PaymentProof`). **Exclusiones:** EX1, EX6. **Servidor:** sí.

**D7 · Aportes confirmados manualmente**
- **Numerador:** aportes cuya última acción sea una confirmación **no revertida**. **Denominador:** aportes registrados. **D7r:** rechazados ÷ registrados. **D7p:** pendientes ÷ registrados.
- **Período:** valor final al vencer el evento (puede haber pendientes sin revisar: se informan como tales; la revisión es solo durante la vigencia, P22). **Fuente:** F-P. **Exclusiones:** EX1, EX3, EX6. **Servidor:** sí.

---

## E. Comercial (ingresos de Weda)

**E1 · Planes contratados**
- Igual que **A3** (conteo por plan y moneda). **Mejoras de plan (A3b):** conteo e ingresos aparte.

**E2 · Ingresos comerciales de Weda**
- **Valor:** suma de pagos **confirmados** (compras y mejoras), **por moneda**, por mes de confirmación; menos los reembolsos registrados cuando existan. **Denominador:** no tiene.
- **Fuente:** F-W (`Payment`, `Order`). **Exclusiones:** EX1, EX2; cupones: se suma lo efectivamente pagado. **Importante:** hasta que exista un **verificador real de pagos** (riesgo 2), la cifra se marca **no auditable**. **Nunca** se combina con D3.

**E3 · Distribución de planes**
- **Numerador:** compras pagadas del plan P. **Denominador:** compras pagadas totales. **Período:** mes. **Fuente:** F-W. **Exclusiones:** EX1, EX2. **Se informa también** la participación en ingresos **por moneda**.

**E4 · Conversión por plan**
- **Numerador:** órdenes de compra **pagadas** del plan P. **Denominador:** órdenes de compra **creadas** del plan P (inicio de pago).
- **Período:** cohorte por mes de creación de la orden, con **7 días** para pagar. **Fuente:** F-W (`Order`, `Payment`). **Exclusiones:** EX1, EX2; una misma orden repetida para el mismo casamiento y plan en 24 horas cuenta una vez. **Servidor:** sí. *Requiere navegador* una versión previa que parte de «eligió el plan» (`plan_selected`).

**E5 · Cancelaciones**
- **Numerador:** suscripciones en estado **cancelada** en el período. **Denominador:** suscripciones contratadas en el período (cohorte de contratación).
- **Fuente:** F-W (`Subscription`). **Exclusiones:** EX1, EX2; **los vencimientos no son cancelaciones**. **Estado:** **no disponible** hasta definir qué es una cancelación o un reembolso de un plan (P26).

**E6 · Recontratación para eventos nuevos**
- **Numerador:** cuentas con al menos un evento finalizado que **contrataron un plan para un evento nuevo** dentro de **12 meses** de la finalización. **Denominador:** cuentas con al menos un evento finalizado hace **12 meses o más** (cohorte madura).
- **Fuente:** F-W + O. **Exclusiones:** EX1, EX2; las **mejoras** no cuentan; un evento nuevo no hereda nada del anterior. Se informa el tiempo hasta la recontratación. **Servidor:** sí.

---

## F. Retención y ciclo de vida

**F1 · Eventos publicados**
- **Flujo:** casamientos **activados** (pago confirmado y primera publicación efectiva, el mismo instante) en el mes. **Stock:** casamientos con el sitio publicado (no dado de baja) al cierre del mes. **Fuente:** O (`Publication`). **Exclusiones:** EX1, EX4.

**F2 · Eventos finalizados**
- **Numerador:** casamientos que se **finalizaron** (se cumplieron los 12 meses desde que Weda confirmó el pago y activó la publicación) en el período. **F2b — vencimientos con la boda posterior:** finalizados cuya **fecha de casamiento es posterior al vencimiento** ÷ finalizados. Mide cuántas parejas quedan en esa situación (no se limita la anticipación; P2 cerrada) y orienta la explicación previa a la compra.
- **Fuente:** O/F-W (`Subscription`, `Wedding`). **Exclusiones:** EX1, EX4. **Servidor:** sí.

**F3 · Eventos con retención ejecutada y descarga previa**
- **F3 (conteo):** casamientos cuya política posterior al cierre se ejecutó (`retention_executed`, resultado correcto) en el período. **No tiene fecha fija:** depende de plazos aún no definidos (P30).
- **F3b — Descarga antes de vencer:** eventos finalizados con **al menos una descarga completada durante los últimos 60 días de su vigencia** (valor propuesto) ÷ eventos finalizados. Como después del vencimiento no se puede descargar, mide si los avisos funcionan.
- **Fuente:** E (`data_export_completed`, `retention_executed`) y O. **Exclusiones:** EX1. **Servidor:** sí.

**F4 · Recontratación** — igual que **E6**.

**F5 · Uso recurrente de funcionalidades antes del vencimiento**
- **Numerador:** casamientos activos con **actividad en al menos 3 de las últimas 8 semanas** (valores propuestos, a confirmar). **Denominador:** casamientos activos con al menos 8 semanas desde la activación.
- **Definición de actividad:** una semana con ≥ 1 `wedding_active_day` (escritura en el panel). **Fuente:** E + S. **Exclusiones:** EX1, EX3, EX5. **Servidor:** sí.

**F6 · Retención de cohorte durante la vigencia**
- **Numerador:** casamientos de la cohorte (mes de pago) con **≥ 1 día activo** en el mes N de su vigencia. **Denominador:** casamientos de la cohorte. **Fuente:** E + S. **Exclusiones:** EX1, EX4.

**F7 · Cobertura de avisos de vencimiento**
- **Numerador:** eventos finalizados cuyo propietario recibió los **tres avisos de correo** (30, 7 y 1 día) con estado **no rechazado ni rebotado** (aceptado por el proveedor y sin rebote notificado). **Denominador:** eventos finalizados en el período.
- **Qué NO mide:** que la persona haya leído el correo; **un intento de envío no cuenta como entregado**. Los casos sin confirmación de entrega se informan aparte como «sin confirmación».
- **Fuente:** E (`expiry_notice_dispatched`) + estados de `MessageDeliveryEvent`. **Exclusiones:** EX1; los avisos «omitidos por atraso» se informan aparte. **Servidor:** sí.

**F8 · Aceptación de la vigencia al contratar**
- **Numerador:** compras confirmadas con una aceptación válida (`terms_accepted`, vigencia) asociada. **Denominador:** compras confirmadas. **Debe ser 100 %**: cualquier otro valor indica un fallo de la regla «no se confirma sin aceptación».
- **Complemento:** abandono en el paso de aceptación = órdenes creadas sin aceptación ÷ órdenes creadas. **Fuente:** F-W + E. **Exclusiones:** EX1, EX2. **Servidor:** sí.

**F9 · Borradores eliminados por inactividad** *(P19 adoptada; la política de avisos y eliminación aún no está implementada)*
- **Numerador:** borradores eliminados por inactividad en el período, **por caso** (cuenta sin evento, evento sin contratación, onboarding incompleto, borrador avanzado nunca contratado). **Denominador:** borradores creados en la cohorte con el plazo de inactividad cumplido. **Fuente:** E (`draft_deleted_by_inactivity`) + O. **Exclusiones:** EX1. La eliminación **no** altera las métricas de abandono (B3): esas miden comportamiento.


---

## G. Qué mide cada pregunta de negocio (verificación)

| Pregunta | Métricas |
|---|---|
| Registro de cuentas, creación de bodas, contratación y conversión registro→pago (que es a evento activo y publicado) | A1–A4 |
| Tiempo hasta completar el micrositio, tiempo hasta contratar y publicar, abandono, uso de funciones | B1–B4 |
| Invitaciones, invitados por boda, confirmación, asistencia declarada, acompañantes | C1–C5 |
| Regalos, aportes, aportes por moneda, promedio por moneda, categorías, comprobantes, confirmados manualmente | D1–D7 |
| Planes, ingresos de Weda, distribución, conversión por plan, cancelaciones, recontratación | E1–E6 |
| Eventos publicados, finalizados, con retención ejecutada, recontratación, uso recurrente, cobertura de avisos, aceptación de la vigencia y borradores eliminados | F1–F9 |

**Todas se calculan sin identificar invitados individualmente** y **ninguna usa eventos del navegador** (salvo la versión previa de E4 que lo indica expresamente).
