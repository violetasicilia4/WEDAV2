# Weda · Sistema de diseño (lo que hoy existe en el código)

Este documento describe **lo que está implementado**. No es una propuesta. Donde no hay una definición en el código o en la documentación, figura en «Vacíos» y no se inventa una respuesta. Los criterios de decisión (cuándo y por qué) están en [product-principles.md](product-principles.md).

**Principio de identidad:** hay tres contextos visuales y **no se mezclan**. Un cambio en uno no debe filtrarse a los otros (no tocar estilos globales para resolver un problema local).

| Contexto | Dónde vive | Archivos de estilos |
|---|---|---|
| Landing | `/` | `src/styles.css` (+ componentes en `src/components/feature-demos.tsx`, `float-nav.tsx`) |
| Administración (crear evento y panel) | `/crear*`, `/panel*` | `src/panel.css` (prefijo `pn-`) |
| Página pública de la pareja | `/ejemplo*`, `/sitio/$slug*` | `src/ejemplo.css`, `src/invitacion.css`, `src/demo.css` (raíz `.dm-root`, prefijos `ej-`, `iv-`, `rg-`, `dm-`) |

## 1. Tipografía

**Geist (variable)** en landing, onboarding y panel (decisión de 2026-10; reemplaza a Arial). **Excepción: el micrositio mantiene su tipografía anterior** — Cormorant Garamond en la portada y en las secciones de la invitación posteriores a la portada, y Arial en la barra superior, el pie, los pop-ups y la lista de regalos — y lo mismo en todo lo que lo reproduce: `/ejemplo*`, `/sitio/*` y la tarjeta de demostración «Sitio del casamiento» de la landing (`fd-*`, incluida su portada). Esos archivos (`invitacion.css`, `ejemplo.css`, `demo.css`) y los `<link>` de Google Fonts de Cormorant en `index`, `ejemplo` y `sitio.$slug` volvieron a su estado anterior. Se sirve desde `public/fonts/geist/` (`latin` y `latin-ext`, licencia SIL OFL 1.1 en `OFL.txt`), con `@font-face` y los tokens en `src/typography.css` (cargado desde `__root.tsx`, con `preload` del subconjunto latino). Pila de respaldo: `ui-sans-serif, system-ui, …, Arial`. No hay otras familias ni Google Fonts.

| Token | Celular | ≥ 768 px | Uso |
|---|---|---|---|
| `--t-display-xl` | 42 | 64 | Título del hero de la landing (con tope `min(…, 8.6vw)` para que entre en un renglón) |
| `--t-display-l` | 36 | 48 | Techo de los títulos de sección de la landing |
| `--t-page` | 28 | 32 | Títulos de página (panel, onboarding), mínimo de los títulos de sección de la landing |
| `--t-section` | 22 | 24 | Títulos de tarjeta/sección |
| `--t-subtitle` | 18 | 20 | Subtítulos |
| `--t-body` / `--t-small` / `--t-label` / `--t-btn` | 16 / 14 / 13 / 15 | igual | Texto, secundario, etiquetas, botones |

Pesos: `--w-regular` 400 (texto), `--w-medium` 500 (navegación, botones, etiquetas, títulos secundarios, hero), `--w-semibold` 600 (énfasis, métricas, precios, títulos de página y los nombres de la pareja en la portada). Interlineado: `--lh-display` 1.05, `--lh-title` 1.15, `--lh-snug` 1.3, `--lh-body` 1.5. Tracking: `--ls-display` −.03em, `--ls-title` −.02em, `--ls-section` −.01em. Sin mayúsculas sostenidas ni tracking ancho: los rótulos van en minúscula (excepciones: ninguna). Números con `tabular-nums` (montos, contadores, conteos).

- Los tamaños de componentes que no están en la escala se siguen definiendo a mano (ver Vacíos); migrar el resto a los tokens es trabajo pendiente.

## 2. Color

**Base común (landing y panel):** tinta `#3b3c3a`, texto secundario `#575757`, líneas `rgb(59 60 58 / .16–.30)`.

**Landing (`styles.css`):** fondo `oklch(0.948 0.008 106)`; `--primary` `oklch(0.277 0.074 136)`; `--accent` `oklch(0.935 0.139 122)`; `--destructive` `oklch(0.55 0.18 26)`; además `--paper #f5f2eb`, `--slate #707d87`, `--forest #2b4045`, `--olive #b6b46e`, `--section #f3f0e8`.

**Panel (`panel.css`, variables `--pn-*`):**
- grises neutros del panel (sin azul, decisión de la dueña 2026-10-21): `--pn-slate #6b6b6b` (acentos y estados activos), `--pn-slate-d #4a4a4a` (botones primarios, énfasis), `--pn-slate-l #9a9a9a`; superficies tintadas `rgb(60 60 60 / .08)`;
- **fondo blanco** en todo el panel (decisión de la autora; `--pn-bg` y `--pn-paper` son `#fff`), con bordes finos para separar bloques;
- estados con color además de texto: verde (`#e7efe4` / `#34502c`) = completo, ámbar (`#fbf0dc` / `#6b4a10`) = falta completar, neutro = oculto o sin empezar, rojo `#b3402f` = destructivo y error de guardado.

**Página pública (`invitacion.css`):** `--iv-ink #3b3c3a`, `--iv-muted #575757`, `--iv-slate #66747f` (un punto más profundo para que el texto blanco llegue a 4,5:1), `--iv-paper #f5f2eb`, `--iv-section #f3f0e8`, `--iv-tonal #f4f4f2`; `/ejemplo` usa además `--ej-slate #5A646C`.

## 3. Forma y espacio

- **Botones en píldora** (`border-radius: 999px`) en los tres contextos; alto mínimo 48 px en el panel (`.pn-btn`), 44 px en los botones chicos (`is-small`) y filas táctiles.
- **Campos:** alto mínimo 48 px, borde 1 px, radio 12 px, texto 16 px (evita el zoom en iOS).
- **Diálogos:** radio 24 px, fondo blanco, ancho máximo 560 px (`is-small` 440, `is-wide` 760, `is-preview` 460).
- Tarjetas de regalo: radio 22 px, foto cuadrada, monto sobre la foto (mismo orden que la página pública).
- El espaciado es ad hoc (valores en px y `clamp()` por componente).

## 4. Componentes del panel (`src/components/panel/`, `src/routes/panel.*.tsx`)

| Componente | Qué hace y reglas de uso |
|---|---|
| `Field` | Etiqueta + control + ayuda + error con ids asociados. Los opcionales se marcan «· opcional». |
| `ToastProvider` / `useToast` | Avisos breves; admiten acción «Deshacer» (botón de 44 px). Se cierran al cambiar de ruta y, con un diálogo abierto, suben a la parte superior para no tapar sus botones. |
| `ConfirmDialog` | Confirmación de acciones destructivas (eliminar invitado, grupo, reiniciar la demo). |
| `Locked`, `LockedBlock` | Función no incluida en el plan elegido: qué es, en qué plan está y que lo cargado se conserva como borrador; el botón «Ver los planes» abre el diálogo de planes. Sin upsell en el resto de las pantallas. |
| `PlansProvider` / `usePlans` | Diálogo «Elegí tu plan para publicar» (precio por evento, qué incluye, borradores). Se abre desde «Publicar», «Elegir plan» y `Locked`. No cobra ni publica. |
| Landing: `LandingPlans` | Tres tarjetas con la misma jerarquía (nombre, frase, precio, 4–5 funciones, «Ver todo lo que incluye» en `<details>`, CTA «Crear mi evento gratis»). Sin plan «recomendado». Todo sale de `plans.ts`. |
| `PreviewFrame` | La página pública real en un `iframe` del mismo origen; puede llevar la vista a una sección (`anchor`; `jump` repite el pedido para la misma sección y espera si la sección todavía no existe). |
| `PublishDialog` | Explica que todavía no se puede publicar; no simula contratación ni pago. |
| `SaveStatus` | «Cambios guardados en este dispositivo» / «Guardando…» / «No se pudieron guardar los últimos cambios». |
| `PhotoPicker`, `CoupleDialog` | Foto de portada y datos del casamiento. Patrón compacto: botón «Subir una foto» + fila de miniaturas (`pn-cover-pick`: «Tu foto» si ya subió una, y las imágenes de muestra), selección visible con borde y nombre en negrita. |
| `GroupsView` | Mesas y grupos dentro de Invitados. |
| Chips de estado | `is-ok`, `is-todo`, `is-off`, `is-doing`, `is-done`. |
| Selector segmentado `.pn-switch` | Alternar vistas (Invitados / Mesas y grupos, Editar / Ver como invitado, filtros de asistencia). |
| Solapas `.pn-tabs` | Módulo de regalos. Hasta 560 px ocupan todo el ancho en columnas iguales y usan la etiqueta corta (`pn-tab-short`); el título largo va dentro de cada panel. Nunca deben necesitar scroll lateral. |
| Lista ordenable (`SortableGrid`, Mis regalos) | Las tarjetas se arrastran para ordenarse (mouse: agarrar y llevar; celular: mantener apretado un instante y llevar), Alt + flechas con teclado; tocar una tarjeta abre su edición. Sin flechas de subir/bajar. |

| Editor de «Tu página» | Edición con resultado a la vista: la **ventana en vivo** (`LiveCard`, clases `lc-*`, `src/components/panel/live-card.tsx`) es la página pública real en un iframe (`?ventana`) alineado a la sección que se edita; se actualiza por `storage` (~150 ms). ≥ 1280 px: sección · formulario · ventana fija a la derecha. Menos: chips de sección (con ícono de estado) y ventana fijas arriba (se pueden ocultar), formulario debajo; con teclado abierto se achica. «Ver completa» abre el pop-up de vista previa anclado en esa sección. |
| Tarjetas de la lista | `.rg-grid` / `.rg-card`: foto, monto sobre la foto y nombre, con «Editar» y «Quitar»; toda la tarjeta abre la edición. |
| Más opciones `.pn-more` | `<details>` para campos opcionales de un formulario corto. |

**Patrones de interacción vigentes (obligatorios al agregar pantallas):**
- Botones de un diálogo o formulario: **Cancelar a la izquierda, acción principal a la derecha** (`.pn-actions.is-end`).
- Quitar algo reversible: aviso con **Deshacer**; destructivo e irreversible: `ConfirmDialog`.
- Los cambios del panel **se guardan solos**; no hay botón «Guardar» por pantalla (los diálogos de edición sí confirman).
- Botón «Vista previa» siempre visible en la cabecera del panel (abre un pop-up con la página pública).
- En pantallas táctiles todo botón llega a 44 px (`pointer: coarse`).
- Editar con resultado a la vista: la ventana en vivo queda siempre en pantalla junto a (o encima de) los campos; la página completa se ve en el pop-up de «Vista previa».
- Una acción principal por pantalla; las secundarias son «ghost» (borde, sin relleno).
- El plan restringe el acceso, no borra datos: al cambiar de plan se conservan.

## 4b. Landing en celular (hasta 640 px)

Detalle y causas en [auditorias/auditoria-landing-mobile-2026-10-19.md](auditorias/auditoria-landing-mobile-2026-10-19.md). Reglas vigentes: la barra superior (`FloatNav`) **conserva sus dos píldoras translúcidas** (sin relleno arriba de todo, «globo» de vidrio al scrollear); no se le pone `backdrop-filter` ni `transform` al header, porque el menú es `position: fixed` y se desancla; alturas de pantalla con `svh` (no `lvh`/`vh`); objetivos táctiles de 44 px; los ajustes de celular van al final de `styles.css`, dentro de `@media (max-width: 640px)`, para no tocar tablet, escritorio ni `/encontrar`.

## 4c. Panel · mejora visual móvil (2026-10)

Dirección: mismo Arial, misma paleta pizarra, menos contenedores. Valores vigentes en `src/panel.css` (se agregaron como tokens `--pn-r-*` en `.pn-root`/`.pn-dialog`):

- **Radios:** controles 12 px (`--pn-r-ctl`), tarjetas y fotos 16 px (`--pn-r-card`), diálogos y hojas 20 px (`--pn-r-sheet`), píldoras 999 px, círculos 50 %. Excepciones deliberadas: el marco del celular de la vista previa  (copia la invitación).
- **Tipografía (panel):** 12 · 13 · 14 · 15 · 16 · 18 · 20 · 26 px. Se unificaron 11.5/12.5/14.5/17/19/22.
- **Estado «seleccionado» en regalos:** tilde circular arriba a la izquierda de la foto (pizarra en tarjetas, blanco sobre las fotos de los sets) + aro interior de 3 px. Se reemplazan los halos dobles y las sombras.
- **Tarjeta de regalo** (`.pn-gcard`): sin caja ni sombra; foto cuadrada, nombre (2 renglones), monto en negrita pizarra y una sola acción. En «Tu lista» las acciones son íconos de 44 px (`Editar`, `Quitar`), sin borde.
- **Sets** (`.pn-settile`): degradé inferior reforzado (0.05 → 0.86) para que el nombre y el contador se lean sobre cualquier foto.
- **Barra de selección** (`.pn-selbar`): cantidad y monto a la izquierda, «Ver» a la derecha; `.pn-pick` deja 80 px al final para que no tape el contenido.
- **Invitados (2026-10-21):** una sola lista para todos los anchos (`.gl-*`): cuatro bloques de totales (Total, Confirmados, Sin responder, Con restricción), buscador, filtros desplegables combinables (Respuesta, Restricción, Grupo o mesa y Origen, con «Limpiar filtros») y una fila por persona con avatar, nombre y etiquetas de estado, grupo o mesa, restricción y origen. Tocar la fila abre la edición (estado, grupo y menú se cambian ahí); el tacho elimina con «Deshacer». En el celular los totales se compactan y queda solo el tacho. Ya no hay tabla con selectores.
- **Celular, ajustes de la auditoría responsive (2026-10-20):** en «Regalos» el encabezado apila título y descripción a lo ancho con «Copiar enlace»/«Crear regalo» en una fila debajo, y las solapas no se parten en dos renglones (una línea cada una, con desplazamiento horizontal). En los diálogos con formulario (≤ 560 px) Cancelar y Guardar comparten fila y la acción destructiva («Eliminar») queda aparte, arriba. Los íconos dentro de `.pn-btn` no se encogen. La auditoría (320–768 px) no encontró desborde horizontal en el panel; falta validar en dispositivos reales.
- **Hoja inferior** (`.pn-dialog.is-sheet`, ≤ 560 px): pegada abajo, hasta 90 dvh, botones fijos al pie. Todo `.pn-dialog .pn-actions.is-end` queda a la vista en celular.
- **Mesas:** accesos con conteo (`.pn-mesa-nav`: «Sin lugar N», una píldora por mesa), selector compacto por persona («Asignar a…» si no tiene mesa). No hay capacidad por mesa en el modelo, por eso no se muestra.
- **Editor del sitio en celular:** la barra de la vista previa dice «Editando: sección», la vista se oculta con un botón y se pliega sola cuando el teclado reduce el `visualViewport` más de 150 px con foco en un campo de la página.
- **Segunda ronda (superficies, referencias visuales).** Principios adoptados (sin copiar estilos): grupos sobre una *superficie tintada* en vez de bordes (`--pn-surface` = pizarra al 8 %, `--pn-surface-2` al 16 %); «seleccionado» = pizarra sólida con texto blanco (píldoras, solapas, categorías) o aro interior de 2 px (tarjetas, planes, secciones abiertas, totales); filas con inicial + título + detalle + estado + chevron; hojas inferiores con asa y cierre circular. El fondo de la página sigue siendo blanco y no se agregaron colores.
  - Solapas y selectores de vista (≤ 560 px): píldoras sobre superficie; la activa en pizarra.
  - Barra inferior (< 900 px): el ítem activo es una píldora tintada (se eliminó la barra superior de 3 px).
  - Diálogos (≤ 560 px): todos son hojas pegadas abajo (`.pn-dialog`, hasta 92 dvh), con asa, cierre circular de 44 px (texto accesible «Cerrar») y botones fijos al pie.
  - Regalos: categorías como píldoras con scroll horizontal (`.pn-chips`/`.pn-chipbtn`), tarjetas sobre superficie (`.pn-gcard`), barra de selección flotante con sombra funcional. A ≤ 380 px el monto de «Tu lista» ocupa su renglón.
  - Invitados (≤ 760 px): fila = tarjeta suave con inicial (`.pn-avatar`), nombre, detalle (mesa · restricción) y chip de estado (`.pn-gchip`). Eliminar vive en la hoja «Editar invitado».
  - Mesas: cada grupo es una tarjeta sobre superficie. Editor: cada sección es una tarjeta; la abierta lleva aro. Inicio: cada etapa es una tarjeta; la siguiente lleva aro.
  - Estados deshabilitados: el botón «Elegí un plan» explica el motivo; al llegar al máximo de fotos, el texto dice qué hacer.
- **Cabecera:** botón «Ver como invitado» de 44 px y bajadas (`.pn-sub`) de 15 px en celular.

## 4d. Rediseño de la arquitectura del panel (2026-10)

- **Acciones (panel y diálogos):** primaria = gris oscuro (`#4a4a4a`) en negrita con esquinas de 12 px; secundaria (`is-ghost`) = superficie tintada sin borde; terciaria = enlace (`pn-link`); destructiva = rojo (`is-danger`). Las píldoras quedan para filtros, solapas, selectores de vista y la barra flotante de regalos. Encabezados compactos (`.pn-page-head.is-compact`): título de 24 px y una acción chica a la derecha (baja a un segundo renglón a ≤ 380 px).
- **Inicio:** pareja y fecha, UNA tarjeta «Siguiente paso» (copia y destino salen de `nextAction()` en `journey.ts`; «Configurar aportes» abre `/panel/regalos?tab=cobro`), «Estado» con un conteo real («N de M pasos listos», sin porcentajes: los segmentos reflejan el estado de cada etapa) y tres accesos (Invitación, Regalos, Invitados) con su dato real. Publicar queda como acción secundaria. En escritorio, siguiente paso y estado van en dos columnas.
- **Editor de la página:** navegación de secciones con punto de estado (verde completa, ámbar falta, gris oculta/sin cargar): Portada · Eventos · Confirmación · Dress code · Fotos · Mensaje final · Música (las que el plan no incluye quedan marcadas con su plan). Solo se ven los campos de la sección elegida; en «Eventos» cada momento es una fila que se abre sola (una a la vez) y tiene su «Mostrar». Celular: «Vista previa» abre la página pública real a pantalla completa (`.pn-pvfull`, con «Volver a editar»); la navegación de secciones queda fija arriba. Escritorio (≥ 1100 px): secciones | campos | vista previa fija. El botón «Ver como invitado» del encabezado se oculta en el editor del celular para no duplicar la acción.
- **Regalos:** encabezado «Tu lista de regalos» + «N regalos · $ total» y «Agregar regalos» como acción principal (se oculta en «Elegir regalos»). Solapas: Elegir · Mi lista · Aportes · Recibidos (mismos contenidos que antes; «Cobro» pasó a llamarse «Aportes»).
- **Invitados:** cuatro cuadrados de resumen siempre visibles (`.gl-stats`, también en cero); alta con el botón «Agregar invitado», que abre el formulario completo (sin campo de alta rápida); filtros como píldoras con conteo; estado vacío centrado y a todo el ancho (`.pn-empty.is-centered`) con «Agregar invitado», «Importar desde Excel» y un enlace.

- **Alta (`/crear/*`: registro, datos y foto):** de fondo, la propia landing oscurecida con un velo (un `iframe` decorativo en `src/routes/crear.tsx`; los tres pasos de arranque van sobre blanco) y una tarjeta blanca (`#fff`, radio 20) con los campos; el cierre es un círculo blanco. Los botones principales son gris claro neutro (`#e8e9ea`, texto oscuro) y los secundarios blancos con borde gris; el interruptor activo va en gris medio `#9a9d9f`. Todo en la gama de blancos y grises. Sin sombras. En el paso de la foto en celular, la tarjeta ocupa la pantalla sin scroll.

## 4d-bis. Inicio del panel en dos capas (2026-10-21)

- **Inicio, secciones** (`.hm-path` y `.hm-manage`, ambas con `.hm-grid` y `.hm-tile`): tarjetas de borde fino con ícono en cuadrado tenue, título, una línea de texto y flecha; sin numeración y sin etiquetas de estado (solo la de plan bloqueado). Una columna en celular, dos desde 720 px (con cantidad impar, la última ocupa el ancho), tres desde 1100 px. «Gestión de invitados» va abajo, separada por una línea fina.
- **«Publicar» siempre a mano:** `.pn-publish-btn` (gris oscuro `--pn-slate-d`, píldora) en `.pn-top-actions` junto a «Vista previa» en todas las pantallas del panel; en ≤ 399 px «Vista previa» queda solo con el ícono (el nombre sigue accesible). «Publicar» no va en el menú (no es una sección): la barra lateral y la inferior muestran solo Inicio, Regalos, Tu página e Invitados. Excepción deliberada a «botones suaves»: es la acción principal.
- Regla: una pantalla puede tener una capa principal (con pasos y un cierre destacado) y otra de administración quieta; no mezclar los accesos de ambas en la misma grilla.

## 4d-ter. Publicar: tres cuadrados de producto (2026-10-21)

- `.pn-prods` / `.pn-prod`: tres tarjetas sobre superficie (`--pn-surface`). Orden interno: ícono en círculo blanco (`.pn-prod-ico`) + nombre (22 px) + frase corta; precio en 28 px; fila de datos con ícono (`.pn-prod-facts`: «Pago único», «Publicada 1 año»); puntos con ícono (`.pn-feats`, 15 px, una línea por punto; el primero, «Todo lo de …», va atenuado); «Ver más» plegable (`.pn-prod-more`, con el detalle y los avisos); y dos acciones apiladas: «Ver link» (secundaria, blanca) y «Publicar» (principal). Poco texto visible: el detalle es a pedido.
- Tres columnas desde 860 px; una columna en celular (hoja inferior, sin scroll horizontal). El diálogo se ensancha (`.is-products`, hasta 1080 px) solo al elegir; el resumen vuelve a 560 px. La elección actual lleva aro de 2 px y la etiqueta «Tu elección actual». Los íconos salen de `HIGHLIGHT_ICON` / `PLAN_ICON` en `ui.tsx` (los datos, en `plans.ts`).
- Mismo criterio que las tarjetas de plan de la landing: las tres con la misma jerarquía, sin opción «recomendada».

## 4e. Versión web del panel (≥ 1024 px): esquema de dashboard

Tomado del ejemplo de dashboard del 2026-10, con la tipografía y la paleta de Weda:
- **Lienzo y tarjeta:** el fondo de la administración es un gris claro (`--pn-canvas` `#eceeef`) y el contenido va en una tarjeta blanca (`.pn-main`, radio 20, borde de 1 px y una sombra muy suave que la separa del lienzo). El encabezado de cada página tiene un separador fino debajo.
- **Columna izquierda:** logo, pareja y plan, navegación con el ítem activo en blanco con borde, y abajo un indicador de avance real («N de M pasos listos» con un segmento por etapa, calculado con `stages()`; sin porcentajes) que lleva al Inicio.
- **Controles segmentados** (`.pn-tabs`, `.pn-switch`): pista gris tenue y opción elegida blanca con borde y sombra mínima. En celular siguen las píldoras de siempre.
- **Grupos:** bloques de configuración, mesas y guías sobre superficie gris (`--pn-surface`), con los campos blancos adentro. Los inputs llevan una sombra mínima y los botones secundarios son blancos con borde.
- **Editor de «Tu página»:** desde 1280 px, tres zonas (secciones con ícono y estado | campos | vista previa fija). Entre 1024 y 1279 px usa el patrón del celular (chips con ícono y «Vista previa» a pantalla completa) dentro de la tarjeta.

## 5. Páginas públicas

Los componentes de la página pública son **los mismos** para `/ejemplo` y `/sitio/$slug`: `src/components/site/{invitation,gifts-page,site-cover,site-shell,site-providers}.tsx`, alimentados por `useSite()` (`demoSiteData` o `siteFromState`). No se crea una segunda versión de la página. El formulario de confirmación es `src/components/rsvp-dialog.tsx`.

## 6. Accesibilidad vigente

Enlace «Ir al contenido», `aria-current` en la navegación, `aria-live` en avisos de estado, foco visible (`outline` 2 px), etiquetas asociadas a cada campo, nombres accesibles en botones con ícono, contraste de texto blanco sobre la pizarra pública ≥ 4,5:1. `prefers-reduced-motion` está contemplado en `styles.css`, `ejemplo.css` e `invitacion.css`; en `panel.css` hay una sola regla.

## 7. Vacíos (no definidos en el código ni en la documentación)

- No existe una **escala tipográfica** ni una **escala de espaciado** formal; cada componente fija sus valores.
- Los **puntos de corte** no están centralizados. En `panel.css` se usan, entre otros, 560, 720, 900 y 1100 px; en el resto de los archivos otros valores.
- No hay una definición del **color primario de Weda**: la landing usa `--primary` verde oscuro (`oklch(0.277 0.074 136)`) y el panel usa grises neutros (`#4a4a4a`). Ambos coexisten tal como están; no se unificaron.
- No hay guía de **iconografía** más allá del uso de `lucide-react`, ni de **ilustración** ni de **animación** (solo transiciones puntuales).
- No hay modo oscuro.
- La cobertura de `prefers-reduced-motion` en el panel no está auditada.
- No hay biblioteca de componentes documentada (Storybook o similar); la fuente es el código.

- **Menú lateral recogible (web):** `.pn-side-toggle` con el ícono `SideMenuIcon` (`src/components/panel/side-menu-icon.tsx`: tres rayitas). `data-side='open|collapsed'` en `.pn-app`: 248 px abierto, 72 px recogido (solo íconos); toggle, perfil, secciones y ayuda ocupan exactamente el mismo lugar en los dos estados (perfil de 66 px + 40 px de margen, íconos a 26 px del borde); transición de 220 ms que se anula con `prefers-reduced-motion`.
- **Estado vacío centrado** (`.pn-empty.is-centered`, 2026-10-21): ícono circular, título, texto de hasta 46 caracteres de ancho y acciones centradas, sobre fondo suave que llena el ancho (Mis regalos, Aportes recibidos, Invitados). **Cuadrados de resumen** (`.gl-stats`; `.is-three` para tres, en celular el primero a lo ancho): están siempre, también en cero.
