# Weda — Auditoría e implementación de la landing (16/10/2026)

Alcance: landing `/` (hero, funcionalidades, bloque de regalos, testimonios, planes, footer), navegación, SEO, performance y accesibilidad.
No se hicieron pruebas con personas. Las mediciones son contra el servidor de desarrollo local (sin red real ni throttling); no son datos de campo.

## 1. Hallazgos

### Confirmados y corregidos
| # | Qué | Dónde | Cambio |
|---|---|---|---|
| 1 | La bajada del hero no destacaba la lista de regalos | `src/routes/index.tsx` | Nueva bajada con la lista primero; 2 renglones balanceados, ancho máx. 700 px en web |
| 2 | El título de funcionalidades repetía la promesa del hero ("en un solo lugar") | idem | "Todo para compartir su casamiento." + bajada nueva |
| 3 | El bloque de regalos solo repetía que existe la lista | idem | "Regalos para lo que viene después." + descripción del beneficio/mecanismo |
| 4 | CTA de planes "Elegir experiencia" no describía la acción | idem | "Elegir plan" |
| 5 | Botones de plan inactivos sin explicación | idem + CSS | Nota visible: la contratación todavía no está disponible, con enlace al ejemplo |
| 6 | Testimonios ficticios presentados como reales | idem | Etiqueta visible "Testimonios de ejemplo" |
| 7 | Carrusel de testimonios: el track era enfocable pero sin teclado ni nombre | idem | Flechas ←/→ cambian de testimonio; `aria-label` en el track |
| 8 | `<main>` envolvía solo el hero; el resto de la página quedaba fuera del landmark | idem | `<main id="main">` envuelve hero → planes (el skip link ya apuntaba a `#main`) |
| 9 | Video sin `poster` (hero vacío mientras carga o si no reproduce) | idem + `public/hero-poster.jpg` | Poster de 38 KB (fotograma del propio video, recortado para no mostrar la interfaz de Instagram que trae el video) y fondo oscuro de respaldo |
| 10 | Con "ahorro de datos" el video igual se reproducía | idem | Si `navigator.connection.saveData` está activo, queda en pausa y se ve el poster (ya respetaba `prefers-reduced-motion`) |
| 11 | Escala de títulos de sección inconsistente (planes 56 px, regalos 40 px, funcionalidades 38 px) | `src/styles.css` | Los tres comparten la escala (hero 66 > sección 38 en web; 24–30 en mobile) |
| 12 | Metadatos (`title`, `description`, `og:*`) con "gestioná invitados", que el producto no demuestra | `index.tsx`, `__root.tsx` | Alineados con el hero. El `og:image` ya es una imagen real (`/pareja-portada.jpg`) |

### Mejoras de UI ya aplicadas en esta misma sesión (previas a este informe)
Jerarquía tipográfica hero/sección, separación y alineación de las cards, línea fina sobre los títulos, fondo de testimonios con la foto de flores.

### Problemas técnicos que siguen vigentes
- **Video de baja resolución:** 656×464 px, 16,4 s, 3,6 MB, estirado a 1440 px de ancho (se ve borroso). Para mejorarlo hace falta un archivo fuente mejor (≈1280×720, H.264, 2–3 MB). No hay `ffmpeg` en el entorno ni el original, así que no se re-codificó.
- **El video trae la interfaz de Instagram** (corazón "294", comentarios "14") en el borde derecho del cuadro. Hoy el recorte (`object-fit: cover`, `width: 114%`) la deja fuera en los anchos probados, pero depende del recorte. Conviene reemplazar el archivo por uno limpio.
- **Lint:** `npm run lint` da 677 errores, **todos de formato Prettier** en todo el repo (no de lógica); con `prettier/prettier` desactivado quedan 0 errores y 7 advertencias `react-refresh`. No se reformateó el repo (fuera de alcance).
- **`robots.txt` sin `Sitemap`** y sin `sitemap.xml`; el **canonical** solo se emite si existe `VITE_SITE_URL` (no está definida). Requiere dominio de producción.
- **Fuentes:** la hoja de Google Fonts (Cormorant Garamond) bloquea el render en la landing solo para la maqueta del "Sitio del casamiento". Evaluar autoalojarla.
- **Imágenes sin `width`/`height`** (CLS medido = 0, pero no se declaró).

### Decisiones comerciales / de producto pendientes
1. **No existe flujo de creación de evento ni de registro.** "Crear mi evento" lleva a `#planes` (ancla) y los botones de plan están inactivos. El CTA principal no puede llegar a un flujo real hasta que exista la pantalla de registro/contratación.
2. **Premium:** la única diferencia visible es "Sitio de casamiento premium". En el código no existe ninguna variante "premium" del sitio; hay que definir qué es y, si se puede, mostrarlo.
3. **Precios y comisiones:** la landing dice "Pago único, pagás solo al publicar" sin importes. No se inventó ninguno.
4. **Lista de regalos (mecanismo):** el ejemplo muestra regalar por alias con comprobante y que el dinero llega a la pareja ("reciben los aportes directamente" es coherente con eso). Faltan por definir y no se redactaron: comisiones, qué confirmación recibe quien regala, y si habrá aportes parciales (hoy cada regalo tiene un monto fijo). Por eso no se agregó una explicación detallada ni FAQ.
5. **Testimonios:** son provisorios; reemplazar por reales (con permiso) y entonces quitar la etiqueta "de ejemplo".
6. **Recorrido de invitados:** el aviso superior y "Hacé un regalo" llevan a `/encontrar`, que funciona, pero los círculos de parejas no navegan todavía (solo la pareja del ejemplo tiene lista). Pendiente definir qué abre cada uno.
7. **Descripciones de las tarjetas de funcionalidades:** el texto nuevo está en el código, pero se mantienen ocultas por tu decisión anterior ("sin descripción, a ver cómo queda"). Para mostrarlas, borrar la regla `.feat-card p { display: none !important; }` al final de `src/styles.css`.
8. **"Cómo funciona" y "Preguntas frecuentes":** no se implementaron. "Cómo funciona" repetiría las tarjetas; las FAQ requieren respuestas que hoy no existen (puntos 3 y 4).

### Hipótesis a validar con personas
- Que "Crear mi evento" lleve a planes sea entendido como el camino de alta.
- Que la etiqueta "Testimonios de ejemplo" no reste confianza frente a no mostrar testimonios.
- Que las tarjetas sin descripción se entiendan solo con el título y la animación.

### Se conserva (funciona)
Titular "Tu gran día empieza acá.", jerarquía de CTA (Crear mi evento / Ver ejemplo), video como protagonista, animaciones de las tarjetas (respetan `prefers-reduced-motion`, no dependen de hover y están `aria-hidden` porque son decorativas), bloque gris azulado de regalos, burbuja de vidrio de la navegación, planes con sus nombres y beneficios, footer sin enlaces rotos.

## 2. Copy: antes → después
| Lugar | Antes | Después |
|---|---|---|
| Hero, bajada | "Creá el sitio de tu casamiento, compartí todos los detalles con tus invitados y armá tu lista de regalos en un solo lugar." | "Creá tu lista de regalos, compartí el sitio de tu casamiento y organizá las confirmaciones de tus invitados, todo en un solo lugar." |
| Funcionalidades, título | "Todo lo que necesitan, en un solo lugar." | "Todo para compartir su casamiento." |
| Funcionalidades, bajada | "Una forma simple de compartir su historia, organizar a sus invitados y recibir regalos." | "Una forma simple de reunir los regalos, la información del evento y las confirmaciones de sus invitados." |
| Tarjeta 1 | "Creen su lista y reciban regalos o aportes para los proyectos que quieran compartir." | "Creen su lista con regalos y proyectos que quieran compartir con sus invitados." |
| Tarjeta 2 | "…y todos los detalles de su gran día." | "…y todos los detalles del evento." |
| Tarjeta 3 | (sin cambios) | "Reciban las respuestas de sus invitados y organicen quiénes los acompañarán." |
| Regalos, título | "Creá una lista de regalos simbólica que se adapte a ustedes" | "Regalos para lo que viene después." |
| Regalos, texto | "Tus invitados eligen qué regalar y vos recibís el dinero directamente." | "Creen una lista con cosas que les gustan, viajes que sueñan hacer y proyectos que quieren compartir. Sus invitados eligen cómo acompañarlos y ustedes reciben los aportes directamente." |
| Planes, CTA | "Elegir experiencia" | "Elegir plan" |
| Planes, aclaración | — | "La contratación todavía no está disponible. Mientras tanto, podés recorrer el ejemplo." |
| Testimonios, etiqueta | "● Testimonios" | "● Testimonios de ejemplo" |
| `<title>` / `og:title` | "Weda • Organizá tu casamiento en un solo lugar" | "Weda • Lista de regalos y sitio para tu casamiento" |

## 3. Analítica
No hay ninguna herramienta instalada (búsqueda de gtag, plausible, posthog, mixpanel, dataLayer: sin resultados). No se instaló ninguna.
Eventos recomendados para cuando se defina un proveedor: `cta_crear_evento_click` (con `ubicacion`: nav, hero, funcionalidades, menú), `cta_ver_ejemplo_click`, `cta_crear_lista_regalos_click`, `plan_cta_click` (con `plan`), `acceso_invitado_click` (aviso superior / nav), `registro_iniciado`, `registro_completado`, `testimonio_navegado`.

## 4. QA realizado
Anchos 320, 360, 402, 768, 1110 y 1440 px con Chrome real controlado por script: sin desborde horizontal en ninguno, un solo `h1`, títulos y bajadas sin cortes. Rutas `/`, `/ejemplo`, `/ejemplo/regalos` y `/encontrar`: sin errores de consola ni respuestas HTTP ≥ 400 al cargar. LCP (desarrollo, sin throttling): 228 ms a 402 px y 256 ms a 1440 px, el elemento es el video/poster del hero; CLS 0.
