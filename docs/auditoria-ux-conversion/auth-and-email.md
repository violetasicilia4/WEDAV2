# Cuenta, recuperación de clave y correo

Estado al 2026-10-29.

## Implementado y probado
- **Registro, ingreso y salida** con correo y clave: claves con hash scrypt, sesión en cookie httpOnly y SameSite=Lax. Ya existía; se volvió a probar en la suite.
- **Lo armado antes de registrarse se conserva** al crear la cuenta o ingresar. E2E: `account-flow.spec.ts`.
- **Recuperar la clave**:
  - `POST /api/auth/forgot {email}` responde siempre `{ ok: true }`, exista o no la cuenta. El correo sale en segundo plano para que la respuesta tarde lo mismo en los dos casos.
  - **Token:** 32 bytes al azar. Se guarda **solo su hash** (`password_resets.token_hash`). Vale **una hora** y **sirve una sola vez**. Pedir otro anula los anteriores.
  - `POST /api/auth/reset {token, password}` valida la clave nueva con las mismas reglas que el registro. Al usarse, marca el token, cambia el hash de la clave y **cierra todas las sesiones** de la cuenta.
  - **Límites:** 5 pedidos por hora por correo y 20 por IP.
  - **Pantallas:** «¿Olvidaste tu clave?» en Ingresar, `/clave` (pedir el enlace), `/clave/nueva?token=` (elegir la clave). Perfil enlaza a `/clave`.
  - **Pruebas:** `src/test/server/password-reset.test.ts` (5) y `e2e/remediation.spec.ts` (2).
- **Correo:**
  - Proveedor Resend por HTTP, configurado con variables de entorno.
  - Sin `RESEND_API_KEY` no se envía nada y queda registrado como «skipped» en `mail_log`.
  - Hay un **adaptador de prueba** (`cfg.mail.testOutbox`) que solo configuran las pruebas automáticas: guarda los correos en memoria para leer el enlace.

## Implementado, sin probar con el servicio real
- **Envío real por Resend:** constancia del regalo, pedido de comprobante y recuperar la clave. Nunca se envió un correo real: no hay cuenta ni clave configuradas.

## Bloqueado por credenciales
- **Resend:** crear la cuenta, verificar el dominio weda.app (SPF, DKIM y DMARC en el DNS) y cargar `RESEND_API_KEY`, `WEDA_MAIL_FROM`, `WEDA_MAIL_REPLY_TO` y `WEDA_PUBLIC_URL` en el hosting.

## Pendiente de desarrollo
- **Cambiar el correo de la cuenta:** hoy Perfil deriva a hola@weda.app. Requiere confirmar el correo nuevo con un token.
- **Verificar el correo al registrarse:** no existe.

## Google y Apple (no reactivados)
Los botones se quitaron en la auditoría porque no existía OAuth. Para implementarlos hace falta:
- **Google:** un proyecto en Google Cloud con una pantalla de consentimiento OAuth y un cliente OAuth «Aplicación web».
  - Callback: `https://weda.app/api/auth/google/callback`.
  - Variables: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
  - Validar el `id_token`: firma, `aud`, `iss` y `email_verified`.
  - Proteger el flujo con `state` y PKCE.
- **Apple:** una cuenta de Apple Developer (pago), un Services ID, una clave privada `.p8`, el Team ID y el Key ID.
  - Callback: `https://weda.app/api/auth/apple/callback`, que llega por **POST** (`form_post`).
  - El correo puede venir oculto (relay de Apple).
- **Para los dos:**
  - una tabla `user_identities (provider, subject, user_id)`;
  - una regla para vincular con una cuenta existente, solo si el correo está verificado por el proveedor;
  - pruebas con cuentas de prueba de cada proveedor.
