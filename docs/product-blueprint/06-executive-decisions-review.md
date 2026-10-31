# Weda · Revisión ejecutiva y congelamiento del diseño del MVP

**Fecha:** 2026-10-31 · **Para:** la dueña del producto · **Estado:** propuesta para tu revisión. **No cierra ninguna decisión, no autoriza implementar nada y no inicia ninguna fase.**

Este documento resume el [Product Blueprint](00-product-blueprint.md) para que puedas **aprobar, rechazar o modificar** cada decisión pendiente sin recorrer la documentación técnica. Los detalles están en los anexos: [01 inventario](01-feature-inventory.md) · [02 reglas](02-business-rules-catalog.md) · [03 decisiones y riesgos](03-open-decisions-and-risks.md) · [04 preparación comercial](04-mvp-readiness.md) · [05 roadmap](05-implementation-roadmap.md).

**Cómo leerlo.** Las «recomendaciones» son una sugerencia de esta auditoría, basada en lo que muestran el código y los documentos. **No son decisiones.** Donde una decisión depende de la ley, la contabilidad o la seguridad, la recomendación es una orientación para llevar al especialista, no un criterio legal ni contable.

## Índice

1. [Lo esencial en una página](#1-lo-esencial-en-una-página)
2. [Las decisiones principales](#2-las-decisiones-principales)
3. [Las 22 decisiones pendientes, una por una](#3-las-22-decisiones-pendientes-una-por-una)
4. [Alcance recomendado del MVP](#4-alcance-recomendado-del-mvp)
5. [Qué falta validar técnicamente](#5-qué-falta-validar-técnicamente)
6. [Roadmap: qué se necesita, qué se simplifica](#6-roadmap-qué-se-necesita-qué-se-simplifica)
7. [Cierre: qué te toca a vos y próximo paso](#7-cierre-qué-te-toca-a-vos-y-próximo-paso)

---

## 1. Lo esencial en una página

- **Weda hoy** permite armar la página de un casamiento, cargar invitados, publicar, recibir confirmaciones y registrar aportes con comprobante. Todo eso funciona y está probado en un entorno de prueba (195 pruebas pasan).
- **No puede cobrar**: no hay proveedor de pagos real. Además, **publicar es gratis por defecto**.
- **No tiene dónde guardar datos reales** sin riesgo de perderlos: no hay hosting definido ni respaldos probados.
- **Promete algo distinto de lo que decidiste**: los textos y el servidor dicen 6 meses y publicación manual; tu decisión es 12 meses y «pagar = activar y publicar».
- **La lista de regalos (el diferencial) no cumple sus propias reglas**: un regalo se agota con el primer aporte, el panel no permite confirmar ni rechazar aportes, y el alias se cambia sin ningún control.
- **Los textos legales son borradores** sin revisión de un abogado.

**Mi lectura honesta:** no hay que construir las 102 funcionalidades para vender. Para una primera venta controlada alcanza con un conjunto mucho más chico (sección 4), pero **ese conjunto hoy no está completo y varias decisiones tuyas y de especialistas lo bloquean**.

**Cuántas decisiones hay:** 22 pendientes (DP-01 a DP-22). Pueden agruparse así:

| Grupo | Cantidad | Qué significa |
|---|---:|---|
| **Bloquean cobrar** | 6 | DP-03, DP-05, DP-06, DP-14, DP-15, DP-17 |
| **Bloquean salir a producción con regalos reales** | 2 | DP-01 (solo el nivel base), DP-02 (en lo que toca a la factura) |
| **Bloquean el primer cierre de evento (≈ mes 10–12), no la primera venta** | 4 | DP-04, DP-08, DP-09, DP-10 |
| **No bloquean el MVP** (se pueden decidir después o ya tienen un default seguro) | 10 | DP-07, DP-11, DP-12, DP-13, DP-16, DP-18, DP-19, DP-20, DP-21, DP-22 |

> Nota: DP-19 (testimonios) no bloquea cobrar pero sí conviene resolverlo antes de salir públicamente. DP-18 y DP-20 se resuelven con solo corregir un texto.

---

## 2. Las decisiones principales

Para cada una: qué hay que decidir, cómo está hoy, qué pasa si no se decide, mi recomendación, las alternativas y quién debe intervenir.

### DP-14 · Hosting y base de datos de producción
- **Qué hay que decidir:** dónde vive Weda en producción y cómo se guardan y respaldan los datos.
- **Hoy:** el servidor y la base (SQLite, un archivo local) funcionan en desarrollo. No hay hosting elegido, ni respaldos, ni evidencia de que un reinicio no borre los datos. La base usa una función de Node todavía marcada como experimental (RK-14).
- **Si no se resuelve:** no se puede publicar ni cobrar. Es el prerrequisito de todo lo demás.
- **Recomendación:** para el volumen de un lanzamiento controlado, **mantener SQLite en un servidor con disco persistente, HTTPS y respaldos diarios**, y exigir como condición de aceptación que **se restaure un respaldo en un entorno limpio** antes de cobrar. Cambiar de motor de base de datos es un trabajo grande que no hace falta para vender.
- **Alternativas:** (a) base administrada (Postgres de un proveedor): más robusta, pero exige reescribir la capa de datos; (b) servicio gestionado con volumen persistente que conserve el diseño actual.
- **Dependencias:** ninguna previa. De esta decisión dependen correo, secretos, respaldos y pagos.
- **Bloquea:** cobrar, publicar y salir a producción. **Especialista:** técnico/seguridad; no legal.

### DP-15 · Proveedor de pagos, medios, impuestos y facturación
- **Qué hay que decidir:** a través de quién cobra Weda sus planes, con qué medios, cómo se manejan los impuestos y qué comprobante se entrega.
- **Hoy:** existe la estructura para cobrar y un adaptador de prueba. **No hay cuenta comercial ni proveedor real** (la documentación nombra a Mercado Pago como posibilidad, sin haberla elegido). El adaptador de prueba firma y valida notificaciones, pero nunca habló con un proveedor real.
- **Si no se resuelve:** no hay negocio: no se puede cobrar.
- **Recomendación:** elegir **un solo proveedor** que (1) cobre en pesos argentinos, (2) envíe notificaciones firmadas que Weda pueda verificar, y (3) permita reembolsos; abrir la cuenta y probar en su entorno de prueba antes de decidir los medios. Llevar al contador, antes de cerrar, la pregunta de qué comprobante de compra corresponde emitir.
- **Alternativas:** cobrar por transferencia con confirmación manual (no cumple «pagar = activar y publicar» de forma automática y no existe una administración interna para hacerlo); usar más de un proveedor (más trabajo, no recomendable para el MVP).
- **Dependencias:** DP-14, DP-17, DP-03.
- **Bloquea:** cobrar. **Requiere:** contador (facturación e impuestos).

### DP-03 · Cancelación y reembolso (P26)
- **Qué hay que decidir:** si una pareja puede cancelar o pedir reembolso, en qué condiciones y quién lo resuelve.
- **Hoy:** no existe política ni estado «cancelada». Los términos no la mencionan con claridad.
- **Si no se resuelve:** no se puede cobrar con responsabilidad: cada reclamo se improvisa.
- **Recomendación:** definir una política **simple y escrita**, coherente con que el pago activa y publica el evento al instante. Llevar al abogado, como mínimo, estas preguntas: si corresponde un derecho de arrepentimiento en compras a distancia; qué ocurre si la falla es de Weda; qué ocurre cuando ya se recibieron aportes de invitados. Hasta tener respuesta, **resolver reclamos de forma manual y caso a caso**.
- **Alternativas:** sin reembolsos salvo falla de Weda (más simple, a validar legalmente); reembolso dentro de un plazo corto (más amigable, más costoso de operar).
- **Dependencias:** DP-15, DP-06.
- **Bloquea:** cobrar. **Requiere:** abogado y contador.

### DP-05 · Requisitos mínimos para publicar automáticamente (P35)
- **Qué hay que decidir:** qué datos son indispensables para que, al pagar, la página se publique sola, y qué pasa si falta alguno.
- **Hoy:** la publicación es una acción manual aparte que exige nombres y un plan. No existe la publicación automática.
- **Si no se resuelve:** no se puede construir «pagar = activar y publicar». Si se define mal, la publicación podría fallar después de cobrar.
- **Recomendación:** pedir **muy pocos datos indispensables** (por ejemplo los nombres de la pareja y la fecha) y **verificarlos antes del pago**, no después. Las secciones opcionales nunca deben impedir la publicación. Si algo falla igual, el pago no debe quedar «pagado sin publicar»: la operación se reintenta.
- **Alternativas:** publicar una página con textos por defecto (menos fricción, menos cuidado); exigir más datos (mejor calidad, más abandono).
- **Dependencias:** DP-15 y la definición del mínimo.
- **Bloquea:** cobrar. **Requiere:** tu criterio de producto; seguridad para revisar la atomicidad.

### DP-06 · Condiciones de contratación (P33)
- **Qué hay que decidir:** la redacción definitiva de las seis condiciones de vigencia que la pareja acepta al contratar.
- **Hoy:** no existe aceptación de condiciones al contratar. Se menciona «Términos de uso» en general.
- **Si no se resuelve:** no hay constancia de que la pareja supo que su evento dura 12 meses y se cierra. Es el principal respaldo ante un reclamo.
- **Recomendación:** aprobar la redacción con el abogado y registrar la aceptación **versionada** al confirmar la contratación. Las cláusulas 1 y 2 ya se ajustaron a «pagar = activar y publicar».
- **Alternativas:** una sola casilla con enlace a los términos (más simple, menos evidencia); aceptación por condición (más evidencia, más pasos).
- **Dependencias:** DP-03, DP-04, DP-17.
- **Bloquea:** cobrar. **Requiere:** abogado.

### DP-04 · Qué pasa después del cierre (P30, y con P7 y P34)
- **Qué hay que decidir:** qué se conserva, qué se anonimiza y qué se elimina de cada tipo de dato cuando el evento se cierra, y por cuánto tiempo.
- **Hoy:** nada se elimina; no hay estado «finalizado» ni historial en la cuenta. Todas las tablas del casamiento tienen borrado en cascada (hoy sin ningún camino que lo use, pero latente).
- **Si no se resuelve:** el primer evento llega a su cierre sin saber qué hacer con los datos de invitados, aportes y comprobantes. Además los términos y la privacidad actuales prometen cosas distintas de lo decidido.
- **Recomendación:** **no activar ninguna eliminación ni anonimización automática en el MVP.** Al cierre, bloquear el acceso y conservar todo, y que los textos legales lo digan con honestidad. Mientras tanto, llevar al asesor legal y al contador la tabla de «clase de dato → qué se hace → por cuánto tiempo». Esto no urge para la primera venta, **pero sí debe estar resuelto antes de que el primer evento cumpla 12 meses**.
- **Alternativas:** eliminar todo al cerrar (minimiza datos, pero puede chocar con obligaciones contables); conservar solo lo contable y anonimizar el resto (lo que propone el diseño).
- **Dependencias:** DP-02, DP-07.
- **Bloquea:** el primer cierre de evento; no la primera venta si los textos legales son honestos sobre lo que se conserva. **Requiere:** asesor legal en protección de datos y contador.

### DP-17 · Precios definitivos
- **Qué hay que decidir:** cuánto cuesta cada plan, si es «pago único» y si el precio incluye impuestos.
- **Hoy:** `plans.ts` define tres planes en pesos (95.000, 140.000 y 150.000). `PRODUCT.md` menciona otros valores (180.000 y 320.000, «1 año»). Hay documentos que dicen «pago único» y otros que dicen que no se afirma.
- **Si no se resuelve:** hay riesgo de comunicar precios distintos en lugares distintos.
- **Recomendación:** confirmar los tres precios, mantenerlos en `plans.ts` como única fuente (ya lo es) y revisar con el contador si incluyen impuestos antes de publicarlos como definitivos.
- **Alternativas:** ajustar los precios a la nueva vigencia (12 meses) en lugar de 6; mantener los de referencia.
- **Dependencias:** DP-15 (impuestos y facturación).
- **Bloquea:** cobrar. **Requiere:** contador (impuestos).

### P5, P6 y P30 · Validaciones de seguridad, contables y legales
Se corresponden con tres decisiones del registro:

| Código | Decisión | Qué hay que validar | Con quién | Bloquea |
|---|---|---|---|---|
| **P5** | **DP-01** · Seguridad extra al cambiar el alias | Si además de contraseña reciente, aviso y registro (ya decididos) se agregan confirmación fuera de banda, espera cancelable o segundo factor | Seguridad | Solo los extras; **el nivel base sí** debe estar antes de salir a producción con regalos reales |
| **P6** | **DP-02** · Qué documentos son respaldo contable y sus plazos | Qué debe conservar Weda y por cuánto tiempo; los comprobantes de invitados **no se asumen** documentos contables | Contador, con abogado | La factura de Weda: cobrar. La retención: antes del primer cierre |
| **P30** | **DP-04** · Tratamiento posterior al cierre | Ver arriba | Asesor legal y contador | El primer cierre |

Ninguna de estas validaciones está hecha. **No hay evidencia en el repositorio de que algún asesor haya revisado estos puntos.**

---

## 3. Las 22 decisiones pendientes, una por una

Para consulta rápida. Las 7 principales ya se explicaron arriba y aquí figuran de forma resumida. **«Bloquea»**: C = cobrar, P = publicar, X = salir a producción, — = no bloquea el MVP.

| ID | Nombre | Qué hay que decidir | Hoy | Si no se resuelve | Recomendación | Alternativas | Depende de | Bloquea | Especialista |
|---|---|---|---|---|---|---|---|---|---|
| **DP-01** | Seguridad extra del alias (P5) | Si se agregan confirmación fuera de banda, espera cancelable o segundo factor | El alias se edita sin controles | Un acceso indebido desvía las transferencias | Salir con el **nivel base** (contraseña reciente, aviso por correo, registro del cambio); dejar los extras para después | Solo base · base + espera de unas horas · base + segundo factor | Auditoría y avisos | **X** (el nivel base); los extras no | Seguridad |
| **DP-02** | Respaldo contable y plazos (P6) | Qué documentos respaldan lo contable y por cuánto tiempo | No se conserva nada con ese criterio | No se sabe qué guardar ni qué factura emitir | Llevar al contador la lista de documentos; **no eliminar registros financieros** hasta tener respuesta | Conservar todo · conservar lo mínimo | DP-15 | **C** (factura); retención antes del cierre | Contador y abogado |
| **DP-03** | Cancelación y reembolso (P26) | Condiciones y responsable | No existe | Reclamos sin criterio | Política simple y escrita, a validar; mientras tanto, resolución manual | Sin reembolso salvo falla · plazo corto | DP-15, DP-06 | **C** | Abogado y contador |
| **DP-04** | Después del cierre (P30) | Qué se hace con cada dato y cuánto tiempo | Nada se elimina | El primer cierre llega sin criterio | No eliminar automáticamente en el MVP; resolver antes del mes 10 | Eliminar al cierre · conservar lo contable | DP-02, DP-07 | Cierre; no la primera venta | Legal y contador |
| **DP-05** | Mínimos para publicar (P35) | Qué datos hacen falta para publicar solo | Publicación manual | Pago sin publicación o fallo después de cobrar | Muy pocos datos, verificados antes del pago | Textos por defecto · más datos | DP-15 | **C** | Dueña y seguridad |
| **DP-06** | Condiciones de contratación (P33) | Redacción de las seis condiciones | No hay aceptación | Sin constancia | Aprobar con el abogado y registrar aceptación versionada | Casilla única · por condición | DP-03, DP-04 | **C** | Abogado |
| **DP-07** | Eliminar por inactividad (P19) | Fundamento legal y avisos previos | No existe eliminación automática | Podría eliminarse de forma indebida o nunca | **No activar** la eliminación automática en el MVP | Activarla con avisos tras validar | DP-04 | — | Asesor legal |
| **DP-08** | Avisos de vencimiento (P23) | Hora de envío, plantillas, reintentos, correo al activar | No hay avisos | Pérdida de acceso sorpresiva al cerrar | Avisos a 30, 7 y 1 día por correo y panel, sin asumir entrega; el correo al activar sí | Solo panel · solo correo | Correo probado (MV-04) | Antes del cierre | Dueña |
| **DP-09** | Exportaciones (P25) | Formato, tope del ZIP, vida de los archivos | No hay exportaciones | Sin forma de salvar datos antes del cierre | Resolver técnicamente **sin agregar dependencias sin tu OK** (hay un módulo de planillas ya en el proyecto) | CSV · Excel · ZIP de comprobantes | DP-04 | Antes del cierre | Dueña y técnica |
| **DP-10** | Recontratación y USD (P3, P4) | Precio de un plan nuevo para quien ya tuvo un evento; planes en USD | Un evento por cuenta; solo ARS | Se bloquea la segunda venta | Vender solo en ARS y un evento por cuenta al inicio; resolver antes del primer vencimiento | Mismo precio · descuento · USD luego | DP-17 | Antes del primer cierre | Dueña |
| **DP-11** | Celdas pequeñas y riesgo de métricas (P8) | Cómo evitar que un agregado identifique a alguien | La analítica de tres capas no existe | Riesgo de reidentificación | No conservar agregados históricos en el MVP | Definir umbral mínimo | DP-13 | — | Legal / estadístico |
| **DP-12** | Plazos de gracia, propietario ausente, cupo (P9, P10, P12) | Detalles de procedimientos | No existen | Cierra procedimientos que aún no existen | Postergar con las funciones que los usan | — | Eventos múltiples, invitaciones | — | Dueña |
| **DP-13** | Analítica del navegador (P14, P16) | Base y consentimiento; unir visita con registro | Solo eventos de servidor | Problemas de privacidad si se enciende | **No encender** eventos del navegador en el MVP | Encender con consentimiento | DP-11 | — | Asesor legal |
| **DP-14** | Hosting y base de producción | Dónde vive Weda y cómo se respalda | No definido | No se puede salir | SQLite en disco persistente con respaldo probado | Base administrada | — | **C, P, X** | Técnica y seguridad |
| **DP-15** | Proveedor de pagos, impuestos y facturación | Quién cobra y cómo | Solo prueba | No hay negocio | Un solo proveedor, ARS, notificaciones firmadas, reembolsos | Transferencia manual | DP-14, DP-17 | **C** | Contador |
| **DP-16** | Indexar invitaciones públicas | Si buscadores y una búsqueda pública pueden encontrarlas | Hoy `noindex` | Privacidad de parejas e invitados | **Mantener `noindex`** | Indexar con consentimiento | — | — | Dueña y legal |
| **DP-17** | Precios definitivos | Montos, «pago único», impuestos | Tres precios de referencia en `plans.ts`; otros en `PRODUCT.md` | Precios inconsistentes | Confirmar y centralizar | Ajustar por la vigencia | DP-15 | **C** | Contador |
| **DP-18** | Tarjeta y Mercado Pago como medio de regalo | Si la tarjeta existirá | No existe; el servidor la rechaza | Se promete algo que no hay | No ofrecerla en el MVP | Agregarla después | DP-15 | — (si se corrige el texto) | Dueña |
| **DP-19** | Testimonios | Si son reales y tienen permiso | Los cargaste vos el 2026-10-29 | Publicidad engañosa | Confirmar autenticidad y permiso, o retirarlos | Retirar hasta tener casos reales | — | Antes del lanzamiento público | Dueña |
| **DP-20** | «Tarjeta» en el plan «Regalos» | Si se menciona mientras no exista | El plan la nombra | Promesa vs. realidad | Quitarla del texto | Dejarla como «próximamente» (no recomendable) | DP-18 | — | Dueña |
| **DP-21** | Actualizar documentos originales | Autorizar corregir los que quedaron viejos | Describen un producto sin backend o con otros precios | Lecturas falsas | **Autorizar** (es solo documentación) | Dejarlos como históricos con aviso | — | — | Dueña |
| **DP-22** | Envío de invitaciones (correo/WhatsApp) | Si Weda las envía | La pareja comparte el enlace | Se asume un servicio que no existe | **Fuera del MVP**: la pareja comparte el enlace | Incluirlo con proveedor de envío | DP-12 | — | Dueña |

**Qué pasa si decidís lo contrario de una recomendación.** Cada una se puede cambiar sin afectar a las demás, salvo estas dependencias: DP-14 → DP-15 → DP-03 → DP-06 (en ese orden lógico) y DP-02 → DP-04 → DP-07.

---

## 4. Alcance recomendado del MVP

**Qué se vende:** un evento digital (micrositio, lista de regalos, confirmación de asistencia y gestión de invitados), publicado durante 12 meses desde el pago, en pesos argentinos, con **venta controlada** a unas pocas parejas conocidas. **Weda no custodia ni verifica dinero.**

No hace falta implementar las 102 funcionalidades: **44 ya están implementadas y probadas** y 39 están diseñadas y sin construir; la mayoría de estas últimas **no son necesarias para vender**.

### 4.1 Imprescindibles para la primera venta
Sin esto no se debería cobrar. Todos figuran como bloqueantes en el [anexo 04](04-mvp-readiness.md).

| Qué | Por qué es imprescindible | Ref. |
|---|---|---|
| Hosting con disco persistente, respaldos **restaurados** y correo real probado | Sin esto se pierden datos y no hay recuperación de clave ni constancias | MV-01…MV-05 |
| Proveedor de pagos real con verificación e idempotencia, y compuerta de pago siempre encendida | Sin esto no se cobra, o se publica gratis | MV-06, MV-11 |
| **Pagar = activar + publicar** y **vigencia de 12 meses** en servidor y en todos los textos | Es tu decisión comercial central y hoy el código hace otra cosa | MV-08, MV-09 |
| Aceptación versionada de las condiciones y explicación previa de la vigencia | Es la constancia ante un reclamo | MV-10, IC-24 |
| Política de cancelación y reembolso, y comprobante de compra | Se cobra con responsabilidad | MV-07, MV-12 |
| **Confirmar y rechazar aportes en el panel**, con vocabulario «pendiente / confirmado manualmente» (sin «recibido») | Sin el botón el estado «confirmado» es inalcanzable y la interfaz afirma algo que Weda no verifica | MV-13, IC-07, IC-08 |
| **Regalos repetibles** (un regalo no se agota) | Contradice una decisión de diseño y es el diferencial del producto | NE-01, IC-03 |
| Controles base del alias (contraseña reciente, aviso, registro) | Un acceso indebido desvía las transferencias de los invitados | MV-14 |
| Aportes con moneda explícita y estados que no se pisan | Integridad mínima del dinero registrado | MV-15 |
| Términos y privacidad revisados por un abogado | Hoy son borrador y contradicen el producto | MV-17 |
| Procedimiento de derechos de los titulares (puede ser manual), soporte con visibilidad de órdenes y pagos | Hay que poder atender y resolver | MV-19, MV-21 |
| Reejecutar y registrar las pruebas E2E y una prueba de punta a punta con pagos y correo reales | Hoy no hay evidencia vigente | MV-22 |

### 4.2 Necesarias para operar correctamente
No bloquean la primera venta, pero sí deben estar **antes de que ocurra algo concreto**.

| Qué | Cuándo hace falta | Por qué | Ref. |
|---|---|---|---|
| **Cierre del evento al cumplirse los 12 meses** (nadie edita ni gestiona; URL «no disponible») | Antes de que la primera venta cumpla ≈ 10 meses | Hoy vencer solo bloquea publicar y la pareja sigue operando | TV-01, IC-05 |
| **Avisos de vencimiento** (30, 7 y 1 día) y fecha de vencimiento visible | Idem | Evita la pérdida de acceso sorpresiva | NE-04 |
| **Exportaciones finales** (invitados, regalos y aportes, comprobantes, resumen) | Idem | Es la única forma de salvar los datos antes del cierre | NE-05, TV-03 |
| Política posterior al cierre y derechos de los titulares | Idem | Qué hacer con los datos al cerrar | TV-04, MV-20 |
| Invitaciones personales con cupo (evitar que alguien responda por otro) | Antes de abrir a muchas parejas | Hoy se responde por nombre y se sobrescribe | NE-02, IC-09 |
| Aviso de «hay cambios sin publicar» | Con las primeras parejas | Evita publicar y olvidar cambios | NE-03 |
| Accesibilidad medida, rendimiento con 500 invitados y pruebas con 3 a 5 parejas | Antes del lanzamiento | Hoy no hay evidencia | NE-09, NE-10, NE-11 |

### 4.3 Importantes pero postergables

| Qué | Por qué se puede postergar | Ref. |
|---|---|---|
| Varios eventos por usuario, historial «Finalizado» y recontratación | Nadie necesita un segundo evento antes de los 12 meses; resolver antes del primer vencimiento (DP-10) | TV-02, IC-06 |
| Verificación y cambio de correo; ingreso con Google | El acceso con correo y clave funciona; el botón de Google ya informa que no está habilitado | NE-06 |
| Subida directa de fotos (hoy 6 MB por guardado) | Es una limitación de uso, no un riesgo | NE-07 |
| Planes y aportes en USD | Se vende solo en pesos | NE-08, DP-10 |
| Roles y membresías (administrador, colaborador) y transferencia de propiedad | Un propietario por evento alcanza | PO-01 |
| Administración interna completa | Alcanza con ver órdenes, pagos y estados para soporte (MV-21) | PO-03 |

### 4.4 Fuera del MVP

| Qué | Por qué queda afuera | Ref. |
|---|---|---|
| Marketplace de proveedores, cupones, referidos, campañas | No es el negocio inicial y no está diseñado | PO-04 |
| Analítica de tres capas y tablero de métricas | No hace falta para vender y trae riesgos de privacidad (DP-11, DP-13) | PO-02 |
| Eliminación automática de borradores por inactividad | Requiere un fundamento legal que no existe (DP-07) | PO-05 |
| Tarjeta de crédito o Mercado Pago como medio de regalo | No existe ni está decidida (DP-18) | — |
| Envío de invitaciones por correo o WhatsApp | La pareja comparte el enlace (DP-22) | NE-12 |
| Spotify real y más secciones del micrositio | Mejora, no necesidad | PO-06 |
| Directorio o búsqueda pública de invitaciones | Riesgo de privacidad; se mantiene `noindex` (DP-16) | PO-07 |

---

## 5. Qué falta validar técnicamente

**Estado general (2026-10-31):** `tsc` sin errores; **195 de 195** pruebas de `vitest` pasan; **las pruebas E2E no se ejecutaron en esta auditoría** y `npm run build` tampoco; no se hizo recorrido en navegador. «Probado» significa que una prueba automática lo ejercita en un entorno de prueba; **no es validación en producción**.

Leyenda: ✅ probado automáticamente · 🟡 probado en parte · ❌ sin pruebas o no verificado.

| # | Qué validar | Estado | Evidencia que existe | Qué falta |
|---|---|---|---|---|
| 1 | **Build de producción** | ❌ | Hay `npm run build` y su configuración; no se ejecutó | Ejecutarlo y arrancar el resultado en un entorno parecido al real |
| 2 | **Pruebas E2E (navegador)** | ❌ | Existen ≈ 100 pruebas en 16 archivos `e2e/*.spec.ts` (conteo por texto); resultados de octubre en documentos viejos | Reejecutar toda la suite y registrar fecha y resultado |
| 3 | **Navegación en desktop** | 🟡 | `e2e/desktop/journeys.spec.ts` (25) y `builder.spec.ts` | Ejecutarlas hoy; revisión visual |
| 4 | **Navegación en mobile** | 🟡 | `e2e/mobile-journeys.spec.ts` (12), `landing-mobile.spec.ts` (9) | Ejecutarlas hoy; probar en un dispositivo real |
| 5 | **Registro completo** (registro, ingreso, cierre de sesión, clave olvidada) | ✅ servidor / 🟡 interfaz | `auth-isolation`, `password-reset`, `hardening` (servidor); `account-flow.spec.ts` (E2E) | Correo de recuperación **real** (nunca probado) |
| 6 | **Creación de evento** | ✅ servidor / 🟡 interfaz | `wedding-flow.test.ts`; `onboarding-photo.spec.ts` | E2E vigentes |
| 7 | **Configuración de regalos** | 🟡 | Pruebas de aportes en servidor | La interfaz de regalos y su edición; el alias no tiene controles que probar |
| 8 | **Contratación y pago** | 🟡 solo con proveedor de prueba | `payments-flow.test.ts` (firma inválida, repetida, rechazada, mejora de plan, aislamiento) | **Nada con un proveedor real**; no prueban 12 meses ni «activar + publicar» (es la regla vieja) |
| 9 | **Publicación automática** | ❌ | No existe la funcionalidad; hoy la publicación es manual y está probada con la regla vieja | Construirla y probarla (R2) |
| 10 | **RSVP** | ✅ | Pruebas de servidor (confirmar, cambiar, no duplicar, no filtrar datos, despublicada) | Prueba del riesgo de suplantación (hoy responde por nombre) |
| 11 | **Carga y revisión de comprobantes** | 🟡 | Tipo y tamaño validados, archivo privado, transiciones de estado, 404 a otra pareja | **No hay interfaz para confirmar o rechazar**; cuando exista habrá que probarla |
| 12 | **Aislamiento entre cuentas** | ✅ | `auth-isolation.test.ts`, pruebas de aportes y comprobantes | Repetirlo con eventos múltiples y membresías, si se construyen |
| 13 | **Vencimiento** | ✅ regla vieja | `expiry.test.ts` | Está escrita para 6 meses desde la primera publicación; hay que reescribirla para 12 meses desde el pago, y probar el cierre |
| 14 | **Errores y recuperación** | 🟡 | Entradas inválidas, borrador grande, revisión vieja (409), base caída (503), errores sin detalles filtrados, migraciones repetibles | Restauración desde respaldo; fallo del proveedor de pagos o del correo |
| 15 | **Seguridad web** | ✅ en lo probado | CSRF por `Origin`, cookie `HttpOnly`, claves con scrypt, límites de intentos | Límites en memoria no sobreviven a reinicios ni a varias instancias |
| 16 | **Accesibilidad y rendimiento** | ❌ | Reglas de diseño documentadas | Lector de pantalla, contraste con herramienta, 500 invitados / 100 regalos |
| 17 | **Pruebas con personas** | ❌ | Ninguna | 3 a 5 parejas reales antes de cobrar |

**Para dar por buena la validación del MVP** haría falta, como mínimo: los puntos 1, 2, 3, 4, 8 con proveedor real, 9, 11 con interfaz, 13 reescrito, el correo real del punto 5 y la restauración del punto 14.

---

## 6. Roadmap: qué se necesita, qué se simplifica

El [anexo 05](05-implementation-roadmap.md) propone nueve fases (R0 a R8). Esta revisión propone **agruparlas en cuatro etapas** para el MVP y postergar el resto. **No se empieza ninguna.**

| Etapa propuesta | Reúne | Qué logra | Se necesita para vender |
|---|---|---|---|
| **A · Decisiones** | R0 | Cierra DP-14, DP-15, DP-03, DP-05, DP-06, DP-17 y arranca las consultas legales y contables; actualiza documentos viejos (DP-21) | Sí |
| **B · Producción y cobro** | R1 + R2 | Entorno persistente con respaldos y correo real; cobro real; «pagar = activar y publicar»; 12 meses en todos los textos; aceptación versionada; soporte mínimo (ver órdenes y pagos) | Sí |
| **C · Dinero de los regalos** | R3 | Confirmar y rechazar aportes; regalos repetibles; vocabulario honesto; controles base del alias; moneda explícita | Sí |
| **D · Cierre del ciclo** | R5 (reducida) + R6 (reducida) | Cierre del evento a los 12 meses, avisos, exportaciones, política posterior al cierre y procedimiento de derechos | No para la primera venta; **sí antes del mes ≈ 10 de esa venta** |
| *Postergadas* | R4, R7 (resto), R8 | Invitaciones personales con cupo, administración completa, mejoras, analítica | No |

**Qué se puede simplificar**
- **R1 + R2 juntas:** comparten el entorno y las pruebas; separarlas solo agrega coordinación. El orden interno sigue siendo infraestructura primero, cobro después.
- **R5 sin eventos múltiples:** el cierre, los avisos y las exportaciones son lo necesario; varios eventos por usuario puede esperar.
- **R6 sin eliminación automática:** solo política, textos legales y procedimiento manual de derechos.
- **R7 reducida a soporte mínimo**, que pasa a la etapa B.
- **R4 (invitaciones personales)** se puede adelantar antes de abrir a muchas parejas si te preocupa la suplantación; no bloquea una venta controlada.

**Dependencias que no se pueden saltear:** hosting y proveedor de pagos (A) → cobro (B) → dinero de los regalos (C) → cierre del ciclo (D). La etapa C puede avanzar en paralelo con B una vez resuelta la infraestructura.

**Cómo se aprueba cada etapa** (criterios de aceptación, sin plazos)

| Etapa | Se aprueba cuando |
|---|---|
| **A** | Las seis decisiones que bloquean cobrar están tomadas y registradas; hay respuesta escrita de abogado y contador sobre cancelación, condiciones y comprobante de compra; los documentos viejos están actualizados |
| **B** | Se restaura un respaldo en un entorno limpio y la aplicación abre con los datos; llega un correo real; un pago en el entorno de prueba del proveedor deja el sitio publicado con vencimiento a 12 meses de la confirmación; un pago no confirmado no publica; una notificación repetida no duplica nada; sin aceptación válida no se confirma la contratación; todos los textos dicen 12 meses |
| **C** | Un regalo se puede aportar varias veces; la pareja confirma y rechaza desde el panel; ninguna pantalla dice «recibido»; cambiar el alias exige contraseña reciente, queda registrado y avisa al propietario |
| **D** | Al vencer, ninguna escritura del propietario es aceptada y la URL dice «no disponible»; los avisos salen una sola vez; las cuatro exportaciones funcionan; ningún registro financiero se elimina por cascada |

---

## 7. Cierre: qué te toca a vos y próximo paso

### 7.1 Decisiones que tenés que tomar personalmente
Son de negocio o de producto; los especialistas aconsejan, pero decidís vos.
- **DP-14** hosting · **DP-15** proveedor de pagos (con el contador) · **DP-17** precios definitivos · **DP-05** mínimos para publicar.
- **DP-08** avisos de vencimiento · **DP-10** recontratación y USD · **DP-12** plazos y cupos · **DP-16** indexar invitaciones · **DP-18 / DP-20** tarjeta · **DP-19** testimonios · **DP-21** actualizar documentos · **DP-22** envío de invitaciones.
- Y aprobar el **alcance del MVP** de la sección 4 y las **etapas** de la sección 6.

### 7.2 Decisiones que necesitan especialistas
| Especialista | Decisiones |
|---|---|
| **Abogado** | DP-03 (cancelación y reembolso), DP-06 (condiciones), DP-04 (después del cierre), DP-07 (eliminación por inactividad), DP-16 y DP-13 (privacidad), términos y privacidad definitivos (MV-17), inscripción en la AAIP (MV-18), procedimiento de derechos (MV-19) |
| **Contador** | DP-02 (respaldo contable y plazos), DP-15 (impuestos y factura), DP-17 (precios con impuestos), DP-03 (reembolsos), DP-04 (qué se conserva) |
| **Seguridad** | DP-01 (alias), DP-05 (atomicidad de la activación), DP-14 (hosting y respaldos) |
| **Asesor legal o estadístico** | DP-11 (riesgo de reidentificación en métricas) |

### 7.3 Bloqueantes reales para cobrar
Resumen de las seis decisiones y las seis construcciones sin las cuales no se debe cobrar:

| Decisión | Construcción / condición |
|---|---|
| **DP-14** hosting | Entorno persistente con respaldo restaurado y correo real (MV-01…MV-05) |
| **DP-15** proveedor de pagos | Cobro real con verificación (MV-06) y compuerta de pago encendida (MV-11) |
| **DP-03** cancelación y reembolso | Política escrita y validada (MV-07) |
| **DP-05** mínimos para publicar | Pagar = activar + publicar con 12 meses (MV-08, MV-09) |
| **DP-06** condiciones | Aceptación versionada (MV-10) |
| **DP-17** precios (y DP-02 para la factura) | Textos y comprobante de compra (MV-12) |

Y, aunque no son «decisiones», igual bloquean: confirmar y rechazar aportes en el panel, regalos repetibles y controles base del alias (MV-13, MV-14, NE-01), términos y privacidad revisados (MV-17) y E2E vigentes más una prueba de punta a punta con pagos y correo reales (MV-22).

### 7.4 Alcance recomendado del MVP
Una **venta controlada** del evento digital en pesos, con cobro real, publicación automática al pagar, 12 meses de vigencia, lista de regalos con revisión manual de aportes y un soporte mínimo. Todo lo demás de la sección 4.3 y 4.4 queda para después. Las funcionalidades del cierre (sección 4.2) deben estar listas **antes del mes 10 de la primera venta**.

### 7.5 Próximo paso concreto
**Aprobar o modificar las seis decisiones que bloquean el cobro (DP-14, DP-15, DP-03, DP-05, DP-06, DP-17) y enviar a un abogado y a un contador las preguntas ya redactadas en las secciones 2 y 7.2.** Con eso se podría autorizar la etapa A (sin código) y evaluar después el inicio de la etapa B.

---

*Trazabilidad:* todas las decisiones, riesgos y bloqueantes citados aparecen con el mismo ID en los anexos 03 y 04. Las pruebas citadas son las de `src/test/**` y `e2e/**`. **Lo que figura como no verificado no tiene evidencia en ningún sentido.** No se modificó código, base de datos, API, dependencias ni documentos existentes; no se hicieron commits, push ni deploy.
