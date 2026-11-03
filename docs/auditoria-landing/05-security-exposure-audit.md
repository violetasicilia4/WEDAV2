# 05 · Seguridad y exposición frontend

Qué se hizo:
- Se inspeccionó **lo que el sitio publicado entrega al navegador**: el HTML, los 21 archivos JS y CSS, las cabeceras HTTP y los source maps.
- Se probaron rutas de la API **solo con `GET`**, sin datos reales y sin pruebas destructivas.
- Se leyó el código del servidor (`src/server/*`).

Sitio: `https://weda-v2.vercel.app` y `https://www.weda.app`.

## Resumen

| Tipo | Resultado |
|---|---|
| Secretos realmente expuestos | **Ninguno encontrado.** Ni API keys ni tokens ni cadenas de conexión ni `process.env` en los bundles. |
| Source maps | **No se publican.** Los `.map` dan 404 y no hay comentarios `sourceMappingURL`. |
| Información interna innecesaria | Mínima. No hay rutas internas (`/Users/...`), correos, IDs de decisiones (DP-, BR-) ni comentarios de código en los bundles. |
| Código público esperado | El árbol de rutas completo, que incluye panel y pagos, va en el chunk principal. Es normal en una SPA. Muestra que existen `/panel/*`, `/pago-de-prueba` y `/clave/nueva?token=`, pero no los protege ni los expone de más: la autorización vive en el servidor. |
| Vulnerabilidades explotables confirmadas | Ninguna en esta auditoría de solo lectura. |
| Riesgos que necesitan verificación | F-09 (cabeceras), F-10 (pago de prueba) y F-11 (dominio y canonical). |

## Controles que están bien (inspeccionado en código)

- **Sesión:** cookie `HttpOnly`, `SameSite=Lax` y `Secure` según la configuración (`src/server/api.ts:35`).
- **CSRF:** toda escritura exige que el `Origin` sea el host propio o uno permitido (`originOk`, `api.ts:38-44,80`).
- **Límites de intentos:** login, recuperación de clave, cambio de clave, cambios de cuenta para cobrar, eventos, RSVP, aportes y comprobantes (`service.ts:81,128,177,319`; `api.ts:171,192,201,206`).
- **Errores sin detalles internos:** las respuestas son del tipo `{"error":"backend_unavailable"}` y `{"error":"not_found"}`.
- **Comprobantes:** tamaño máximo declarado (`MAX_RECEIPT_BYTES`). El webhook de pagos limita el cuerpo a 100 KB y responde 501 si no está configurado.
- **HSTS** con `preload` y `X-Content-Type-Options: nosniff` en producción.
- **HTML inicial:** solo los scripts de hidratación de TanStack (`$_TSR`) y la restauración de scroll. No hay datos de personas ni de cuentas.
- **Datos de invitados:** `GET /api/public/:slug` devuelve el `snapshot` publicado del sitio (`service.ts:419`). Las escrituras públicas (RSVP, aportes) pasan por límites de intentos.

## Hallazgos

### F-09 · Faltan CSP, `frame-ancestors` y `Permissions-Policy`
| Campo | Detalle |
|---|---|
| Categoría | Seguridad (cabeceras) |
| Severidad | P2 |
| Página / componente | Todo el sitio (configuración de hosting) |
| Dispositivo | Todos |
| Problema | Producción no envía `Content-Security-Policy`, `X-Frame-Options` ni `frame-ancestors`, ni `Permissions-Policy`. Cualquier sitio puede meter `/crear/cuenta` dentro de un `iframe` (riesgo de *clickjacking* sobre el formulario de ingreso). Sin CSP, un XSS futuro no tendría una segunda barrera. |
| Evidencia | Cabeceras de `GET /`: solo `strict-transport-security`, `x-content-type-options`, `referrer-policy`, `cache-control` y `server`. |
| Impacto en el usuario | Riesgo potencial, no explotado. |
| Impacto comercial | Bajo hoy; aumenta cuando haya cuentas reales. |
| Recomendación | `frame-ancestors 'self'`, compatible con el `iframe` propio de `/crear`. Una CSP inicial en modo *report-only*. `Permissions-Policy` restrictiva (cámara, micrófono y geolocalización desactivados). |
| Esfuerzo | S–M |
| Dependencias | La configuración de Vercel o del servidor Nitro. Hay que probar que el video, las fuentes y el `iframe` sigan funcionando. |
| Criterio de aceptación | Las cabeceras están presentes en producción. Un sitio de otro origen no puede enmarcar `/crear/cuenta`. |

### F-10 · Existe un endpoint para completar pagos de prueba; verificar que no se habilite en producción
| Campo | Detalle |
|---|---|
| Categoría | Seguridad / lógica de negocio |
| Severidad | P2 (requiere verificación) |
| Página / componente | `POST /api/test-payments/:orderId` → `completeTestPayment` |
| Dispositivo | — |
| Problema | Una persona con sesión puede marcar su propia orden como pagada (`outcome: 'paid'`) **si** el proveedor de pagos configurado es `test`. |
| Evidencia | `src/server/service.ts:753-758`: `if (this.cfg.payments.provider !== 'test') throw notFound();`. Hoy producción no tiene base de datos (503), así que no es alcanzable. |
| Impacto en el usuario | — |
| Impacto comercial | Si se habilita la base de datos en producción con el proveedor `test`, cualquier pareja podría publicar sin pagar. |
| Recomendación | Asegurar que en producción el proveedor nunca sea `test`, y que el arranque falle si `NODE_ENV=production` y `provider=test`. Agregar un test de configuración. |
| Esfuerzo | S |
| Dependencias | F-01 (habilitar la base de datos). |
| Criterio de aceptación | En producción, `POST /api/test-payments/x` con sesión responde 404. |

### F-11 · El canonical y el sitemap no coinciden con el dominio servido
| Campo | Detalle |
|---|---|
| Categoría | SEO / configuración pública |
| Severidad | P3 |
| Página / componente | `<head>`, `/sitemap.xml`, `/robots.txt` |
| Dispositivo | — |
| Problema | *(Corregido el 2026-11-03: en una primera lectura se informó que faltaba el canonical; en realidad existe.)* El canonical, `og:url`, `sitemap.xml` y `robots.txt` apuntan a `https://weda.app/`, que redirige con 308 a `https://www.weda.app/`: Google espera que el canonical sea la dirección final. |
| Evidencia | `curl /sitemap.xml` muestra `<loc>https://weda.app/</loc>` y `<loc>https://weda.app/lista-de-regalos</loc>`. `curl -I https://weda.app/` responde 308 hacia `www`. El HTML de `www.weda.app` tiene `<link rel="canonical" href="https://weda.app/"/>`. |
| Impacto en el usuario | — |
| Impacto comercial | Hipótesis: Google puede indexar `weda-v2.vercel.app`, `weda.app` y `www.weda.app` como duplicados. |
| Recomendación | Definir un solo dominio canónico (`https://www.weda.app`) en `VITE_SITE_URL` (build) y en `SITE_URL` (servidor). Que `weda-v2.vercel.app` responda con `noindex` o redirija. |
| Esfuerzo | S |
| Dependencias | Decisión de dominio. |
| Criterio de aceptación | El canonical, el sitemap y la URL final coinciden. |

## Arquitectura frontend y backend (inspeccionado)

- **Lógica solo del servidor:**
  - cuentas, sesiones, guardado del casamiento, publicación, órdenes, pagos, comprobantes y correos (`src/server/*`);
  - validación de sesión en cada ruta privada (`session()` → `requireSession`);
  - validación de la dueña de cada orden (`orderStatus(userId, ...)`).
- **Lógica en el navegador:**
  - armado del borrador (localStorage), catálogo de regalos y planes (`plans.ts` con precios);
  - el borrador sin sesión vive en el navegador: es público para quien usa ese navegador, y es el comportamiento esperado.
- **Imports indebidos de módulos del servidor:** no se encontraron en los bundles (no aparecen `sqlite`, `node:` ni rutas de `src/server`).
- **Endpoints públicos:**
  - `/api/health`;
  - `/api/media/:id` (`GET`; un ID inexistente da 404);
  - `/api/public/:slug` y sus escrituras con límite de intentos;
  - `/api/unsubscribe`;
  - `/api/events` (POST con límite de intentos).
- **Pendiente de verificar** cuando haya base de datos:
  - que los IDs de `/api/media` no sean adivinables;
  - que `/api/public/contributions/:id` sin `token` no devuelva datos de otra persona.
