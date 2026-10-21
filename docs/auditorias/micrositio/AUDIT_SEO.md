# AUDIT_SEO — SEO y calidad técnica

**Fecha:** 14/10/2026. **Solo lectura.** No se implementó ninguna mejora.
**Marcas:** **[V]** verificado (DOM/HTML real del servidor de desarrollo) · **[I]** inferido · **[R]** recomendación.
**Limitación importante:** todo se midió contra el servidor de **desarrollo** (`vite dev`). El render en producción (`vite build` compila sin errores) **no se verificó**. No hay mediciones de Core Web Vitals de campo.

---

## 1. Landing comercial (`/`) — separada del micrositio

| Elemento | Resultado [V] | Observación |
|---|---|---|
| `<html lang>` | `es` | Correcto |
| `<title>` | "Weda • Organizá tu casamiento en un solo lugar" | Correcto; 46 caracteres |
| `meta description` | Presente, ~150 caracteres | Correcta |
| `og:title`, `og:description`, `og:type` | Presentes | Duplican `title`/`description` |
| `og:image` / `twitter:image` | `data:image/svg+xml,…` (un rectángulo gris 4×3, `#hero`) | **Problema:** no es una imagen real. Los enlaces compartidos no mostrarán vista previa útil |
| `twitter:card` | `summary_large_image` | Correcta, pero sin imagen válida |
| `canonical` | **Ausente** | Recomendado |
| `robots` (meta) | Ausente | Sin restricciones |
| JSON-LD | **Ausente** | Evaluar `Organization`/`WebSite` |
| Encabezados | H1 único; H2/H3 consistentes | Footer con H3 en inglés ("Products", "About", "Inquire") |
| Enlaces | **35 de 39 `<a>` sin `href`** | Rastreabilidad y accesibilidad (no son enlaces reales) |
| Imágenes | 10; 7 con `alt=""` (decorativas), todas con atributo `alt`; 0 con `width/height` | Riesgo de CLS |
| Video hero | `hero.mp4` ≈ 3,7 MB, `preload=metadata`, se pausa con movimiento reducido | Aceptable; sin `poster` verificado |

## 2. Micrositio de ejemplo (`/ejemplo`, `/ejemplo/regalos`)

| Elemento | `/ejemplo` [V] | `/ejemplo/regalos` [V] | Observación |
|---|---|---|---|
| `<title>` | "Ignacio & Martina • Casamiento" | "Lista de regalos • Ignacio & Martina" | Bien diferenciados |
| `meta description` | "Un casamiento ficticio para recorrer…" | **La misma** | Duplicada; además delata que es ficticio |
| `og:title` | **"Weda • Organizá tu casamiento…"** (heredado del root) | Igual | **Inconsistente** con `<title>` |
| `og:description` | Texto de la landing (heredado) | Igual | **Inconsistente** |
| `og:image` / `twitter:image` | **Ausentes** | Ausentes | Sin vista previa al compartir |
| `canonical` | Ausente | Ausente | — |
| `robots` | Ausente (indexable) | Ausente | La demo, con personas ficticias, es indexable |
| JSON-LD | Ausente | Ausente | — |
| `<h1>` | 1 ("Ignacio & Martina") | **2** ("Ignacio & Martina" y "Lista de regalos") | Corregir jerarquía |
| Landmarks | `header`, `nav`, `main`, `footer`, skip link | igual | Correcto |
| Alt | 6/6 con `alt` informativo | 71 `alt=""` decorativas + portada con alt | Correcto; el nombre del regalo vive en `h3` |
| Renderizado | HTML con contenido en la respuesta del servidor (h1, secciones, footer) | idem | **SSR verificado en dev** |
| Carga de fuentes | `<link rel=stylesheet>` Google Fonts DM Sans 400 + Instrument Serif 400, `display=swap`, preconnect | idem | Hoja bloqueante de render; 2 familias solamente (correcto) |
| Preload | `<link rel=preload as=image>` de la portada | n/a | Correcto |
| Errores de consola | Ninguno (solo mensajes de Vite/React DevTools) | ninguno | [V] en dev |

## 3. Rendimiento visual [V/I]

- **Imágenes sin dimensiones:** ninguna `<img>` declara `width`/`height`; los contenedores usan proporciones CSS (aspect-ratio), por lo que el salto visual no se observó, pero no se midió CLS real.
- **Peso:** ~62 imágenes `lm-*`/`regalo-*` ≈ 10 MB totales en `public/`; cada tarjeta es `loading="lazy"`.
- **Lista de regalos:** 71 tarjetas renderizadas a la vez (sin virtualización ni paginación) → ~15 000 px de alto a 1440 px y 79 botones en el DOM.
- **Core Web Vitals:** no medidos. [R] medir LCP (portada), CLS (imágenes), INP (diálogos) en un build de producción.

## 4. Lo que debería ser propio de cada casamiento [R]

| Elemento | Qué debería ser | Fuente |
|---|---|---|
| `title` | "Ignacio & Martina • Nos casamos el 20 de marzo de 2027" | nombres + fecha |
| `meta description` | Una frase generada con fecha, ciudad y datos reales | campos del evento |
| `og:image` | Foto de portada recortada a 1200×630 | foto principal |
| `og:title` / `og:description` | Iguales a título/descripción propios (no heredar del root) | idem |
| `canonical` | URL del micrositio (con slug) | slug propio |
| `lang` | Idioma de la invitación | configuración |
| `robots` | **`noindex` por defecto** (ver §5) | privacidad |

## 5. Privacidad e indexación [R]

**Qué debe mantenerse privado:** lista de invitados, respuestas de RSVP, comprobantes, mensajes, alias/CBU (si la pareja no lo decide), teléfonos y emails, panel de gestión.

**Rutas y política propuestas:**

| Ruta | Indexable | Justificación |
|---|---|---|
| `/` (landing) | Sí | Captación |
| `/ejemplo*` (demo) | **A decidir:** sí con noindex en regalos, o noindex completo | Personas ficticias; evitar confusión con casamientos reales |
| `/{slug}` (micrositio real) | **No por defecto** (`noindex, nofollow`); opt-in de la pareja | Privacidad: nombres, fecha y lugar identifican personas |
| `/{slug}/regalos`, RSVP | **Nunca** | Datos de pago y respuestas |
| Panel y APIs | Nunca (autenticado) | — |

**Otras medidas:** `robots.txt` hoy permite todo y no declara sitemap (`/sitemap.xml` → 404 [V]). [R] excluir rutas privadas y no incluir micrositios en `sitemap.xml` salvo opt-in. Agregar `X-Robots-Tag` en respuestas de rutas privadas.

## 6. Datos estructurados [R]

- **`Event`** (schema.org): solo si la pareja lo habilita **y** existen datos reales: `name`, `startDate` (con zona horaria), `location` (nombre + dirección), `eventAttendanceMode`. No incluir lista de invitados ni datos de contacto.
- **`WebSite`/`Organization`** en la landing.
- No marcar `Offer` ni `Product` en regalos: no son productos de venta pública.

## 7. Problemas y recomendaciones priorizadas

| ID | Hallazgo | Sev. | Esfuerzo | Criterio de aceptación |
|---|---|---|---|---|
| S-1 | `og:image` de la landing es un SVG placeholder (`data:`) | P1 | S | `og:image` apunta a una imagen real ≥1200×630 que responde 200 |
| S-2 | `og:title`/`og:description` del micrositio heredan los de la landing | P1 | S | Cada ruta define sus propios `og:*` coherentes con `<title>` |
| S-3 | Sin `canonical` en ninguna ruta | P2 | S | `<link rel=canonical>` autorreferente |
| S-4 | Demo sin política de indexación definida | P1 | S | Decisión documentada + `robots` meta acorde |
| S-5 | `meta description` duplicada entre `/ejemplo` y `/ejemplo/regalos` | P2 | S | Descripciones distintas |
| S-6 | 2 `h1` en `/ejemplo/regalos` | P2 | S | Un `h1` por página |
| S-7 | 35/39 enlaces sin `href` en la landing | P0 | M | Todos con destino real o convertidos en botones |
| S-8 | Sin `sitemap.xml` ni referencia en `robots.txt` | P2 | S | Sitemap con rutas indexables |
| S-9 | Imágenes sin dimensiones | P2 | M | `width`/`height` o `aspect-ratio` explícito en todas |
| S-10 | Lista de 71 tarjetas sin paginación | P2 | M | Carga incremental; LCP/INP medidos |
| S-11 | Core Web Vitals sin medir | P2 | S | Medición en build de producción documentada |
| S-12 | Render de producción no verificado | P1 | S | Verificar HTML del build (`vite build` + servidor) |
| S-13 | Metadata por casamiento inexistente (no hay modelo de datos) | P1 | L | Plantilla de meta generada desde campos del evento |
| S-14 | Fuentes por hoja bloqueante de Google Fonts | P3 | S | `preload` + `font-display: swap`; evaluar auto-hospedaje |
