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
