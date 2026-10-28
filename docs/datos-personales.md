# Datos personales, correos y base de novedades

Estado al 2026-10-28. Qué está hecho en el código, qué falta configurar y qué hay que hacer antes del lanzamiento (Ley 25.326 de Protección de Datos Personales, Argentina).
Esto es una guía de trabajo, no asesoramiento legal: la política de privacidad y la inscripción conviene hacerlas con un abogado.

## 1. Qué datos junta Weda y dónde quedan

| Dato | De quién | Dónde | Para qué | Lo ve |
|---|---|---|---|---|
| Correo y clave | Pareja | `users` | Cuenta | Weda |
| Datos del casamiento, lista, alias | Pareja | `weddings.draft`, `publications` | Servicio | Pareja e invitados (lo publicado) |
| Nombre, correo (obligatorio), mensaje, regalos, monto | Invitado que regala | `contributions` (+ `contribution_items`) | Informar el regalo, constancia, pedir el comprobante | Pareja |
| Comprobante | Invitado que regala | `receipts` + archivo privado en `WEDA_DATA_DIR/receipts` | Que la pareja valide la transferencia | Pareja |
| Nombre, correo, asistencia, menú | Invitado que confirma | `guests` (+ `rsvp_events`) | Organización del casamiento | Pareja |
| Correo + consentimiento | Invitado que tildó «novedades» | `marketing_consents` | Novedades y promociones de Weda | Weda |
| Registro de correos enviados (tipo, destinatario, resultado; nunca el contenido) | — | `mail_log` | Auditoría y no repetir recordatorios | Weda |

**Base de novedades (`marketing_consents`):** solo entra quien tilda la casilla aparte y destildada (texto en `src/lib/weda/consent.ts`, con versión). Guarda correo, origen (regalo o confirmación), casamiento de origen, versión del texto aceptado y fecha. La baja se marca en `revoked_at` (no se borra: queda la prueba). No se borra si la pareja borra su casamiento.

## 2. Qué está hecho

- Casilla de novedades aparte y destildada en el regalo y en la confirmación, con enlace a `/privacidad`.
- Correo obligatorio al regalar; correo en la confirmación de asistencia.
- **Correos del servidor** (`src/server/mail.ts`, proveedor Resend por HTTP, sin dependencias):
  - **Constancia del regalo** al invitado, apenas regala: regalos, total y botón para adjuntar o cambiar el comprobante. Si aceptó novedades, incluye el enlace de baja.
  - **Pedir comprobante:** botón en Panel → Regalos → Aportes recibidos cuando falta (solo aportes anteriores al 2026-10-28: desde entonces el comprobante es obligatorio al regalar). Uno por día por aporte; genera un enlace nuevo.
- **Página `/comprobante`:** el invitado adjunta el comprobante desde el enlace del correo, sin cuenta.
- **Baja de novedades:** `GET /api/unsubscribe?t=…` con enlace firmado (HMAC con `WEDA_SECRET`); marca la baja y muestra una confirmación.
- **Borrador de política de privacidad** en `/privacidad` (no se indexa). Los datos de la empresa aparecen resaltados como «a completar».

## 3. Qué falta configurar (antes de probar correos de verdad)

1. **Cuenta en Resend** (resend.com) con el correo de la empresa. La crea la dueña.
2. **Verificar el dominio weda.app en Resend:** agregar en el DNS del dominio los registros que indica Resend (SPF, DKIM y, recomendado, DMARC). Sin esto, los correos caen en spam o se rechazan.
3. **Variables de entorno del servidor** (en el hosting, nunca en el repositorio): `RESEND_API_KEY`, `WEDA_MAIL_FROM`, `WEDA_MAIL_REPLY_TO`, `WEDA_PUBLIC_URL=https://weda.app` y `WEDA_SECRET` (32+ caracteres al azar; en producción el servidor no arranca sin él). Ver `.env.example`.
4. **Probar:** hacer un regalo en un casamiento publicado con un correo propio y revisar que llegue la constancia; usar «Pedir comprobante»; tocar el enlace de baja.

## 4. Antes del lanzamiento (checklist)

- [ ] **Política de privacidad definitiva:** completar razón social, CUIT, domicilio, proveedores (hosting y correo), plazos de conservación y fecha; que la revise un abogado; quitar `noindex` de `/privacidad`.
- [ ] **Términos de uso:** el registro los menciona y todavía no existen.
- [ ] **Inscripción de las bases en la AAIP** (ver §5) y agregar el número de inscripción al pie de la política.
- [ ] **Procedimiento para derechos ARCO** (acceso, rectificación, supresión): quién responde los pedidos que lleguen a hola@weda.app y en qué plazos (acceso: 10 días corridos; rectificación/supresión: 5 días hábiles).
- [ ] **Campañas:** enviar promociones solo a `marketing_consents` con `revoked_at IS NULL`, y siempre con enlace de baja (`unsubscribeUrl` en `mail.ts`). Al importar a una herramienta de campañas, sincronizar las bajas en los dos sentidos.
- [ ] **Recordatorios de comprobante:** son comunicaciones del servicio (finalidad del regalo), no promociones. No mezclar promociones de Weda en esos correos.
- [ ] Revisar con el abogado si conviene informar a los invitados, en el formulario, que la pareja ve sus datos (hoy lo dice la ayuda del correo: «Los novios también lo ven.»).

## 5. Inscripción de la base en la AAIP (Registro Nacional de Bases de Datos)

Organismo: **Agencia de Acceso a la Información Pública (AAIP)**, Registro Nacional de Bases de Datos. Trámite gratuito y sin vencimiento (verificar el instructivo vigente antes de empezar).

1. Tener definida la figura legal de Weda (persona humana con CUIT o sociedad) y su clave fiscal (nivel 2 o superior).
2. Entrar a **Trámites a Distancia (TAD)** con esa clave fiscal. Si Weda es una sociedad: con la clave fiscal de la empresa o apoderando a una persona en TAD.
3. Buscar el trámite **«Inscripción del Responsable al Registro Nacional de Bases de Datos»** y elegir responsable **privado**.
4. Adjuntar la documentación respaldatoria (estatuto o contrato social si es sociedad).
5. Declarar las bases. Propuesta para revisar con el abogado:
   - **Usuarios (parejas):** finalidad «prestación del servicio de páginas y listas de regalos para casamientos».
   - **Invitados (regalos y confirmaciones):** Weda los trata por cuenta de cada pareja para prestar el servicio.
   - **Novedades / marketing:** finalidad «envío de novedades y promociones de Weda a quienes lo consintieron»; origen: formularios de regalo y confirmación.
6. Al confirmar llega por correo el **código de registro**: guardarlo (se usa para cualquier modificación). Las observaciones llegan al correo informado.
7. Si cambian los datos declarados (por ejemplo, nuevas finalidades o proveedores), hacer el trámite de **modificación**.

Consultas: registrobasesdedatos@aaip.gob.ar. Fuentes: [Trámites de datos personales (AAIP)](https://www.argentina.gob.ar/aaip/datospersonales/tramites), [Inscribir un responsable de bases privadas](https://www.argentina.gob.ar/servicio/inscribir-un-responsable-de-bases-de-datos-personales-privadas), [instructivo TAD](https://www.argentina.gob.ar/sites/default/files/instructivo_tad_inscripcionymodificacionresponsable_basesprivadas_3.pdf).
