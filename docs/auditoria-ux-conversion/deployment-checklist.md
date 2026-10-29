# Checklist de despliegue

Estado al 2026-10-29. **No se hizo ningún despliegue.** Lista para el primer despliegue a producción.

## 1. Servidor y almacenamiento
- [ ] Hosting con **Node 22.5 o superior** (usa `node:sqlite`) y **disco persistente**. SQLite no sirve en hosting efímero o serverless.
- [ ] `npm ci && npm run build`, y arrancar `node .output/server/index.mjs` (preset `node-server` de Nitro).
- [ ] **HTTPS** delante, con un proxy de confianza que mande `X-Forwarded-For`. Ver `docs/backend-readiness.md`.
- [ ] Respaldo diario de `WEDA_DATA_DIR`, que contiene:
  - `weda.db`;
  - `receipts/` (comprobantes, privados);
  - `media/` (fotos de los casamientos, públicas por URL con hash).
- [ ] Probar que el respaldo se pueda restaurar.

## 2. Variables de entorno (en el hosting, nunca en el repositorio)

| Variable | Obligatoria | Qué es |
|---|---|---|
| `NODE_ENV=production` | Sí | Activa cookies Secure y exige `WEDA_SECRET` |
| `WEDA_SECRET` | **Sí** (sin ella la API responde 503 `backend_unavailable` y el panel queda en modo demostración; las páginas siguen sirviéndose) | 32+ caracteres al azar (`openssl rand -base64 48`). Firma los enlaces de baja de novedades y, por defecto, los webhooks |
| `WEDA_DATA_DIR` | Sí | Carpeta en el disco persistente |
| `WEDA_DB_PATH` | No | Por defecto `WEDA_DATA_DIR/weda.db` |
| `WEDA_PUBLIC_URL` | Sí | `https://weda.app`: arma los enlaces de los correos |
| `VITE_SITE_URL` | Sí (al compilar) | `https://weda.app`: canonical, sitemap y Open Graph |
| `VITE_GOOGLE_MAPS_KEY` | Recomendada (al compilar) | Clave de navegador restringida por dominio, con Maps JavaScript API y Places API (New) |
| `RESEND_API_KEY` | Sí para mandar correos | Sin ella no sale ningún correo: constancias, recuperar la clave, pedir comprobante |
| `WEDA_MAIL_FROM` / `WEDA_MAIL_REPLY_TO` | Sí con correo | `Weda <hola@weda.app>`, con el dominio verificado en Resend |
| `WEDA_PAYMENTS_PROVIDER` | **Vacía hasta integrar un proveedor real** | **Nunca `test` en producción** |
| `WEDA_PAYMENTS_WEBHOOK_SECRET` | Con un proveedor real | Secreto de webhooks del proveedor |
| `WEDA_REQUIRE_PAID_ORDER` | — | Se activa sola con un proveedor configurado |
| `WEDA_COOKIE_SECURE` | No | Por defecto `true` en producción |
| `WEDA_ALLOWED_ORIGINS` | No | Orígenes extra para escrituras |
| `VITE_ANALYTICS` | No (al compilar) | `on` manda los eventos del navegador al propio servidor |

## 3. Migraciones
- Se aplican **solas al arrancar**: son ordenadas e idempotentes (`PRAGMA user_version`). Hoy son 6:
  1. base;
  2. correos de invitados y consentimientos;
  3. `mail_log`;
  4. `password_resets`;
  5. `payment_events`;
  6. `funnel_events`.
- [ ] Antes de desplegar una versión con migraciones nuevas, **respaldar la base**.

## 4. Servicios externos
- [ ] **Resend:** cuenta, dominio weda.app verificado (SPF, DKIM, DMARC) y clave.
- [ ] **Google Cloud:** clave de Maps restringida a `https://weda.app/*` y `https://*.weda.app/*`, con facturación activa y un presupuesto con alertas.
- [ ] **Proveedor de pagos:** pendiente (ver `payment-integration.md`). Mientras tanto, **publicar no cobra**.

## 5. Legal (antes de abrir al público)
- [ ] Términos de uso (`/terminos`) y privacidad (`/privacidad`): completar los datos marcados, cerrar las decisiones comerciales y hacerlos revisar por un abogado. Después, quitar el `noindex` de las dos páginas.
- [ ] Inscripción de las bases en la AAIP. Ver `docs/datos-personales.md`.

## 6. Verificaciones después de desplegar
- [ ] `GET /api/health` responde `{ ok: true }`.
- [ ] Registro, ingreso y salida con una cuenta de prueba propia.
- [ ] «¿Olvidaste tu clave?»: llega el correo y el enlace cambia la clave.
- [ ] Publicar y abrir la página pública desde otro dispositivo, con fotos incluidas.
- [ ] Un regalo de prueba con comprobante en un casamiento propio: llega la constancia y el panel muestra el comprobante.
- [ ] `/pago-de-prueba` responde «no habilitado» (404 en la API).
- [ ] Los encabezados de seguridad y las cookies Secure están presentes.
