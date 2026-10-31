# Weda · Arquitectura de datos · Informe final de consolidación (vigencia única de 12 meses)

Fecha: 2026-10-30. Estado: **informe para revisión. Todo es documentación de diseño; no se implementó nada** (sin código, SQLite, migraciones, APIs, dependencias, commits, push ni deploy).
Esta versión **reemplaza** el informe anterior, que se basaba en cuatro relojes (plan de 6 meses, permanencia pública de 12 meses con recuerdo estático, 90 días de acceso privado y retención posterior).

> **Advertencia.** Este informe no es asesoramiento legal ni contable y no afirma que el diseño cumpla ninguna norma. Los plazos de tratamiento posterior al cierre **no están definidos**; los puntos de §9 requieren validación profesional.

**86 entidades en 13 dominios**: 50 «Ahora», 22 «Preparar» y 14 «Después» (solo documentadas).

---

## 0. Resumen ejecutivo

1. **Contratar, pagar y publicar son una única acción.** Cuando el pago queda confirmado, el contrato se activa y el micrositio se publica automáticamente, en una sola operación. **Cada evento tiene una única vigencia de 12 meses que comienza en el momento en que Weda confirma el pago y activa la publicación.** Al cumplirse, el evento **vence y se cierra definitivamente**: sin renovación, extensión, reactivación ni acceso privado adicional. La fecha de la boda no interviene.
2. **No existe** una contratación pagada que espere una primera publicación: **P18 está eliminada** y con ella el estado «pendiente de inicio», su plazo, sus avisos, la cancelación asociada y sus métricas. La publicación **no se bloquea por secciones opcionales incompletas** (requisitos mínimos pendientes, P35).
3. **Se simplificó el modelo:** cuatro estados guardados (comercial, operativo, publicación pública, retención); la suscripción **nace activa**; la primera publicación efectiva **se deduce** de la suscripción que activó la publicación (un solo instante, sin timestamps duplicados); el acceso privado se deduce del estado operativo.
4. **Tras el vencimiento no se asume eliminación inmediata ni conservación indefinida**: cada clase de dato tiene su tratamiento posterior; **los plazos no están definidos** hasta contar con asesoramiento (P30). Lo financiero con obligación legal se conserva separado y restringido, sin habilitar la reactivación.
5. **P19 sigue vigente y está adoptada** para lo nunca contratado: cuenta sin evento 12 meses; evento sin contratación 6; onboarding incompleto 6; borrador avanzado nunca contratado 12; actividad = inicio de sesión o escritura efectiva. El fundamento legal sigue pendiente.
6. **La analítica es coherente con el nuevo ciclo** (eventos 13 meses, fotografía mensual 25 meses, agregados tras evaluación de riesgo); la fotografía final se toma al vencer.
7. **Pérdida de acceso antes de la boda:** quien contrata con mucha anticipación pierde el acceso antes de su casamiento. Se **acepta** (sin límite de anticipación) y se mitiga con **explicación previa, aceptación expresa, avisos y descargas** (P23, P33).
8. **Decisiones ya cerradas:** URL pública no disponible tras el vencimiento (P31); cuenta independiente del evento cerrado y derechos por procedimiento separado (P32); aceptación expresa de las **seis** condiciones de vigencia (P33; con la redacción de las dos primeras ajustada, **a tu aprobación**); avisos a 30, 7 y 1 día (P23); propuesta adoptada P34.
9. **Siguen abiertas las que requieren asesoramiento o definición financiera: P30, P5, P6 y P26**, con su detalle de bloqueos en §2.1; y P35 (requisitos mínimos de publicación).
10. **El código actual no coincide** (§7): hoy el pago solo habilita un botón «Publicar mi página»; constantes y textos de «6 meses»; el sitio público se retira a los 6 meses; la edición no se bloquea al vencer; un casamiento por cuenta; importes sin moneda; borrados en cascada; sin exportaciones.

---

## 1. Decisiones aprobadas

### 1.1 Ciclo de vida del evento (vigente)
| Tema | Decisión |
|---|---|
| **Contratación** | La pareja puede crear y configurar el evento antes de pagar. **Al confirmarse el pago, en una sola operación:** la contratación queda activa, el evento pasa a activo, el micrositio se publica automáticamente, se registra la primera publicación efectiva, comienza la vigencia de 12 meses y se informa la fecha exacta de vencimiento. El evento se publica **aunque no esté completo**; completar el micrositio es responsabilidad de la pareja |
| **Inicio de la vigencia** | **El momento en que Weda confirma el pago y activa la publicación.** No comienza al crear el borrador, registrarse, iniciar el checkout ni hacer clic en pagar sin pago confirmado; no se reinicia al despublicar ni republicar; no se modifica al cambiar la fecha de la boda. Si el proveedor confirma con demora, se usa la fecha y hora en que Weda confirma y activa |
| **Durante la vigencia** | Todo operativo: editar bloques, publicar, despublicar y republicar, textos, imágenes, fechas, configuración, invitados y acompañantes, RSVP, regalos, aportes y comprobantes (con revisión manual de estados), alias y datos bancarios (con los controles de seguridad definidos), información financiera, exportaciones y todas las funciones del plan. **Sin bloqueos intermedios** |
| **Al vencer** | El evento **finaliza y se cierra**: se bloquean edición, publicación, republicación, gestión (**todos los roles, incluido el propietario**), funciones públicas interactivas, nuevos RSVP y operaciones de regalos, acceso privado al panel y descargas y exportaciones. No se reactiva (ni por soporte ni por acciones administrativas ordinarias), no se renueva ni extiende, y la URL pública no se reutiliza. Cierre **definitivo e irreversible** desde el flujo normal |
| **Boda posterior al vencimiento** | **Sin límite de anticipación.** Si la boda es después, el evento vence igual; se explica **antes de contratar** |
| **Evento nuevo** | Completamente independiente: no hereda contenido, invitados ni regalos |
| **Datos tras el vencimiento** | Sin ventana adicional de descarga; tratamiento por clase según una política posterior al cierre, **plazos a validar con asesoramiento** |
| **Informes** | Distinguen comprobante cargado, aporte revisado, confirmado manualmente, rechazado, reembolso o corrección. Sin «recibido» ni «acreditado» |

### 1.2 Decisiones de fases anteriores (siguen vigentes)
- **A1–A8:** dos dominios financieros independientes; propietario único con membresías y transferencia segura; permisos explícitos verificados en el servidor; entidades extraídas de a poco; libro inmutable con correcciones como movimientos relacionados; la invitación como unidad de acceso con enlaces hasheados; autorización en el servidor; bloques independientes y publicaciones versionadas.
- **Q1–Q5, Q7, Q8:** regalos repetibles; moneda de recepción elegida (ARS o USD) con importes siempre con su moneda; solo el propietario cambia alias o datos bancarios con reautenticación y auditoría; precios solo desde la administración interna; cupo por invitación; retención en cuatro categorías. **Q6 queda redefinida** por la vigencia única de 12 meses.
- **Analítica:** capas y plazos (13 y 25 meses), misma base SQLite con separación lógica, eventos del navegador apagados hasta definir política y consentimiento.
- **Privacidad:** los datos de invitados no se usan para marketing; los contactos comerciales necesitan fundamento y autorización independientes; eliminar una cuenta resuelve primero la propiedad de bodas activas; sin borrado de lo financiero por cascada.

### 1.3 Decisiones adoptadas
- **P34 — Historial de eventos cerrados (propuesta adoptada):** el evento vencido aparece en la cuenta del propietario con estado «Finalizado» y **solo** información comercial y contractual (nombres, fecha de la boda, plan, primera publicación, vencimiento, historial de órdenes y pagos, comprobantes de compra de Weda, cuando corresponda). No se muestra ni se accede a micrositio, invitados, RSVP, regalos y aportes, alias, comprobantes de invitados ni información operativa o financiera; no se edita, duplica, recupera, exporta ni reactiva. **Se distinguen cuatro categorías** (comercial y contractual; operativos; comprobantes de compra de Weda; comprobantes de invitados) **sin asumir el mismo plazo de conservación**. Se confirma al validarse la conservación de cada una (P6, P30).
- **P31 — URL pública tras el vencimiento:** deja de estar disponible. Sin vista estática, sin micrositio público, sin RSVP ni regalos, sin datos de invitados, información financiera ni alias; la URL no se reutiliza y el servidor responde como evento no disponible.
- **P32 — Cuenta tras el cierre:** la cuenta puede seguir; el evento vencido permanece cerrado (no se reactiva, edita, duplica ni recupera); se puede crear y contratar un evento nuevo e independiente; una cuenta activa no cambia el estado del evento vencido; la retención y eliminación siguen su política; los derechos de acceso, rectificación y supresión se atienden por un **procedimiento separado**, sin reactivar el evento ni habilitar el panel. **El derecho legal de acceso no es el acceso comercial al producto.**
- **P33 — Aceptación de la vigencia (requisito, sin implementar):** antes de confirmar la contratación, aceptación expresa de las **seis** condiciones originales (sin séptima; la redacción de la 1 y la 2 se ajusta a «pagar = activar + publicar» y **requiere tu aprobación**); se guarda usuario, evento y contratación, fecha y hora, versión del texto y evidencia. Consideraciones legales pendientes en `02d` §1.3.
- **P23 — Avisos:** a 30, 7 y 1 día antes, en el panel y por correo al propietario; fecha exacta visible en el panel y en el resumen de contratación, e informada al activarse el evento; recordatorio destacado de descargar datos y comprobantes; los avisos no modifican la vigencia; envío idempotente, con registro, sin asumir que un correo fue entregado.

- **P19 — Borradores abandonados (adoptada):** solo para lo nunca contratado; plazos 12, 6, 6 y 12 meses de inactividad; actividad = inicio de sesión o escritura efectiva; fundamento legal pendiente (P30).
- **Eliminada: P18** (contratación pagada y nunca publicada).

**Cerradas antes:** **P2** (vigencia única, sin límite de anticipación), **P11** (el micrositio se publica automáticamente al confirmarse el pago), **P13**, **P15**, **P17**, **P20** (sin reactivación), **P22** (la revisión es durante la vigencia), **P24** (la dirección no se reutiliza), **P29** (sin acceso privado adicional). **Retiradas por obsoletas:** P1, P21, P27, P28.

---

## 2. Decisiones pendientes y recomendaciones

### 2.0 Qué está adoptado, qué es recomendación y qué requiere validación

| Estado | Decisiones |
|---|---|
| **Adoptadas** | P2, P11, P13, P15, P17, P19, P20, P22, P23, P24, P29, P31, P32, P33 y la **propuesta adoptada P34** |
| **Eliminada** | **P18** (el escenario ya no existe) |
| **Recomendaciones asociadas por confirmar** | Avisos a 30, 7 y 1 día previos a la eliminación de borradores y detalle de qué se elimina en cada caso de P19 |
| **Requieren validación legal, contable o de seguridad** | **P30, P6, P26, P5** (y los fundamentos legales que dependen de ellas: ficha comercial de P34, eliminación por inactividad de P19) |
| **Pendiente de definición de producto** | **P35** — requisitos mínimos de publicación |

### 2.1 P35 — Requisitos mínimos de publicación (nueva pendiente)

| | |
|---|---|
| **Qué decisión falta** | La lista exacta de lo **estrictamente necesario** para generar una página pública válida y segura cuando se confirma el pago, qué se muestra cuando una sección opcional está vacía y si se valida (y se reserva la dirección) **antes** de iniciar el pago |
| **Por qué importa** | La publicación es automática y no puede bloquearse por secciones opcionales incompletas, ni fallar después de un pago confirmado |
| **Parte del modelo que bloquea** | La operación de activación y publicación (`Order`, `Subscription`, `Publication`) |
| **Quién debe validarla** | La dueña (producto), con revisión de seguridad |
| **Qué no debe implementarse hasta resolverla** | La publicación automática al confirmar el pago |
| **Recomendación** | Mínimos: nombres de la pareja (que el onboarding ya pide), dirección pública válida y disponible, contenido saneado y escapado, imágenes válidas y de tamaño admitido; las secciones vacías no se muestran; validar y reservar la dirección **antes** de pagar |

### 2.2 P19 — Eventos nunca contratados (adoptada)

**Eliminar un borrador no es eliminar la cuenta ni ejercer un derecho legal.** La contratación activa el evento y lo saca del régimen de borradores.

| Caso | Inactividad (adoptada) | Se elimina (recomendación) | Avisos (recomendación) |
|---|---|---|---|
| 1. Cuenta registrada sin evento | **12 meses** | La cuenta (política distinta del borrador; validar) | 30, 7 y 1 día antes (correo) |
| 2. Evento creado sin contratación | **6 meses** | El evento en armado y su contenido | Ídem |
| 3. Evento con onboarding incompleto | **6 meses** | El evento en armado | Ídem |
| 4. Borrador avanzado nunca contratado | **12 meses** | Todo el borrador (contenido, fotos, invitados cargados, datos de cobro cargados) | Ídem, con recordatorio de descargar una copia |

**Actividad** = inicio de sesión o escritura efectiva. Si hay una solicitud de derechos pendiente sobre esos datos, se recomienda suspender la eliminación automática. Detalle: `02d` §2.8.

### 2.3 Las que requieren asesoramiento legal o definición financiera


Se **mantienen abiertas**. No se inventan plazos legales ni se asume que los comprobantes de invitados sean documentación contable válida.

**P30 — Tratamiento posterior al cierre de cada clase de dato**
| | |
|---|---|
| **Qué decisión falta** | Para cada clase (datos personales de invitados y de quienes aportan, datos operativos, comprobantes, contenido de la pareja, registros financieros y contractuales): finalidad de seguir conservándola, fundamento, plazo y forma de eliminar o anonimizar de manera efectiva; y si es proporcionado conservar datos de invitados durante los 12 meses de vigencia aunque la boda sea antes |
| **Por qué importa** | Minimización y obligaciones legales: sin esa política no se puede depurar (se conservarían datos sin fundamento) ni conservar (se eliminarían registros exigibles) |
| **Parte del modelo que bloquea** | Valores de la política de `RetentionRun`, estado «depurado» del evento, anonimización de `Contribution`, plazos de respuesta de `DeletionRequest`, tratamiento de `PaymentProof` y del contenido de la pareja, **plazo de la ficha comercial y del historial de la cuenta (P34)** y **fundamento de la eliminación por inactividad (P19)** |
| **Quién debe validarla** | Asesor legal en protección de datos y contador; decide la dueña |
| **Qué no debe implementarse hasta resolverla** | Ninguna eliminación o anonimización automática posterior al cierre; ninguna constante de plazo en el código; ningún trabajo de retención en producción |

**P5 — Seguridad adicional del cambio de alias y datos bancarios**
| | |
|---|---|
| **Qué decisión falta** | Si la confirmación fuera de banda es siempre obligatoria, si hay espera cancelable antes de activar el cambio y si el segundo factor (TOTP) es obligatorio u ofrecido para propietarios. Los controles base de Q4 (solo el propietario, reautenticación, confirmación explícita, auditoría, notificación) **ya están decididos** |
| **Por qué importa** | Un cambio indebido envía las transferencias de los invitados a una cuenta equivocada; es la operación más sensible del producto |
| **Parte del modelo que bloquea** | La secuencia de `PayoutMethodChange`, las reglas de reautenticación de `Session` y el uso de `MfaFactor` para propietarios |
| **Quién debe validarla** | La dueña (producto) con asesoramiento de seguridad |
| **Qué no debe implementarse hasta resolverla** | Ningún endpoint ni pantalla para cambiar alias o datos bancarios, y ningún segundo factor de propietario |

**P6 — Clasificación contable y plazos de B1, B2 y comprobantes**
| | |
|---|---|
| **Qué decisión falta** | Qué documentos son respaldo contable de Weda (órdenes, pagos, facturas), cuáles son registros de la pareja (libro de aportes) y cuáles son solo evidencia operativa (comprobantes de invitados); y los plazos de cada grupo. **No se asume** que un comprobante de invitado sea documentación contable válida |
| **Por qué importa** | Define qué debe conservarse, por cuánto y separado de qué; un error elimina registros exigibles o conserva datos personales sin fundamento |
| **Parte del modelo que bloquea** | Clases de retención `B1`, `B2` y `B3`, `PaymentProof` tras el cierre, archivo del libro (`GiftTransaction`), registros de `Order` y `Payment` |
| **Quién debe validarla** | Contador, con abogado |
| **Qué no debe implementarse hasta resolverla** | Ninguna eliminación ni archivo de registros financieros o comprobantes; ninguna constante de plazo contable |

**P26 — Política de cancelación y reembolso de planes**
| | |
|---|---|
| **Qué decisión falta** | Cuándo corresponde devolución, cuánto, quién la aprueba y qué ocurre con el pago cuando una contratación se cancela o se hizo por error. **No se inventa ninguna política** |
| **Por qué importa** | Sin ella no se puede cancelar una contratación sin decidir arbitrariamente qué pasa con el dinero, ni habilitar cobros reales |
| **Parte del modelo que bloquea** | `Refund` (hoy «Después»), el estado `cancelada` de `Subscription` y el tratamiento del pago en una cancelación |
| **Quién debe validarla** | Abogado y contador; decide la dueña; condiciones del proveedor de pagos |
| **Qué no debe implementarse hasta resolverla** | Cobros reales, cancelaciones o reembolsos automáticos, temporizadores que cancelen contrataciones |

### 2.4 Otras pendientes

| # | Pendiente | Recomendación | Cuándo |
|---|---|---|---|
| P3, P4 | Precio de un plan nuevo; planes en USD | Sin beneficio automático; solo ARS | Antes de monetizar |
| P7 | Contenido de la pareja tras el cierre | Se resuelve con P30 | Con P30 |
| P8 | Política de celdas pequeñas y evaluación de riesgo | Medidas combinadas + validación profesional | Antes de conservar agregados |
| P9, P10, P12 | Plazos de gracia; propietario ausente; cupo | 14 y 30 días; procedimiento auditado; incluye al invitado | Antes de la Fase 5 |
| P14, P16 | Base y consentimiento de la analítica del navegador; unir visita con registro | Mantener apagado | Antes de encender el navegador |
| P25 | Excel sin dependencia nueva; tope del ZIP; vida de archivos generados | Decidir en la Fase 5 | Fase 5 |

**Detalles que quedan para la implementación (dentro de las decisiones cerradas):** hora de envío de los avisos, plantillas, cantidad y espera de reintentos, si se envía un correo de confirmación de la contratación además del aviso en el panel (supuesto: sí), si guardar IP y dispositivo en la constancia de aceptación y el código HTTP exacto de «evento no disponible».

---

## 3. Modelo de estados

Cuatro estados guardados con dueños de transición distintos; el acceso privado se **deduce** del operativo (detalle y diagramas en `02d` §2).

| # | Estado | Entidad | Valores |
|---|---|---|---|
| 1 | Comercial | `Subscription` | **activa** (nace así) · **vencida (terminal)** · reemplazada · cancelada |
| 2 | Operativo del evento | `Wedding` | en armado · activo · **finalizado** |
| 3 | Publicación pública | `Publication` | publicada · dada de baja · **no disponible** |
| 4 | Retención | `Wedding`, `RetentionRun` | datos completos · en retención posterior · depurado · lápida |
| — | Acceso privado al panel | *(derivado)* | abierto (en armado, activo) · **cerrado** (finalizado) |

**Estados y transiciones eliminados:** recuerdo (público); consulta y descarga, ventana final y cerrado (acceso privado); «vence el plan → recuerdo», «termina la permanencia → ventana», «+90 días → cerrado»; la distinción entre vencimiento del plan y fin de la permanencia.

| Fase | Cuándo | 1 | 2 | 3 | Acceso | 4 |
|---|---|---|---|---|---|---|
| F0 En armado, sin contratación | Hasta que el pago queda confirmado | — | en armado | sin publicar | abierto | datos completos |
| F1 Vigente | Desde la confirmación del pago, 12 meses | activa | **activo** | publicada o dada de baja | abierto | datos completos |
| F2 Finalizado | Desde el vencimiento | vencida | **finalizado** | no disponible | **cerrado** | en retención posterior |
| F3 Depurado | Según la política | vencida | finalizado | no disponible | cerrado | depurado |
| F4 Lápida | Eliminación o fin de la política | — | — | no disponible | cerrado | lápida |


**Invariantes:** un evento finalizado no vuelve a activo; no hay transiciones hacia atrás; ningún estado depende de la fecha de la boda; republicar, mejorar, dar de baja o cambiar la fecha no mueven el vencimiento; el instante de vencimiento es exclusivo y el servidor lo compara con el reloj en cada pedido.

---

## 4. Reglas de permisos

Se aplican **a todos los roles, incluido el propietario**, en el servidor, con una política central. Matriz completa en `02d` §3. ✓ permitido · — bloqueado.

| Acción | En armado | Activo | Finalizado |
|---|:-:|:-:|:-:|
| Editar contenido, fecha, regalos, datos bancarios (con Q4), invitados, RSVP | ✓ | ✓ | **—** |
| Publicar, despublicar, republicar | — (la primera publicación es automática al confirmarse el pago) | ✓ | **—** |
| Revisar y actualizar estados de aportes y comprobantes | — | ✓ | **—** |
| Consultar información financiera | ✓ | ✓ | **—** |
| Descargar los cuatro entregables | ✓ | ✓ | **—** |
| Acceder al panel del evento | ✓ | ✓ | **— (todos los roles)** |
| Contratar un plan nuevo y crear un evento nuevo; gestión de cuenta; solicitar eliminación | ✓ | ✓ | ✓ |

| Lo que ve el público | Publicada | Dada de baja | No disponible |
|---|:-:|:-:|:-:|
| Sitio, RSVP, regalos, aportes, enlaces personales | ✓ | — | **— (el servidor responde «evento no disponible»)** |

**El evento vencido dentro de la cuenta (P34, propuesta adoptada).** Aparece en la cuenta **del propietario** como «Finalizado», solo con información comercial y contractual:

| Se muestra | No se muestra ni se puede abrir |
|---|---|
| Nombres de la pareja, fecha de la boda, plan contratado, fecha de activación y publicación y de vencimiento | Micrositio, invitados, RSVP, regalos y aportes |
| Historial de órdenes y pagos a Weda | Alias y datos bancarios |
| Comprobantes de compra de Weda, cuando corresponda | Comprobantes cargados por invitados; información operativa o financiera del evento |

No se puede editar, duplicar, recuperar, exportar ni reactivar. Para mostrar nombres y fecha aunque el casamiento ya esté depurado se congela una **ficha comercial** en la contratación al vencer (su fundamento y plazo son pendientes legales).

**La cuenta puede seguir existiendo** y la pareja puede crear y contratar un evento nuevo e independiente, pero **el evento vencido permanece cerrado** (no se reactiva, edita, duplica ni recupera) y una cuenta activa no cambia su estado. **Soporte de Weda no puede reactivar, renovar ni extender un evento.** Los accesos a datos financieros conservados quedan restringidos y auditados y no habilitan la reapertura.

---

## 5. Tratamiento de los datos después del vencimiento

Al vencer se cierra el acceso, se bloquean escrituras y exportaciones y se calcula la fotografía final. **No se elimina todo de inmediato ni se conserva todo**: cada clase sigue su tratamiento. **Plazos no definidos (P30).**

| Clase | Tratamiento posterior | Plazo | Acceso |
|---|---|---|---|
| **Datos personales** (invitados, quienes aportan) | Eliminar o anonimizar de forma **efectiva** cuando termine la finalidad; nunca conservar por conveniencia técnica | A validar | Sin acceso de la pareja; acceso mínimo y auditado |
| **Datos operativos** (invitaciones, enlaces, mesas, mensajes, contenido) | Eliminar según la política; el contenido de la pareja sigue P7/P30 | A validar | Ídem |
| **Datos financieros con obligación legal** (libro de la pareja, destinos de cobro, órdenes, pagos, precios) | **Conservar** separados de los datos personales, sin cascada, con referencias a la lápida | A validar (art. 328 CCyC; P6) | **Restringido** |
| **Evidencia de pagos** (comprobantes) | Se decide al clasificarla; no se asume respaldo contable | A validar (P6, P30) | Ídem personales |
| **Datos analíticos** | Siguen sus plazos propios; el vencimiento no los borra; agregados solo tras evaluación de riesgo | 13 y 25 meses; agregados según evaluación | Personal autorizado |
| **Datos comerciales y contractuales** (incluye la **constancia de aceptación de la vigencia**, `TermsAcceptance`) | Consentimientos independientes del evento; términos, aceptaciones y contratos según obligación legal; la constancia solo se agrega, no se edita | A validar | Restringido |

**Derechos de las personas sobre un evento cerrado (P32).** El derecho legal de acceso, rectificación y supresión **no es el acceso comercial al producto** y se atiende por un procedimiento separado (solicitud, verificación de identidad, informe puntual auditado), **sin reactivar el evento ni habilitar el panel**. Las exportaciones del panel bloqueadas al vencer no anulan esos derechos. Plazos de respuesta y rol de Weda: pendientes de asesoramiento.

**Cuatro categorías de documentos que no se mezclan (P34)** y cuyos plazos **no se asumen iguales**:

| # | Categoría | Clase | ¿Visible en la cuenta? |
|---|---|---|---|
| 1 | Historial comercial y contractual de Weda (órdenes, pagos, plan, aceptación) | `B1` | Sí |
| 2 | Datos operativos del casamiento | `W`, `A`, `B2` | No |
| 3 | Comprobantes de compra de Weda (cuando corresponda) | `B1` | Sí |
| 4 | Comprobantes cargados por invitados | `B3` | No |

**Borradores abandonados (P19, adoptada).** Los datos de un borrador (nombres, fecha, contenido, invitados cargados, datos de cobro cargados) no son registros financieros ni contractuales (nunca hubo contratación): su eliminación por inactividad **no es** la eliminación de la cuenta ni un derecho legal, y se recomienda suspenderla si hay una solicitud de derechos pendiente.

---

## 6. Riesgos pendientes

### 6.1 Prioritarios
| # | Riesgo | Por qué sigue abierto | Dónde se trata |
|---|---|---|---|
| 1 | Hosting sin persistencia y respaldos probados | SQLite local; sin respaldos ni restauración probados | `01` R1, R2 |
| 2 | Pagos reales sin verificador | Solo proveedor de prueba | `01` R11; ingresos «no auditables» |
| 3 | Integridad financiera | Importes sin moneda; sin libro inmutable | `02` §5.1 |
| 4 | Borrados en cascada | El borrado del casamiento arrastra lo financiero | `02c` §2.11 |
| 5 | Seguridad de alias bancarios | Alias dentro del JSON del borrador | `02` §5.4, P5 |
| 6 | Aislamiento entre bodas | Filtro por usuario; sin pruebas de aislamiento | `02` §5.3 |
| 7 | Migración de importes e invitados | Sin plan de migración | `02c` §2.11 |
| 8 | Anonimización efectiva | Sin evaluación; criterio en `02d` §6.2 | `05` §7 |
| 9 | Tokens expuestos en URLs | Tokens en rutas; falta política de `Referer` | `05` §10 |
| 10 | Concurrencia en operaciones críticas | Un solo escritor; límites en memoria; el instante de vencimiento exige consistencia | `02c` §2.12 |

**La analítica nueva no se adelanta a los tres primeros.**

### 6.2 Derivados del ciclo de vida
- **Pérdida de acceso antes de la boda** (publicación con mucha anticipación): aceptada; mitigación solo por explicación previa, avisos y descargas.
- **Sin descargas tras el vencimiento:** quien no descargó pierde el acceso.
- **Derechos de las personas** (acceso, supresión) sobre un evento cerrado, con exportaciones bloqueadas (P32).
- **Falla técnica entre la confirmación del pago y la publicación:** no es un estado de producto; se resuelve con una operación atómica e idempotente con reintentos y alerta; depende de definir los mínimos de publicación (P35) y de un verificador real de pagos (R11). **Borradores abandonados:** la eliminación por inactividad (P19) necesita validación legal.
- **Política posterior al cierre sin plazos** hasta tener asesoramiento (P30); debe estar definida antes de que el primer evento cumpla 12 meses.

---

## 7. Decisiones anteriores reemplazadas y contradicciones

### 7.1 Reemplazadas por la vigencia única
| # | Decisión anterior | Ahora |
|---|---|---|
| 1 | Plan de 6 meses con bloqueo de modificaciones | No existe; sin bloqueos intermedios |
| 2 | Inicio = `máx(pago, primera publicación)`; pago y publicación como pasos separados | **Pagar = activar + publicar**; inicio = momento en que Weda confirma el pago y activa la publicación |
| 3 | Permanencia pública de 12 meses con recuerdo estático desde el mes 6 | Sin recuerdo; vigencia completa y cierre a los 12 meses |
| 4 | 90 días adicionales de acceso privado | No existen |
| 5 | Modelo anterior (reemplazado): cinco dimensiones de estado con acceso privado propio | Cuatro estados guardados; acceso privado derivado |
| 6 | Retención a los 90 días del cierre del acceso | Política posterior al cierre por clase, sin plazos fijados |
| 7 | Salvaguarda de no depurar un evento con boda posterior | Retirada: el evento vence en su fecha |
| 8 | P1, P21, P27, P28 | Retiradas por obsoletas |
| 8b | **P18** (contratación pagada sin publicar), con su plazo de 12 meses, avisos, cancelación y métricas; el estado «pendiente de inicio»; la séptima condición propuesta para P33 | **Eliminados**: pagar implica activar y publicar |
| 9 | P2 con límite de anticipación | Cerrada: sin límite; explicación previa |

### 7.2 Contradicciones con el código y los textos actuales (a resolver en la implementación)
- Hoy: `PUBLICATION_MONTHS = 6` y `PUBLICATION_TERM = '6 meses'` en `plans.ts`, y los textos «6 meses» en la landing, el diálogo de publicar y Ayuda.
- Hoy: la página, el RSVP y los regalos públicos responden `410` a los 6 meses.
- El servidor bloquea publicar pero no editar al vencer; no existe «finalizado» ni cierre del panel.
- Un casamiento por cuenta (`owner_id UNIQUE`); importes sin moneda; borrados en cascada; sin exportaciones, retención ni eliminación; límites de uso en memoria.
- Hoy **el pago solo habilita el botón «Publicar mi página»**: pagar y publicar son dos acciones separadas; el diseño exige una sola operación atómica. El inicio ya cuenta desde la primera publicación (hoy manual).

### 7.3 Inconsistencias que dependen de decisiones pendientes
Las pendientes de asesoramiento P30, P6, P26 y P5, el requisito de definición P35, y P34 (propuesta adoptada; falta validar la conservación de cada categoría). La aprobación de la redacción ajustada de las condiciones 1 y 2 de P33.

---

## 8. Orden recomendado de implementación

No empieza nada sin tu aprobación. Cada etapa debe poder revertirse y convivir con los datos existentes.

1. **Operación:** hosting con persistencia, respaldos y restauración **probados**.
2. **Integridad:** lápidas, retiro de cascadas financieras, saneamiento del alias en el borrador, respaldo previo a toda migración.
3. **Dinero:** moneda explícita en unidades menores, libro inmutable, regalos repetibles, destino de cobro versionado con reautenticación.
4. **Seguridad base:** tokens hasheados y política de `Referer`, límites persistentes, pruebas de aislamiento, propietario único y concurrencia.
5. **Modelo del casamiento:** membresías, varios casamientos por propietario, **vigencia de 12 meses con guardia de estado** (el instante de vencimiento exclusivo y consistente), suscripción terminal.
6. **Invitaciones y RSVP** con cupo y enlaces hasheados; migración de invitados.
7. **Administración interna y precios**; **verificador real de pagos** antes de contar ingresos reales; **aceptación expresa de la vigencia antes de confirmar la contratación** (P33) y **avisos de vencimiento** a 30, 7 y 1 día (P23).
8. **Micrositio por bloques y publicación versionada.**
9. **Exportaciones** (cuatro entregables) y **avisos antes del vencimiento**.
10. **Eliminación de borradores por inactividad** (P19, adoptada; tras validación legal): avisos y eliminación escalonada de lo nunca contratado.
11. **Política posterior al cierre** (`RetentionRun`, `DeletionRequest`, anonimización efectiva), con **P30 resuelta**. Debe estar lista **antes** de que el primer evento cumpla 12 meses.
12. **Analítica:** contrato de eventos del servidor, fotografía mensual, agregados con evaluación; eventos del navegador solo tras P14.

**Se puede preparar ahora sin tocar código ni esquema:** textos de la explicación previa y de la pantalla de cierre, aclaración del resumen financiero, registro de eventos y definiciones de métricas.

---

## 9. Aspectos que requieren asesoramiento legal o contable

1. **Tratamiento posterior al cierre por clase de dato** (finalidad, fundamento y plazo) y **proporcionalidad** de conservar datos de invitados durante la vigencia (P30).
2. **Obligaciones contables y fiscales:** qué registros de Weda caen en el art. 328 CCyC y por cuánto tiempo; quién es el obligado respecto del libro de regalos; si el comprobante de un invitado es respaldo contable de alguien (P6).
3. **Rol de Weda** respecto de los datos de invitados que carga la pareja (responsable o encargado) y avisos a los invitados.
4. **Venta de planes:** información **previa** sobre la vigencia de 12 meses desde que se confirma el pago y se publica, independientemente de la fecha del casamiento, ausencia de renovación y extensión, cierre definitivo sin descargas posteriores, constancia de aceptación; defensa del consumidor y desistimiento (P23, P33).
5. **Derechos de acceso, rectificación y supresión** sobre un evento cerrado con exportaciones bloqueadas, y plazos de respuesta (P32).
6. **Transferencias internacionales** a proveedores e **inscripción de la base** ante el organismo de aplicación.
7. **Base legal de la analítica de comportamiento** y uso de identificadores anónimos (P14).
8. **Efectividad de la anonimización** de lo que se conserva y criterio de reidentificación.
9. **Comunicaciones comerciales:** consentimiento, identificación y baja.
10. **Datos de menores** (acompañantes, integrantes de un grupo).
11. **Constancia de aceptación de la vigencia (P33):** suficiencia de la aceptación electrónica como evidencia; información previa al consumidor; si las cláusulas «sin renovación», «sin extensión» y «sin exportaciones tras el vencimiento» requieren destaque; si es proporcionado guardar IP y dispositivo; plazo de conservación de la constancia.
12. **Avisos de vencimiento:** si deben ser obligatorios y no desactivables y qué se considera constancia de comunicación sin confirmación de entrega.
13. **Procedimiento de derechos sobre un evento cerrado (P32):** plazos de respuesta, verificación de identidad de quien no tiene cuenta y rol de Weda frente a los datos de invitados.
14. **Textos legales:** aclaración del resumen financiero («Weda no verifica transferencias…») y avisos de vencimiento.
15. **Eliminación de cuenta:** excepciones por obligación de conservar y comunicación al titular.
16. **Obligaciones del proveedor de pagos** al integrarlo.
17. **Historial comercial visible en la cuenta (P34):** fundamento y plazo para mostrar y conservar la ficha comercial, el historial de órdenes y pagos y los comprobantes de compra de Weda; que los cuatro tipos de documentos tengan plazos distintos.
18. **Cancelación y reembolso de planes (P26)** (por ejemplo, un pago hecho por error): si corresponde devolución, tratamiento contable y condiciones del proveedor de pagos.
19. **Eliminación por inactividad (P19):** fundamento, suficiencia del aviso, proporcionalidad de los plazos y eliminación de cuentas inactivas.

Las citas de la Ley 25.326 en `02b` se hicieron de memoria y **deben verificarse**.

---

## 10. Verificación realizada

| Verificación | Resultado | Evidencia |
|---|:-:|---|
| Chequeos automáticos del catálogo (generador de `02`, `03`, `03b`, `04`, `02b`, `02c`) | ✅ | 20 de 20 chequeos pasan; el detalle está en `02c-validation-report.md` §1 |
| Toda entidad nombrada en los documentos existe en el catálogo | ✅ | todas existen |
| El diccionario describe exactamente las entidades del catálogo | ✅ | 86 entradas / 86 entidades; faltan []; sobran [] |
| El diagrama detallado usa solo entidades del catálogo | ✅ | 79 entidades en el diagrama; fuera del catálogo: [] |
| Sin frases del modelo anterior (6 meses, recuerdo, ventana de 90 días) fuera de las notas de reemplazo | ✅ | ninguna |
| «6 meses» solo aparece como comportamiento actual o como decisión reemplazada | ✅ | solo en notas de reemplazo o del estado actual |
| Nunca se afirma dinero recibido ni acreditado | ✅ | solo aparecen en negaciones o prohibiciones |
| La vigencia única de 12 meses figura en los documentos de ciclo de vida | ✅ | presente en 02, 02b, 02d, 05 y 06 |
| docs/ux-flows.md recoge la vigencia única de 12 meses y aclara que el código actual no coincide | ✅ | sección «Ciclo de vida del evento» presente |
| Toda decisión Pn referenciada existe en la tabla de decisiones | ✅ | 35 decisiones en la tabla; referenciadas fuera de la tabla: [] |
| Los enlaces entre documentos existen | ✅ | todos existen |
| Las decisiones P23, P31, P32 y P33 están recogidas de forma coherente (02d, 02, 02b, 06 y ux-flows) y P5, P6 y P30 siguen abiertas con sus bloqueos | ✅ | avisos True, URL no disponible True, aceptación True, bloqueos de P30/P5/P6 True, derechos separados True, estados en la tabla True |
| P34 (propuesta adoptada), P18 (eliminada), P19 (adoptada) y P35 (pendiente) están recogidas de forma coherente en 02, 02b, 02d, 06 y ux-flows | ✅ | estados en la tabla True, secciones de 02d True, cuatro categorías True, informe 06 True, ux-flows True, retención 02b True |
| «Pagar = activar + publicar»: un único instante, sin estado ni métricas de espera entre el pago y la publicación | ✅ | 02d True, métricas True, P18 sin rastros True |
| 02d declara los cuatro estados guardados y el acceso privado derivado | ✅ | comercial, operativo, publicación pública y retención; acceso privado derivado |
| Todos los diagramas Mermaid renderizan | ✅ | 23 diagramas verificados (los de los `.md` y los dos `.mmd`); fallidos: 0  |
| Los diagramas, el diccionario y los documentos salen del mismo catálogo | ✅ | El generador produce `02`, `02b`, `02c`, `03`, `03b` y `04` desde `entities.txt` y la lista de relaciones; `02d`, `05`, `05b` y `06` se escriben a mano y se contrastan con el catálogo en los chequeos anteriores |

**Lo que no se verificó:** que el modelo funcione al implementarse (se prueba en las Fases 5 y 6); que los textos legales sean suficientes; el rendimiento de las agregaciones en SQLite; la lógica real de vencimiento, que hoy no coincide con el diseño.

---

## 11. Qué NO se hizo y qué sigue

No se modificó código, SQLite, migraciones, APIs ni dependencias; no se hicieron commits, push ni deploy. **No avanzo a ninguna implementación ni a otra fase sin tu aprobación explícita.**
