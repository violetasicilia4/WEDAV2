# Weda · Estado del frontend para producción (auditoría anti-vibecoding)

> **Documento histórico.** Describe el estado de su fecha y no se actualiza. Parte de lo que dice ya no es cierto (es anterior al servidor). Estado vigente: [docs/product-blueprint/](product-blueprint/00-product-blueprint.md) (2026-10-31).

Fecha: 2026-10-24. Alcance: frontend actual (TanStack Start + Vite + Nitro, sin backend). Todo lo que se afirma como verificado se ejecutó sobre un **build de producción local** (`node .output/server/index.mjs`, puerto 3000) y, para la parte de dominio, con un dominio de prueba (`https://weda.example.test`) usado solo en esa verificación. **No se probó** contra un dominio real, Vercel, WhatsApp, Google Search Console ni ningún servicio externo.

## 1. Estado general

- La arquitectura **no es un SPA vacío**: TanStack Start renderiza en el servidor (SSR). La landing, `/ejemplo` y `/ejemplo/regalos` devuelven HTML con `<h1>`, títulos, textos y metadatos antes de ejecutar JavaScript (verificado con `curl`). No hace falta migrar de Vite ni de framework.
- La limitación estructural es de **datos, no de renderizado**: el sitio de cada pareja (`/sitio/$slug`) vive en el `localStorage` de quien lo creó, así que el servidor no puede generar su HTML, título ni imagen para compartir. Eso solo se resuelve con backend (ver §6).
- No hay dominio definitivo: no se inventó ninguno. Canonical, `og:url`, `og:image` absolutos y sitemap quedan listos y se activan con `VITE_SITE_URL` al compilar.
- Se corrigieron los defectos confirmados que se podían resolver desde el frontend (§4). Antes de lanzar públicamente quedan riesgos que dependen de infraestructura (§7).

## 2. Matriz de los 20 puntos

| # | Punto | Estado | Severidad del hallazgo | Resumen |
|---|---|---|---|---|
| 1 | URLs de Vercel y dominio | **Pendiente por infraestructura** | Medio | No hay dominio ni configuración de Vercel (ni `vercel.json`); el build usa Nitro (servidor Node). No hay URLs de preview ni dominios hardcodeados en `src/`. La URL base ahora sale de un único lugar (`src/lib/site.ts`, `VITE_SITE_URL`). Sin dominio, rutas relativas. |
| 2 | HTML inicial sin JavaScript | **Sin problema detectado** (landing, `/ejemplo*`) · sitios de parejas: **pendiente por infraestructura** | Medio (sitios de parejas) | Landing ≈ 5.900 caracteres de texto en el HTML inicial, `/ejemplo` ≈ 1.600; `<h1>` presente. `/sitio/*` entrega solo «Cargando…» (38 caracteres): sus datos están en el navegador. |
| 3 | Página 404 | **Corregido y verificado** | Medio | El estado HTTP ya era 404 real. Defectos confirmados: el botón «Ir al inicio» tenía texto oscuro sobre verde oscuro (ilegible, captura revisada), no llevaba `noindex` y heredaba el título de la landing. Ahora usa el botón de la landing, `X-Robots-Tag: noindex` en todo 404, `<meta robots>` y título «Página no encontrada • Weda» (este último se aplica al hidratar; el `<title>` del servidor sigue siendo el genérico). El error 500 tiene su propia pantalla (`error-page.ts`, `errorComponent`) distinta de la del 404. |
| 4 | Vite y React | **Sin problema detectado** | — | Vite 8 + React 19 + TanStack Start con SSR y Nitro; 61 chunks JS por ruta. No se demostró ninguna limitación que justifique migrar. |
| 5 | Títulos HTML | **Corregido y verificado** (con límite documentado) | Bajo | Cada ruta pública tiene título propio y único. `/sitio/$slug` entrega un título genérico en el HTML; al hidratar pasa a «{Nombres} • Casamiento» (solo lo ve el navegador, no los rastreadores). Título por pareja en HTML: backend. |
| 6 | Meta descriptions | **Corregido y verificado** | Medio | `/sitio/*`, `/encontrar` y el 404 heredaban la descripción de la landing o no tenían propia; ahora cada página pública define la suya (`pageMeta`). Las pantallas del panel no se priorizaron, como se pidió. |
| 7 | Open Graph y enlaces compartidos | **Corregido y verificado en el HTML** · render en WhatsApp: **inconcluso** · metadatos por pareja: **pendiente por infraestructura** | Alto | `og-weda.png` era un rectángulo verde liso de 3 KB sin marca: reemplazado por una tarjeta 1200×630 con el logo y la propuesta. Sin dominio, `og:image` era relativo (muchos rastreadores no lo resuelven): ahora es absoluto cuando hay `VITE_SITE_URL`. Se agregaron `og:site_name`, `og:locale`, `og:image:alt`, `twitter:image` en todas las páginas, y `og:url` con dominio. Los rastreadores no ejecutan JS: lo dinámico por pareja necesita HTML de servidor. |
| 8 | Datos estructurados | **No aplicable** (por ahora) | — | No se agregó schema.org. `Organization`/`WebSite` exigirían URL y logo definitivos, y no hay datos verificables adicionales (no se inventan precios ni reseñas). Revisar con el dominio. |
| 9 | Jerarquía de encabezados | **Corregido y verificado** | Bajo | `/ejemplo/regalos` saltaba de `h1` a `h3`: se agregó un `h2` «Regalos» (visualmente oculto, `.dm-sr`). Landing y resto: sin saltos (revisión automática en 7 rutas). |
| 10 | Páginas sin H1 | **Sin problema detectado** | — | Las 7 rutas revisadas (`/`, `/ejemplo`, `/ejemplo/regalos`, `/encontrar`, `/crear`, `/crear/cuenta`, 404) tienen exactamente un `h1` y un `main`. En `/sitio/*` el `h1` aparece al hidratar. No se forzó en el panel. |
| 11 | Canonical | **Pendiente por infraestructura** (mecanismo verificado con dominio de prueba) | Medio | Se emite solo en la landing y solo con `VITE_SITE_URL` (probado: `https://weda.example.test/`). No hay canonical en páginas `noindex` ni se apunta todo a la landing. Estrategia para invitaciones individuales: canonical autorreferente `/sitio/{slug}` cuando existan en servidor. |
| 12 | llms.txt | **No aplicable** (no se agregó) | — | Weda tiene una sola página indexable y sin documentación pública; no aporta valor verificable. No es requisito de SEO. Reconsiderar si se publican guías o documentación. |
| 13 | robots.txt | **Corregido y verificado** | Bajo | Antes: archivo estático sin referencia al sitemap. Ahora lo genera el servidor y agrega `Sitemap:` con dominio. **Política sin cambios** (todo rastreable para los bots): las rutas privadas/demo no se bloquean a propósito para que el `noindex` (meta + `X-Robots-Tag`) sea visible. `robots.txt` no protege datos privados. No se tocó la política respecto de rastreadores de IA. |
| 14 | Favicon | **Sin problema detectado** | — | `favicon.svg`, `favicon.ico` (48×48) y `apple-touch-icon.png` (180×180) responden 200 con el tipo correcto. No hay manifest ni íconos 192/512 (no requeridos mientras no sea PWA). |
| 15 | Sitemap XML | **Corregido y verificado con dominio de prueba** · real: **pendiente por infraestructura** | Medio | No existía. Ahora `/sitemap.xml` lista solo la landing (XML válido, verificado con parser). `/ejemplo` queda fuera porque lleva `noindex`. **Sin `VITE_SITE_URL` responde 404** (un sitemap exige URLs absolutas). Futuras invitaciones públicas: generarlas desde la base de datos de parejas publicadas, nunca desde una lista fija. |
| 16 | Idioma | **Sin problema detectado** | — | `<html lang="es">` en todas las páginas, también en la pantalla de error del servidor; `og:locale` `es_AR`. |
| 17 | Texto alternativo | **Sin problema detectado** | — | Sin `<img>` sin atributo `alt`. Las imágenes con `alt=""` (carrusel de regalos, fotos de testimonios junto al nombre, tarjetas de regalos con su nombre en `h3`) son decorativas o redundantes con texto adyacente; la imagen informativa de la landing tiene `alt` descriptivo y el video de portada es `aria-hidden`. |
| 18 | Source maps | **Sin problema detectado** | — | 0 archivos `.map` y ninguna referencia `sourceMappingURL` en `.output`. Búsqueda por patrones de secretos (claves `sk_live`, `AKIA…`, claves privadas, `key/secret/token = "…"`) sin resultados en `src`, `public` y bundle. La única variable de entorno del cliente es `VITE_SITE_URL` (pública por diseño). La búsqueda es por patrones: no reemplaza un escaneo dedicado. |
| 19 | Errores de consola y red | **Sin problema detectado** (7 rutas) | — | Tras las correcciones: sin errores de consola ni respuestas ≥ 400 salvo el 404 esperado de la ruta inexistente. `hero.mp4` figura como `ERR_ABORTED` en Chromium headless: es el video diferido (`preload="none"`) que el navegador cancela; no es un error del producto. Antes de corregir había una solicitud externa a Google Fonts en `/ejemplo*` y la landing. |
| 20 | Tamaño del bundle | **Corregido y verificado** | Medio | Ver §3. |

## 3. Rendimiento y bundle (medido)

JS del cliente: el chunk de entrada pesa 377 KB (104 KB con brotli); el resto se divide por ruta (61 chunks, el siguiente es de 37 KB). Nitro sirve gzip y brotli, con caché inmutable en `/assets/**` y `/fonts/**`. No se encontró nada que justifique optimizar el JS.

Lo que sí pesaba, y se corrigió:

| Cambio | Antes | Después |
|---|---|---|
| 28 fotos de regalos, luna de miel y fondo de testimonios (`public/`): ancho máximo 720 px (1100 px el fondo), WebP q78 / JPEG q80 | 4.081 KB | 1.716 KB |
| `fondo-cards.png` (PNG con alfa, 334×440, fondo desenfocado) → `fondo-cards.webp` | 211 KB | 17 KB |
| Cormorant Garamond: de Google Fonts (otro dominio, hoja externa que bloquea el render) a archivos propios variables `latin` + `latin-ext` | 187–280 KB por página + 2 orígenes | 38 KB (latin) y 0 solicitudes externas |

Transferencia total medida en Chromium a 390 px, DPR 2, una carga sin caché, contra el servidor local (después de los cambios): landing 984 KB, `/ejemplo` 929 KB, `/ejemplo/regalos` 1.563 KB (antes de los cambios: 3.323 KB), `/crear` 337 KB. La medición «antes» del JS no es confiable (se hizo contra un servidor con caché), por eso solo se comparan imágenes y fuentes. No se midió con red móvil real ni con Lighthouse. Las fotos recortadas se revisaron a simple vista (3 de ellas) sin pérdida visible; los originales quedan en el historial de Git.

Pendiente de menor prioridad: `hero.mp4` (3,7 MB) ya se carga diferido y respeta ahorro de datos/movimiento reducido; `ejemplo-foto-*` y las portadas no se tocaron (se muestran grandes).

## 4. Correcciones realizadas (archivos)

- `src/lib/site.ts` (nuevo): URL base, `pageMeta()` (título, descripción, Open Graph, Twitter, canonical y `og:url` condicionados al dominio), `buildSitemap()`, `buildRobots()`. Tests en `src/test/site-seo.test.ts`.
- `src/routes/__root.tsx`: metadatos sociales por defecto en todas las páginas; 404 y pantalla de error con el botón de la landing (`.seed-button`), `<main>`, `noindex` y título del 404.
- `src/routes/index.tsx`, `ejemplo.index.tsx`, `ejemplo.regalos.tsx`, `ejemplo.tsx`, `encontrar.tsx`, `sitio.$slug.tsx`: metadatos con `pageMeta`; se quitó la carga de Google Fonts.
- `src/server.ts`: `/robots.txt` y `/sitemap.xml` dinámicos; `X-Robots-Tag` también en todo 404. `public/robots.txt` estático eliminado (habría tapado al dinámico).
- `vite.config.ts`: cabeceras `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin` en todo el sitio (no existían cabeceras de seguridad).
- `src/typography.css`, `public/fonts/cormorant/`: Cormorant Garamond local (licencia OFL).
- `src/components/site/gifts-page.tsx`: `h2` oculto «Regalos». `src/components/site/site-providers.tsx`: título con los nombres de la pareja al hidratar.
- `public/og-weda.png` (tarjeta con marca), imágenes recomprimidas, `fondo-cards.webp` (+ `src/styles.css`).
- Documentación: `README.md`, `.env.example` (`VITE_SITE_URL` se lee al compilar y activa canonical/OG/sitemap), `docs/panel-frontend.md`, `docs/design-system.md`.

## 5. Pruebas efectivamente ejecutadas

- `npx tsc --noEmit`: sin errores. `npm run lint`: 0 errores (9 advertencias `react-refresh` que ya existían). `npm run build`: correcto, con y sin `VITE_SITE_URL`.
- `npx vitest run`: 99 tests pasan (4 nuevos de SEO: sin dominio no hay sitemap/canonical/`og:url`; con dominio sí; el sitemap excluye rutas privadas; robots no bloquea).
- E2E contra el build de producción (suites `landing-mobile`, `mobile-journeys`, `onboarding-photo`, `panel-ui-phase`, `account-flow`): 61 pasaron. Tras agregar las cabeceras de seguridad de `vite.config.ts` se verificaron con `curl` y se repitieron `landing-mobile` y `mobile-journeys` (27 pasaron). No se repitió la auditoría E2E completa anterior.
- HTML real con `curl`: títulos, descripciones, `og:*`, `twitter:*`, `lang`, jerarquía de encabezados, `alt` y estado HTTP de `/`, `/ejemplo`, `/ejemplo/regalos`, `/sitio/abc`, `/encontrar`, `/panel`, 404, `robots.txt`, `sitemap.xml`, favicon, `og-weda.png`, `apple-touch-icon.png`.
- Con `VITE_SITE_URL=https://weda.example.test`: canonical, `og:url`, `og:image` absolutos, `sitemap.xml` (XML válido) y línea `Sitemap:` en `robots.txt`. Luego se reconstruyó sin la variable.
- Navegador (Chromium headless, 390 px): consola/red sin errores en 7 rutas; capturas revisadas del 404, la portada de `/ejemplo` con la fuente local, la grilla de regalos y la landing; revisión automática de etiquetas de formularios, botones sin nombre, `h1`/`main` y desborde horizontal (sin hallazgos).
- Servidor de desarrollo (`vite dev`): `/`, `/robots.txt` y 404 responden bien tras tocar `server.ts`.

**No ejecutado:** producción real, WhatsApp/Facebook Debugger, Google Search Console, Lighthouse/Core Web Vitals en dispositivo, pruebas en Safari/Firefox, escaneo de dependencias (`npm audit`).

> **Actualización 2026-10-26:** desde esta fecha existen servidor, base de datos, cuentas y sitios publicados reales. Esta sección describe el estado **de la auditoría de frontend** y quedó superada en lo que respecta a persistencia, autenticación y publicación; el estado actual está en [backend-readiness.md](backend-readiness.md). Los riesgos de pagos y de confirmación de aportes siguen vigentes.

## 6. Limitaciones por falta de backend (no se resuelven desde el frontend)

**Persistencia y datos.** Todo el estado vive en el navegador de quien lo crea:
- `localStorage` `weda-app`: cuenta (correo), pareja, evento, invitados, mesas, regalos y regalos recibidos, plan y publicación/pagos simulados. `localStorage` `weda-side`: panel plegado.
- `sessionStorage`: demo de `/ejemplo` (regalos elegidos y respuestas de asistencia de la sesión).
- Se pierde al borrar datos del sitio, en modo privado, al cambiar de navegador o de dispositivo. No hay sincronización ni copia de seguridad. Las pantallas revisadas lo aclaran en sus textos («Es una demostración…», «Pago de prueba. No se cobra nada…», «los sitios se guardan solo en el navegador»); no se auditó cada texto de la app.
- La clave del formulario de cuenta solo se valida por formato (fortaleza al registrarse): no se guarda ni se verifica contra ninguna cuenta; «ingresar» con cualquier clave entra al estado local.

**Autenticación y privacidad.**
- No hay autenticación real. `/panel` solo redirige a `/crear` si no hay estado local (`onboarded`); ese chequeo del lado del cliente no es una autorización: cualquiera con el navegador abierto ve su propio estado. **Pendiente crítico antes de lanzar:** cuentas, sesiones y autorización en servidor.
- Los datos de invitados y regalos no están protegidos en servidor porque no existen en servidor. Las parejas y casamientos de las demos son ficticios.
- `noindex`/`X-Robots-Tag` evitan que `/ejemplo`, `/crear`, `/panel`, `/sitio`, `/encontrar` y los 404 se indexen, pero **no son privacidad**.
- `/encontrar` lista parejas de demostración (ficticias). Con parejas reales requeriría consentimiento y control de acceso en servidor.

**Pagos y regalos.**
- El pago del plan es simulado y está rotulado como tal. La landing aclara que el pago se habilita cuando el servicio esté conectado. El regalo de un invitado también es una demostración («no se cobra ni se envía nada»).
- Hallazgo (alto para el lanzamiento): el panel muestra «Aportes recibidos», «Regalos recibidos» y «Total en pesos» a partir de lo que cada invitado informa (transferencia por alias + comprobante cargado en su navegador). **No existen los estados pendiente / confirmado / rechazado**: todo cuenta como recibido. Está documentado como decisión de producto en `docs/ux-flows.md` (la app no verifica pagos), pero antes de operar con dinero real hay que definir esos estados (definición comercial) y confirmar con el banco o la pasarela. No se cambió el texto: renombrar a «informados» es una decisión de producto.
- No se puede validar sin integración y backend: cobro real del plan, confirmación de transferencias, procesamiento seguro y almacenamiento de comprobantes, reembolsos, renovación.

## 7. Riesgos pendientes antes del lanzamiento público

| Prioridad | Riesgo | Qué hace falta |
|---|---|---|
| Crítico | Sin autenticación ni autorización real; datos solo en el navegador | Backend con cuentas, sesiones y datos por usuario |
| Crítico | Sin confirmación de pagos ni estados de regalo | Pasarela/banco + estados pendiente/confirmado/rechazado + backend |
| Alto | Enlaces compartidos de cada pareja sin título ni imagen propios (WhatsApp mostrará la tarjeta genérica de Weda) | HTML por pareja generado en el servidor a partir de datos publicados (SSR con datos o prerender al publicar) |
| Alto | Sin dominio definitivo: canonical, sitemap y `og:*` absolutos desactivados | Definir dominio y compilar con `VITE_SITE_URL`; verificar en Search Console y con el depurador de Facebook/WhatsApp |
| Medio | Sin Content-Security-Policy ni HSTS (HSTS lo debe fijar el hosting en HTTPS) | Definir CSP con los orígenes reales; hoy hay `nosniff` y `Referrer-Policy` |
| Medio | Sin política de privacidad, términos ni consentimiento (datos de invitados, imágenes) | Textos legales (definición comercial/legal) |
| Medio | Fotos de parejas subidas: hoy se guardan en el navegador | Almacenamiento de archivos con límites, escaneo y CDN |
| Bajo | Sin estadística de errores en producción ni monitoreo | Servicio de logs/errores |

## 8. Recomendaciones de infraestructura futura (separadas de lo corregido)

1. **Hosting y dominio:** definir dominio y servidor; fijar `VITE_SITE_URL` en el pipeline; HTTPS + HSTS en el hosting. La arquitectura actual (Nitro) corre en un servidor Node y admite otros destinos sin cambiar de framework.
2. **Backend mínimo:** cuentas, parejas, invitados, regalos y publicaciones. Publicar una pareja = guardar sus datos públicos y su `slug`.
3. **SEO por pareja:** que `/sitio/$slug` cargue los datos públicos en el `loader` (SSR) y emita `title`, `description`, `og:*` con la foto de portada, y canonical autorreferente. Decidir si las invitaciones se indexan (hoy `noindex` por privacidad: probablemente deban seguir así y solo requerir metadatos para compartir). Sitemap solo con parejas que hayan elegido ser públicas.
4. **Imágenes:** pipeline de subida con redimensionado y WebP/AVIF; `srcset` en las grillas.
5. **Pagos:** pasarela argentina, webhooks de confirmación y conciliación; estados de aporte (pendiente, confirmado, rechazado).
6. **Seguridad:** CSP, límites de tamaño/tipo de archivo en comprobantes, limitación de intentos.
7. **Observabilidad:** reporte de errores del cliente y del servidor.
