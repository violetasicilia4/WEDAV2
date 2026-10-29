# Preparación para producción

Estado real al 2026-10-29. **Weda no está lista para cobrar.** Técnicamente se puede desplegar para un uso gratuito y controlado, pero falta el proveedor de pagos, el correo configurado y la revisión legal.

## Implementado y probado (pruebas automáticas en verde)
- **Cuentas:**
  - registro, ingreso, salida y aislamiento entre parejas;
  - **recuperar la clave** con un token de un solo uso que vence en una hora;
  - las sesiones se cierran al cambiar la clave.
- **Casamiento en el servidor:** guardado con revisión optimista, invitados y confirmaciones.
- **Publicación:**
  - página pública desde una copia publicada;
  - «Publicar los cambios» sin dejar la página caída, con el mismo link;
  - bajar y volver a publicar;
  - **vencimiento a los 6 meses aplicado por el servidor**: la página, las confirmaciones y los regalos responden «vencida».
- **Regalos:** correo obligatorio y comprobante en el mismo envío (sin comprobante no hay regalo). El comprobante es privado y solo lo ve la pareja.
- **Pagos (arquitectura):**
  - monto calculado en el servidor;
  - orden reusada ante doble clic o recarga;
  - notificaciones firmadas e idempotentes;
  - publicar exige un pago confirmado si hay proveedor;
  - la vuelta del checkout no es prueba de pago;
  - adaptador **de prueba** inconfundible.
- **Fotos:** se guardan como archivos (`WEDA_DATA_DIR/media`), con nombre igual al hash de su contenido. Se ven desde cualquier dispositivo, y el borrador y la página publicada guardan solo la dirección.
- **Analítica mínima:**
  - el servidor registra los eventos que prueban algo (registro, pago confirmado, publicación, confirmación, regalo y apertura de la invitación);
  - el navegador manda solo eventos de una lista cerrada, sin datos personales, y únicamente con `VITE_ANALYTICS=on`.
- **Formularios:** antes de que la página esté activa no se envían ni la recargan. Esto arregló la intermitencia del alta.
- **Contenido:** sin testimonios inventados; ahora la sección es «Por qué Weda», con funciones reales. Términos y privacidad tienen páginas propias y enlaces.

## Implementado, sin probar con el servicio real
- **Envío de correos por Resend:** constancia, pedido de comprobante, recuperar la clave y baja de novedades.
- **Clave de Google Maps en producción:** probada solo en local.

## Bloqueado por credenciales o decisiones comerciales
- **Proveedor de pagos real:** falta cuenta comercial, credenciales y definir si los precios incluyen impuestos, la facturación y la política de reembolsos. Ver `payment-integration.md`.
- **Correo:** cuenta de Resend y DNS del dominio.
- **Google y Apple:** credenciales OAuth. Ver `auth-and-email.md`.
- **Renovar una publicación vencida:** ¿se paga de nuevo?, ¿cuánto?, ¿se puede extender? Hoy una publicación vencida no se reabre y el contenido se conserva.
- **Testimonios reales:** necesitan clientes con consentimiento.
- **Búsqueda de casamientos para invitados:** decisión de privacidad.

## Pendiente de desarrollo
- Adaptador del proveedor de pagos elegido (por ejemplo, Mercado Pago) y estado `refunded`.
- **Subida directa de fotos:** hoy el navegador reenvía las fotos embebidas en cada guardado y el servidor las deduplica. Además, el límite de 6 MB por guardado sigue aplicando al pedido.
- Almacenamiento de objetos (S3 o R2) si el disco no alcanza.
- Aviso en el panel de «hay cambios sin publicar».
- Cambiar el correo de la cuenta y verificar el correo al registrarse.
- Tablero para leer `funnel_events`: hoy se consulta con SQL.
- Limpieza programada de datos vencidos: no se implementó a propósito, sin una política de conservación.

## Pendiente de revisión legal
- **Términos de uso** (`/terminos`): responsabilidad, ley aplicable, reembolsos y conservación de datos. Están marcados en la página.
- **Política de privacidad** (`/privacidad`): responsable, proveedores y plazos.
- Inscripción de las bases en la AAIP (`docs/datos-personales.md`).
- Consentimiento de novedades: el texto actual está en `src/lib/weda/consent.ts`.

## Riesgos que bloquean el lanzamiento comercial
1. **No hay cobro.** Sin proveedor, publicar es gratis.
2. **No salen correos.** Sin Resend no llegan las constancias ni el enlace para recuperar la clave. Quien olvida la clave no puede volver a entrar.
3. **Legales en borrador.**
4. **Disco persistente y respaldos:** sin ellos se pierden la base, los comprobantes y las fotos.
