# Weda · Sistema de diseño (lo que hoy existe en el código)

Este documento describe **lo que está implementado**. No es una propuesta. Donde no hay una definición en el código o en la documentación, figura en «Vacíos» y no se inventa una respuesta. Los criterios de decisión (cuándo y por qué) están en [product-principles.md](product-principles.md).

**Principio de identidad:** hay tres contextos visuales y **no se mezclan**. Un cambio en uno no debe filtrarse a los otros (no tocar estilos globales para resolver un problema local).

| Contexto | Dónde vive | Archivos de estilos |
|---|---|---|
| Landing | `/` | `src/styles.css` (+ componentes en `src/components/feature-demos.tsx`, `float-nav.tsx`) |
| Administración (crear evento y panel) | `/crear*`, `/panel*` | `src/panel.css` (prefijo `pn-`) |
| Página pública de la pareja | `/ejemplo*`, `/sitio/$slug*` | `src/ejemplo.css`, `src/invitacion.css`, `src/demo.css` (raíz `.dm-root`, prefijos `ej-`, `iv-`, `rg-`, `dm-`) |

## 1. Tipografía

- **Landing y administración:** Arial (`--font-sans`, y `font-family: Arial, Helvetica, sans-serif` en `panel.css`). No se agregan fuentes.
- **Página pública, secciones de la invitación después de la portada:** Cormorant Garamond (`--iv-font`, se activa cuando existe la sección «Save the date», `.dm-root:has(#nos-casamos)`). La portada y la página de regalos (`/ejemplo/regalos`) usan Arial.
- **Excepción en la landing:** las escenas de demostración de la página (`feature-demos`) reproducen la invitación con Cormorant Garamond.
- Los tamaños se definen a mano en cada componente (ver Vacíos).

## 2. Color

**Base común (landing y panel):** tinta `#3b3c3a`, texto secundario `#575757`, líneas `rgb(59 60 58 / .16–.30)`.

**Landing (`styles.css`):** fondo `oklch(0.948 0.008 106)`; `--primary` `oklch(0.277 0.074 136)`; `--accent` `oklch(0.935 0.139 122)`; `--destructive` `oklch(0.55 0.18 26)`; además `--paper #f5f2eb`, `--slate #707d87`, `--forest #2b4045`, `--olive #b6b46e`, `--section #f3f0e8`.

**Panel (`panel.css`, variables `--pn-*`):**
- pizarra de Weda: `--pn-slate #707d87` (botones y acentos), `--pn-slate-d #5a646c` (hover, énfasis), `--pn-slate-l #8a959e`;
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
| Lista ordenable (`SortableGifts`) | Orden por arrastre (mantener apretado en el celular), Alt + flechas con teclado. |

| Editor en el celular | Vista previa fija arriba (`.pn-editor .pn-preview-pane`, sticky bajo 1100 px y desde 520 px de alto) + secciones debajo; «Ampliar vista»/«Seguir editando» alterna; cada sección cierra con «Listo». |
| Tarjetas de la lista | `.pn-ggrid.is-list`: mismas tarjetas `.pn-gcard` que el catálogo, con «Editar» y «Quitar». |
| Más opciones `.pn-more` | `<details>` para campos opcionales de un formulario corto. |

**Patrones de interacción vigentes (obligatorios al agregar pantallas):**
- Botones de un diálogo o formulario: **Cancelar a la izquierda, acción principal a la derecha** (`.pn-actions.is-end`).
- Quitar algo reversible: aviso con **Deshacer**; destructivo e irreversible: `ConfirmDialog`.
- Los cambios del panel **se guardan solos**; no hay botón «Guardar» por pantalla (los diálogos de edición sí confirman).
- Botón «Ver como invitado» siempre visible en la cabecera del panel.
- En pantallas táctiles todo botón llega a 44 px (`pointer: coarse`).
- Editar con resultado a la vista: en el celular los campos se editan debajo de una vista previa fija; no se mueve la edición a otra pantalla.
- Una acción principal por pantalla; las secundarias son «ghost» (borde, sin relleno).
- El plan restringe el acceso, no borra datos: al cambiar de plan se conservan.

## 4b. Landing en celular (hasta 640 px)

Detalle y causas en [auditoria-landing-mobile-2026-10-19.md](auditoria-landing-mobile-2026-10-19.md). Reglas vigentes: la barra superior (`FloatNav`) **conserva sus dos píldoras translúcidas** (sin relleno arriba de todo, «globo» de vidrio al scrollear); no se le pone `backdrop-filter` ni `transform` al header, porque el menú es `position: fixed` y se desancla; alturas de pantalla con `svh` (no `lvh`/`vh`); objetivos táctiles de 44 px; los ajustes de celular van al final de `styles.css`, dentro de `@media (max-width: 640px)`, para no tocar tablet, escritorio ni `/encontrar`.

## 4c. Panel · mejora visual móvil (2026-10)

Dirección: mismo Arial, misma paleta pizarra, menos contenedores. Valores vigentes en `src/panel.css` (se agregaron como tokens `--pn-r-*` en `.pn-root`/`.pn-dialog`):

- **Radios:** controles 12 px (`--pn-r-ctl`), tarjetas y fotos 16 px (`--pn-r-card`), diálogos y hojas 20 px (`--pn-r-sheet`), píldoras 999 px, círculos 50 %. Excepciones deliberadas: el marco del celular de la vista previa y la portada de `/crear/foto` (copian la invitación).
- **Tipografía (panel):** 12 · 13 · 14 · 15 · 16 · 18 · 20 · 26 px. Se unificaron 11.5/12.5/14.5/17/19/22.
- **Estado «seleccionado» en regalos:** tilde circular arriba a la izquierda de la foto (pizarra en tarjetas, blanco sobre las fotos de los sets) + aro interior de 3 px. Se reemplazan los halos dobles y las sombras.
- **Tarjeta de regalo** (`.pn-gcard`): sin caja ni sombra; foto cuadrada, nombre (2 renglones), monto en negrita pizarra y una sola acción. En «Tu lista» las acciones son íconos de 44 px (`Editar`, `Quitar`), sin borde.
- **Sets** (`.pn-settile`): degradé inferior reforzado (0.05 → 0.86) para que el nombre y el contador se lean sobre cualquier foto.
- **Barra de selección** (`.pn-selbar`): cantidad y monto a la izquierda, «Ver» a la derecha; `.pn-pick` deja 80 px al final para que no tape el contenido.
- **Invitados en celular (≤ 760 px):** fila de 68 px (nombre en negrita + estado · mesa · restricción). Tocar la fila abre la hoja de edición; el detalle y los selectores completos están ahí. En escritorio sigue la tabla con selectores.
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

- **Acciones (panel y diálogos):** primaria = pizarra oscura (`#5A646C`) en negrita con esquinas de 12 px; secundaria (`is-ghost`) = superficie tintada sin borde; terciaria = enlace (`pn-link`); destructiva = rojo (`is-danger`). Las píldoras quedan para filtros, solapas, selectores de vista y la barra flotante de regalos. Encabezados compactos (`.pn-page-head.is-compact`): título de 24 px y una acción chica a la derecha (baja a un segundo renglón a ≤ 380 px).
- **Inicio:** pareja y fecha, UNA tarjeta «Siguiente paso» (copia y destino salen de `nextAction()` en `journey.ts`; «Configurar aportes» abre `/panel/regalos?tab=cobro`), «Estado» con un conteo real («N de M pasos listos», sin porcentajes: los segmentos reflejan el estado de cada etapa) y tres accesos (Invitación, Regalos, Invitados) con su dato real. Publicar queda como acción secundaria. En escritorio, siguiente paso y estado van en dos columnas.
- **Editor de la página:** navegación de secciones con punto de estado (verde completa, ámbar falta, gris oculta/sin cargar): Portada · Eventos · Confirmación · Dress code · Fotos · Mensaje final · Música (las que el plan no incluye quedan marcadas con su plan). Solo se ven los campos de la sección elegida; en «Eventos» cada momento es una fila que se abre sola (una a la vez) y tiene su «Mostrar». Celular: «Vista previa» abre la página pública real a pantalla completa (`.pn-pvfull`, con «Volver a editar»); la navegación de secciones queda fija arriba. Escritorio (≥ 1100 px): secciones | campos | vista previa fija. El botón «Ver como invitado» del encabezado se oculta en el editor del celular para no duplicar la acción.
- **Regalos:** encabezado «Tu lista de regalos» + «N regalos · $ total» y «Agregar regalos» como acción principal (se oculta en «Elegir regalos»). Solapas: Elegir · Mi lista · Aportes · Recibidos (mismos contenidos que antes; «Cobro» pasó a llamarse «Aportes»).
- **Invitados:** encabezado con conteo («12 invitados · 5 confirmaron») y «Agregar invitados»; filtros como píldoras con conteo; estado vacío compacto con una acción principal («Agregar invitados»), una secundaria («Importar desde Excel») y un enlace.

## 5. Páginas públicas

Los componentes de la página pública son **los mismos** para `/ejemplo` y `/sitio/$slug`: `src/components/site/{invitation,gifts-page,site-cover,site-shell,site-providers}.tsx`, alimentados por `useSite()` (`demoSiteData` o `siteFromState`). No se crea una segunda versión de la página. El formulario de confirmación es `src/components/rsvp-dialog.tsx`.

## 6. Accesibilidad vigente

Enlace «Ir al contenido», `aria-current` en la navegación, `aria-live` en avisos de estado, foco visible (`outline` 2 px), etiquetas asociadas a cada campo, nombres accesibles en botones con ícono, contraste de texto blanco sobre la pizarra pública ≥ 4,5:1. `prefers-reduced-motion` está contemplado en `styles.css`, `ejemplo.css` e `invitacion.css`; en `panel.css` hay una sola regla.

## 7. Vacíos (no definidos en el código ni en la documentación)

- No existe una **escala tipográfica** ni una **escala de espaciado** formal; cada componente fija sus valores.
- Los **puntos de corte** no están centralizados. En `panel.css` se usan, entre otros, 560, 720, 900 y 1100 px; en el resto de los archivos otros valores.
- No hay una definición del **color primario de Weda**: la landing usa `--primary` verde oscuro (`oklch(0.277 0.074 136)`) y el panel usa la pizarra `#707d87`. Ambos coexisten tal como están; no se unificaron.
- No hay guía de **iconografía** más allá del uso de `lucide-react`, ni de **ilustración** ni de **animación** (solo transiciones puntuales).
- No hay modo oscuro.
- La cobertura de `prefers-reduced-motion` en el panel no está auditada.
- No hay biblioteca de componentes documentada (Storybook o similar); la fuente es el código.
