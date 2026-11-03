# 04 · Auditoría de performance

## Qué se midió y cómo

- **Sitio:** el publicado, `https://weda-v2.vercel.app/` (commit `af38336`). No es el servidor local de desarrollo, que no sirve para medir performance.
- **Herramienta:** Playwright con Chrome. La red y la CPU se limitaron por CDP y las métricas se tomaron con `PerformanceObserver`.
- **Corridas:** dos por perfil, con caché deshabilitada.
- **No es Lighthouse.** No estaba instalado y la consigna prohibía instalar. TBT e INP son **aproximaciones**:
  - TBT es la suma de las tareas largas después del FCP menos 50 ms cada una;
  - INP es la duración máxima de un evento de interacción: abrir el menú en celular y pasar un testimonio en compu.
- **No hay puntaje de performance** porque no se pudo calcular el de Lighthouse.

| Perfil | TTFB | FCP | LCP | Elemento LCP | CLS | TBT aprox. | Tareas largas | INP aprox. | `load` | Peso transferido |
|---|---|---|---|---|---|---|---|---|---|---|
| Celular 390×844, 4G lento (1,6 Mb/s, 150 ms), CPU 4× | 143–168 ms | 2,1–2,3 s | **3,4–3,6 s** | portada del video (`hero-poster.jpg`) | 0,002 | **1,0–2,3 s** | 10–22 | **290–500 ms** | 5,0–6,4 s | **2,75 MB** |
| Compu 1440×900, sin límites | 157–167 ms | 0,6–0,7 s | 0,8–0,9 s | portada del video | 0,001 | ~105 ms | 2–3 | ~170 ms | 0,7–0,9 s | 2,77 MB |

Cómo leerlo, con los umbrales de Core Web Vitals:
- **LCP:** en el celular simulado, «necesita mejorar» (2,5–4 s). En compu, bien.
- **CLS:** excelente en los dos perfiles.
- **INP:** en el celular simulado, entre «necesita mejorar» y «malo» (más de 200 ms, rozando 500).
- **TBT:** en el celular simulado es alto. Lighthouse considera malo cualquier valor por encima de 600 ms.

## Composición del peso (celular, medido)

| Tipo | KB transferidos |
|---|---|
| Video (`hero.mp4`) | **1.732** |
| Imágenes | 702 (la más pesada: `fondo-ramo.jpg`, 191 KB) |
| JavaScript | 191 |
| Fuentes | 66 (Geist y Cormorant) |
| CSS | 48 comprimido (sin comprimir: 106 KB + 101 KB, ver F-06) |
| HTML | 8 |
| **Total** | **≈2.750 KB en 56 pedidos** |

## Hallazgos

### F-04 · En celulares lentos la página tarda en responder (hidratación y tareas largas)
| Campo | Detalle |
|---|---|
| Categoría | Performance / interacción |
| Severidad | P1 |
| Página / componente | Landing completa |
| Dispositivo | Celulares de gama media o baja |
| Problema | Entre 10 y 22 tareas largas después del primer pintado, que suman de 1,0 a 2,3 s de bloqueo. Abrir el menú tarda de 290 a 500 ms. Mientras la página no terminó de cargar, los toques se pierden. |
| Evidencia | La tabla de arriba. El test del menú falla en 2 de 4 corridas (el menú no se abre). El chunk principal `index-*.js` pesa 359 KB sin comprimir e incluye el árbol de rutas completo. Además corren Lenis (scroll suave), `useReveal` (un `IntersectionObserver` sobre 10 elementos) y tres demos animadas (`GiftDemo` con dos columnas en bucle; `SiteDemo` y `RsvpDemo` con temporizadores). |
| Impacto en el usuario | «Toqué y no pasó nada.» Scroll entrecortado al principio. |
| Impacto comercial | Hipótesis: rebote de quien llega desde Instagram, que suele usar el navegador interno de Instagram en celulares de gama media. |
| Recomendación | (1) Perfilar la hidratación con el panel Performance de Chrome en un celular real. (2) Diferir lo que no está en la primera pantalla: demos y Lenis después de `requestIdleCallback`, o al entrar en pantalla. (3) Revisar que el chunk principal no arrastre módulos del panel. (4) Evaluar si Lenis aporta lo suficiente en celular, donde el scroll nativo ya es suave. |
| Esfuerzo | M |
| Dependencias | Medición en un dispositivo real. |
| Criterio de aceptación | Con CPU 4× y 4G lento: TBT aprox. menor a 600 ms e INP aprox. menor a 200 ms al abrir el menú. El test del menú pasa 10 de 10 veces. |

### F-05 · El video de 1,7 MB se descarga igual en datos móviles
| Campo | Detalle |
|---|---|
| Categoría | Performance / datos |
| Severidad | P1 |
| Página / componente | Hero (`src/routes/index.tsx`, `useEffect` del video) |
| Dispositivo | Celular |
| Problema | El video solo se omite con «reducir movimiento», con ahorro de datos o con `effectiveType` `slow-2g`, `2g` o `3g`. Un 4G mediocre reporta `4g` y lo descarga entero. |
| Evidencia | En el perfil de 4G lento simulado se transfirieron 1.732 KB de `hero.mp4`, el 63% del peso total. |
| Impacto en el usuario | Consumo de datos, y competencia con la descarga del JavaScript, que se hidrata más tarde. |
| Impacto comercial | Hipótesis: peor experiencia en el primer contacto móvil. |
| Recomendación | Un archivo específico para celular: recorte vertical de 9:16, 540 px de ancho, unos 500 KB, servido con `<source media>` o según el ancho. Opcional: iniciar el video recién después de que la página esté lista para interactuar. |
| Esfuerzo | S–M |
| Dependencias | Editar el video (ya existe el flujo con ffmpeg de esta sesión). |
| Criterio de aceptación | En 390 px el video pesa menos de 600 KB y no empieza a bajar antes de que termine la hidratación. |

### F-06 · La landing carga 106 KB de CSS del panel y del micrositio
| Campo | Detalle |
|---|---|
| Categoría | Performance / render |
| Severidad | P2 |
| Página / componente | Hojas de estilo globales |
| Dispositivo | Todos |
| Problema | Junto a `styles-*.css` (101 KB, la landing) se sirve `index-*.css` (106 KB), que contiene **1.176 reglas `.pn-`**, del panel de administración, y 161 del micrositio. Bloquea el primer pintado sin aportar nada a la landing. |
| Evidencia | Bundles descargados de producción: `index-3fLz46BQ.css` y `styles-DWSiOOYA.css`. Conteo de selectores con `grep`. |
| Impacto en el usuario | FCP más tardío en redes lentas. |
| Impacto comercial | Bajo a medio. |
| Recomendación | Que `panel.css` y los estilos de `/ejemplo` se carguen solo en sus rutas, como ya se hace con `@/panel.css` en `crear.tsx`. Revisar qué los arrastra al paquete raíz. |
| Esfuerzo | S–M |
| Dependencias | — |
| Criterio de aceptación | La landing no carga reglas `.pn-`. |

### F-17 · Se descargan 191 KB de una imagen que no se ve
| Campo | Detalle |
|---|---|
| Categoría | Performance |
| Severidad | P2 |
| Página / componente | Testimonios (`.viacap-section::before` con `url("/fondo-ramo.jpg")`) |
| Dispositivo | Todos |
| Problema | La sección de Testimonios ahora tiene fondo blanco, pero las reglas viejas del `::before` con la foto siguen vigentes y el navegador la descarga. |
| Evidencia | `fondo-ramo.jpg` (191 KB) aparece entre los pedidos de producción. `styles.css:324`, `:1071`, `:1420`. |
| Impacto en el usuario | 7% del peso total sin uso. |
| Impacto comercial | Bajo. |
| Recomendación | Verificar en DevTools que el `::before` no se ve y eliminar esas reglas. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | `fondo-ramo.jpg` no aparece en la red de la landing. |

### F-18 · La fuente no se precarga
| Campo | Detalle |
|---|---|
| Categoría | Performance |
| Severidad | P3 |
| Página / componente | `<head>` |
| Dispositivo | Todos |
| Problema | El HTML de producción no tiene `<link rel="preload">`. Geist se descubre recién al leer el CSS. |
| Evidencia | Conteo de `rel="preload"` en el HTML publicado: 0. |
| Impacto en el usuario | Posible cambio de tipografía visible al cargar. El CLS medido es casi 0, así que el impacto es menor. |
| Impacto comercial | Bajo. |
| Recomendación | Precargar `geist-latin-wght-normal.woff2`. |
| Esfuerzo | S |
| Dependencias | — |
| Criterio de aceptación | La fuente empieza a descargarse antes que el CSS. |

## Lo que está bien

- **CLS ≈ 0** en todos los perfiles.
- **El LCP es la portada del video**, que es una imagen liviana, y no el video. El video se pide recién en un momento de reposo.
- **Las imágenes de las demos y maquetas** tienen `loading="lazy"`. Las fotos del catálogo están en WebP o JPG de tamaño contenido.
- **Precarga del registro en reposo:** tocar «Crear mi evento» abre el formulario en 0,5–0,75 s en local.
- **Sin errores ni avisos de consola** en ningún ancho (medido).
