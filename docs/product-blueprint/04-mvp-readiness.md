# Weda · Preparación comercial del MVP (anexo 04)

Anexo del [Product Blueprint](00-product-blueprint.md). Ver también: [inventario](01-feature-inventory.md) · [reglas](02-business-rules-catalog.md) · [decisiones y riesgos](03-open-decisions-and-risks.md) · [roadmap](05-implementation-roadmap.md).

## 0. Veredicto

> **No hay evidencia para declarar que Weda esté lista para vender.** El producto funciona como una plataforma de armado y publicación para uso **gratuito y controlado**, con una base técnica sólida en el servidor (195 pruebas pasan), pero **no puede cobrar, no tiene dónde alojarse ni respaldarse, y lo que promete (6 meses, publicación manual, regalos que se agotan) no es lo que se decidió (12 meses, pagar = publicar, regalos repetibles)**.

Esto coincide con lo que ya decía `docs/auditoria-ux-conversion/production-readiness.md` («Weda no está lista para cobrar», 2026-10-29); esta auditoría lo **verificó en el código** y agrega que las decisiones de las últimas rondas de diseño lo alejan aún más del estado vendible hasta que se construyan.

**Qué se vende (MVP comercial).** Un evento digital: micrositio personalizado, lista de regalos, confirmación de asistencia y gestión de invitados, publicado durante 12 meses desde que se confirma el pago, en tres planes en ARS. No incluye marketplace, ni dinero custodiado por Weda, ni verificación de transferencias.

**Cómo se clasificó cada ítem.** Bloqueante = sin esto no se debe cobrar ni publicar a clientes. Para cada uno: motivo, evidencia y dependencia. «Estado» sale del [inventario](01-feature-inventory.md).

---

## 1. Bloqueantes para cobrar y publicar

### 1.1 Infraestructura y operación

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-01 | Hosting con **disco persistente**, HTTPS, Node 22.5 o superior y proxy de confianza | SQLite y los archivos se pierden en hosting efímero; ya falló en Vercel (`backend-readiness.md` §1) | `deployment-checklist.md`: «no se hizo ningún despliegue»; DP-14 abierta | Decidir DP-14 | **No hecho** |
| MV-02 | **Respaldos y restauración probada** de `weda.db`, `receipts/` y `media/` | Sin ellos se pierden cuentas, comprobantes y fotos | No existe ningún mecanismo | MV-01 | **No hecho** |
| MV-03 | Variables secretas y de producción correctas (`WEDA_SECRET` largo, `WEDA_PAYMENTS_PROVIDER` **nunca** `test`, cookie `Secure`) | Una mala configuración publica sin cobrar o expone la firma | `config.ts` exige `WEDA_SECRET` en producción (verificado); el resto depende del despliegue | MV-01 | **Diseñado, sin desplegar** |
| MV-04 | Correo transaccional **configurado y probado de punta a punta** (Resend, dominio verificado, SPF/DKIM) | Sin correo no hay constancia de regalo, ni pedido de comprobante, ni recuperación de la clave | `production-readiness.md`: «No salen correos»; el envío real nunca se probó | Cuenta de Resend y DNS | **No hecho** |
| MV-05 | Registro de errores y alertas mínimas | Detectar fallas en cobro y publicación | Solo `console.error` (OPS-05) | MV-01 | **Parcial** |

### 1.2 Cobro, contratación y vigencia

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-06 | **Proveedor de pagos real** con verificación de firma, idempotencia y conciliación | Hoy publicar no cobra; el webhook general responde 501 | PAY-05/06; IC-17 | DP-15 (proveedor, impuestos, facturación) | **No hecho** |
| MV-07 | **Política de cancelación y reembolso** (P26) | Sin ella no hay respuesta a un pago por error ni a un reclamo | DP-03 abierta | Asesoramiento legal y contable | **Pendiente de decisión** |
| MV-08 | **Pagar = activar + publicar** (publicación automática), con los mínimos de publicación (P35) y la hora de Weda como inicio | Es la regla central del negocio | PAY-07, PUB-06, DP-05 | MV-06, DP-05 | **Decidido, no construido** |
| MV-09 | **Vigencia de 12 meses** aplicada por el servidor y alineada en **todos** los textos (landing, planes, términos, privacidad, FAQ, panel) | Hoy todo dice y aplica 6 meses | IC-02 | MV-08 | **Decidido, no construido** |
| MV-10 | **Aceptación expresa de las seis condiciones de vigencia**, versionada y vinculada a la orden (P33) | Es la evidencia de que la pareja conoce la regla | PAY-08, IC-22 | Aprobar la redacción (DP-06) | **Decidido, no construido** |
| MV-11 | Compuerta de pago **siempre encendida** (publicar exige pago confirmado) | Evita publicar gratis por una variable olvidada | IC-17 | MV-06 | **No hecho** |
| MV-12 | Facturación o comprobante de compra de Weda | Obligación fiscal a definir | PAY-10; DP-02 | Contador | **Pendiente de decisión** |

### 1.3 Dinero de los regalos y seguridad

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-13 | **Revisión manual de aportes en el panel** (confirmar, rechazar, ver comprobante) y vocabulario «confirmado manualmente», sin «recibido» | Es el uso principal del diferencial comercial; hoy el estado «confirmado» es inalcanzable desde la interfaz | GIFT-07, IC-07, IC-08 | — | **API lista, falta la interfaz** |
| MV-14 | **Protección del alias y de los datos bancarios** (contraseña reciente, confirmación, auditoría, aviso) | Desvío de transferencias si se accede a la cuenta | GIFT-14, IC-04 | Definir extras (DP-01) | **Decidido, no construido** |
| MV-15 | Integridad de los aportes: moneda explícita y registro que no se edita (libro) | Es dinero de terceros; sin esto no se pueden corregir errores con rastro | GIFT-10, GIFT-12, IC-15 | — | **Decidido, no construido** |
| MV-16 | Aislamiento entre parejas, sesiones, CSRF, comprobantes privados | Seguridad básica | ACC-05, AUTH-01, PRIV-03 | — | **Hecho y probado** (modelo de un dueño) |

### 1.4 Privacidad y legal

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-17 | **Términos de uso y política de privacidad definitivos**, revisados por un abogado | Hoy son borradores marcados «a completar» | LAN-07, IC-14 | Asesoramiento legal | **Borrador** |
| MV-18 | Inscripción de la base ante la AAIP | Tarea listada en `datos-personales.md` | PRIV-08 | Figura legal de Weda | **No hecha** |
| MV-19 | **Procedimiento de derechos** (acceso, rectificación, supresión), aunque sea manual al inicio | Obligación frente a los titulares; las exportaciones del panel no lo reemplazan | PRIV-06, IC-13 | Asesoramiento legal | **No definido** |
| MV-20 | Política posterior al cierre (P30) definida **antes de que el primer evento cumpla 12 meses** | La retención no puede improvisarse | PRIV-05 | Asesoramiento | **Pendiente de decisión** |

### 1.5 Soporte

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-21 | Canal y procedimiento de soporte (correo existente `hola@weda.app`) y forma de **ver órdenes, pagos y aportes de una pareja** sin tocar la base a mano | Responder reclamos de cobro y de regalos | Hoy se consulta con SQL; ADM-01 no existe | MV-06 | **Mínimo a definir** |

### 1.6 Pruebas

| ID | Ítem | Motivo | Evidencia | Dependencia | Estado |
|---|---|---|---|---|---|
| MV-22 | Reejecutar y registrar las pruebas E2E; probar de punta a punta con proveedor de pagos y correo reales | Las E2E no se ejecutaron en esta auditoría; lo real (pago, correo, dominio con HTTPS) nunca se probó | RK-16; `backend-readiness.md` §10 («no probado») | MV-01, MV-04, MV-06 | **No hecho** |

---

## 2. Necesarios para una buena experiencia (no bloquean la primera venta, sí la calidad)

| ID | Ítem | Motivo | Dependencia |
|---|---|---|---|
| NE-01 | **Regalos repetibles** (sin «Ya elegido») y aporte de importe libre | Es una decisión de diseño y evita frustración; hoy el comportamiento es el opuesto (IC-03) | MV-15 |
| NE-02 | **Invitaciones con enlace personal y cupo**; RSVP sin suplantación | Mejora la calidad de las respuestas y evita sobrescrituras (IC-09) | — |
| NE-03 | Aviso de «hay cambios sin publicar» | Hoy la pareja debe acordarse de «Publicar los cambios» | Servidor expone fechas |
| NE-04 | Avisos de vencimiento a 30, 7 y 1 día; fecha exacta visible; explicación previa | Evita la sorpresa a los 12 meses (RK-12) | MV-04, MV-09 |
| NE-05 | Exportaciones de regalos, aportes, comprobantes (ZIP) y resumen financiero | La pareja necesita sus datos antes del cierre | MV-13 |
| NE-06 | Verificación y cambio de correo; ingreso con Google | Higiene de la cuenta | MV-04 |
| NE-07 | Subida directa de fotos (hoy 6 MB por guardado) | Eventos con muchas fotos | MV-01 |
| NE-08 | Moneda USD y planes en USD | Decisión de diseño (Q3); depende de P4 | MV-15 |
| NE-09 | Accesibilidad: contraste con herramienta, lector de pantalla, `prefers-reduced-motion` por página | **No verificado** (`mobile-and-accessibility.md`) | — |
| NE-10 | Rendimiento con 500 invitados / 100 regalos | No medido (F-14) | — |
| NE-11 | Pruebas con personas | No se hicieron | — |
| NE-12 | Envío de invitaciones por correo o WhatsApp (si se decide) | Hoy se comparte el enlace (DP-22) | NE-02 |

### 2.1 Antes del primer vencimiento (≈ 12 meses después de la primera venta)

No bloquean empezar a vender, pero **deben existir antes de que el primer evento cumpla 12 meses** y deben estar **explicados en el contrato desde el primer día**:

| ID | Ítem | Motivo |
|---|---|---|
| TV-01 | Cierre definitivo del evento (sin edición, publicación, gestión, descargas, panel) y URL «no disponible» | Es la regla de vigencia; hoy solo se bloquea publicar |
| TV-02 | Varios eventos por usuario y evento nuevo independiente; historial «Finalizado» en la cuenta | Sin esto una pareja no puede volver a contratar |
| TV-03 | Exportaciones finales y avisos (NE-04, NE-05) | Después no hay forma de descargar |
| TV-04 | Política posterior al cierre y derechos de los titulares (MV-19, MV-20) | Qué se hace con los datos al cerrar |

---

## 3. Mejoras posteriores

| ID | Ítem | Motivo |
|---|---|---|
| PO-01 | Roles y membresías (administrador, colaborador) y transferencia de propiedad | Decidido; no necesario para una pareja que administra sola |
| PO-02 | Analítica en tres capas, métricas de negocio y tablero | Primero hosting, integridad y dinero (decidido) |
| PO-03 | Administración interna completa (precios, planes, auditoría, roles de personal) | Decidido (Q5); el mínimo de soporte está en MV-21 |
| PO-04 | Marketplace de proveedores, cupones, referidos, campañas | Documentado como «Después»; no existe |
| PO-05 | Eliminación de borradores por inactividad (P19) | Valores decididos; fundamento legal pendiente; actúa a los 6–12 meses |
| PO-06 | Conexión real con Spotify; más secciones del micrositio | La música hoy es solo configuración |
| PO-07 | Directorio o búsqueda pública de invitaciones | Decisión de privacidad abierta (DP-16) |

---

## 4. Lo que sí está sólido (con evidencia del 2026-10-31)

| Área | Evidencia |
|---|---|
| Cuentas y sesiones | 11 pruebas de `auth-isolation`, 5 de `password-reset`, 7 de `hardening` |
| Aislamiento entre parejas | `auth-isolation`, `wedding-flow`, `payments-flow`: no existe ruta con id de casamiento; otra pareja recibe 404 |
| Publicación y sitio público | 30 pruebas de `wedding-flow` incluyen publicar, bajar, republicar, copia publicada, slug estable |
| Aportes con comprobante | Comprobante obligatorio, tipo validado por contenido, privado, idempotencia, monto desde el servidor |
| Pagos (arquitectura) | Monto por servidor, orden reusada, firma, idempotencia: solo con el adaptador de prueba |
| Migraciones | Idempotentes, probadas |
| Tipos y pruebas | `tsc` sin errores; 195 pruebas pasan |

---

## 5. Evaluación honesta

| Pregunta | Respuesta |
|---|---|
| ¿Se puede mostrar el producto y usarlo gratis con un grupo controlado? | **Sí, con un hosting persistente y respaldos**, que hoy no existen. Con 195 pruebas y sin pagos reales |
| ¿Se puede cobrar hoy? | **No**: no hay proveedor real, ni política de reembolsos, ni facturación |
| ¿Se puede publicar a clientes hoy? | **No de forma responsable**: sin hosting, sin respaldos, sin correo probado, con términos en borrador y con promesas que no coinciden con las decisiones |
| ¿Cuántos bloqueantes hay? | **22** (MV-01 a MV-22). Resueltos: 1 (MV-16). Parciales: 2 (MV-03, MV-05). **19 sin resolver**, de los cuales 5 son decisiones tuyas o de asesores (MV-07, MV-12, MV-17, MV-19, MV-20) |
| ¿Qué es lo más corto para una primera venta controlada? | Resolver MV-01 a MV-11, MV-13 y MV-14, más MV-17 y MV-22. Detalle y orden en el [roadmap](05-implementation-roadmap.md) (fases R0 a R3) |
