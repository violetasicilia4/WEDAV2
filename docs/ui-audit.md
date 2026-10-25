# Weda · Auditoría integral de UI (2026-10-23)

Documento **histórico y con fecha**. Describe lo que se inspeccionó, lo que se encontró y lo que se corrigió. Los criterios vigentes siguen en [design-system.md](design-system.md) y [product-principles.md](product-principles.md).

## 0. Método y límites (leer primero)

- Servidor de desarrollo (`vite dev`, puerto 8080) y datos de prueba **solo en el navegador del panel** (`seedState()` de «Tomás y Martina» en `localStorage`; no se tocaron archivos de datos del proyecto).
- **Barrido automático** (iframes del mismo origen, esperando a que la pantalla hidrate): 7 rutas públicas × 320/390/768/1024/1440 px y 7 rutas del panel × 320/360/390/768/1024/1440 px. Mide desborde horizontal, elementos fuera del ancho, controles de menos de 40 px y texto de menos de 12 px.
- **Capturas** (inspección visual real): landing a 757 px, `/encontrar`, `/ejemplo`, 404, y en el panel Inicio, Regalos, Invitados, Mesas y grupos, Tu página y Vista previa a 757 px. El panel de 390 px se vio en capturas parciales.
- **No pude inspeccionar** (se registra como limitación, no como verificado):
  - 320, 360 y 390 px **con captura**: la emulación móvil del panel devolvió capturas en blanco; para esos anchos solo hay medición por DOM (sin desborde, sin elementos fuera del ancho).
  - 1024 y 1440 px **con captura**: la emulación de 1440 se renderizó en una esquina del panel. Solo hay medición por DOM.
  - Puntero táctil (`pointer: coarse`): el barrido lo ve como mouse, así que los íconos de 36 px figuran como «chicos»; el CSS los lleva a 44 px con puntero grueso (`panel.css`, bloque `pointer: coarse`) y **no se verificó en un dispositivo real**.
  - Estados: diálogos de publicación y planes, regalar como invitado, importar planilla, arrastrar tarjetas, estados de error de formularios, estado vacío de invitados/regalos, `/crear/*` con captura, `/panel/perfil` con captura, `/sitio/$slug` (requiere una publicación simulada).
  - Hover, foco y `active` de los controles (solo se leyó el CSS).

## 1. Inventario

**Rutas existentes** (`src/routeTree.gen.ts`): `/` (landing), `/encontrar`, `/ejemplo`, `/ejemplo/regalos`, `/crear/cuenta`, `/crear`, `/crear/foto`, `/crear/plan` (redirige), `/panel`, `/panel/regalos`, `/panel/invitados` (+ `?vista=mesas`), `/panel/mesas` (redirige), `/panel/sitio`, `/panel/vista-previa`, `/panel/perfil`, `/sitio/$slug` y `/sitio/$slug/regalos`. Más 404 y pantalla de error (`__root.tsx`, `lib/error-page.ts`).

**Estilos:** `styles.css` (landing, 1435 líneas), `panel.css` (administración, ~1670), `ejemplo.css`, `invitacion.css`, `demo.css` (página pública), `typography.css` (tokens Geist).

**Componentes compartidos:** `components/panel/{ui,couple-form,groups-view,live-card,onboarding,publish-dialog}`, `components/ui/{button,dialog}` (la base shadcn solo la usa el 404/error y el diálogo), `components/site/*`, `rsvp-dialog`, `landing-plans`, `feature-demos`, `float-nav`.

**Cifras de CSS** (indicadores de consistencia, no defectos por sí solos):

| Archivo | Tamaños de fuente distintos | Radios distintos | `!important` | Puntos de corte distintos |
|---|---|---|---|---|
| `panel.css` | 14 (tras la limpieza de esta auditoría) | ~20 | 16 | ~26 |
| `styles.css` | ~60 (la mayoría `clamp()`/`calc()` del mockup escalado) | ~22 | 13 | ~25 |
| `invitacion.css` | ~25 | ~14 | **70** | ~17 |

## 2. Resultado de la inspección

La interfaz está en **buen estado de base**: el barrido no encontró **ningún desborde horizontal** en ninguna de las 14 rutas a ninguno de los anchos medidos, y los controles táctiles ya están contemplados. Por eso la lista de hallazgos es corta y concreta. No se encontró justificación para rehacer pantallas.

## 3. Hallazgos

Leyenda: **Sev.** crítica/alta/media/baja · **Alc.** aislado/transversal · **Esf.** S/M/L · **Estado** ✔ corregido · ○ pendiente · ? decisión tuya.

### 3.1 Errores objetivos

| # | Dónde | Evidencia | Problema e impacto | Sev. | Alc. | Solución | Esf. | Estado |
|---|---|---|---|---|---|---|---|---|
| O1 | 404 (`__root.tsx`) | `a` computado: fondo `oklch(0.277 0.074 136)` (verde oscuro), color `rgb(59,60,58)`, 14 px, radio 6 px | El botón «Ir al inicio» tiene texto gris oscuro sobre verde oscuro: **ilegible** (≈1,4:1). La regla global `a { color: inherit }` le gana a la utilidad `text-primary-foreground`. Además «404» en 72 px negrita y esquinas de 6 px son una estética genérica ajena a la marca. | Alta | Aislado | Usar `seed-button` / `seed-link-button` (clases de la landing, color explícito) y el token de título de página | S | ✔ |
| O2 | Pantalla de error (`__root.tsx`) y HTML de respaldo (`lib/error-page.ts`) | Botones `rounded-md` 14 px; HTML con negro `#111`, fondo `#fafafa`, `system-ui` | Misma estética genérica; el HTML de respaldo no usa ni la paleta ni la píldora de Weda | Media | Aislado | Mismos tokens y píldora; sin librerías nuevas | S | ✔ |
| O3 | Encabezado de página del panel (`/panel/regalos`, `/panel/invitados`) a 757 px | «Copiar enlace de lista» y «Crear regalo» en dos renglones de anchos distintos; en Invitados «Exportar · Importar» arriba y «Agregar invitado» debajo, con 82–112 px de alto | El bloque de texto ocupaba su ancho máximo y empujaba las acciones a un segundo renglón desparejo entre ~560 y ~900 px. Rompe la alineación y hace parecer improvisada la acción principal | Media | Transversal (todas las cabeceras `.is-compact` con acciones) | El texto cede ancho (`flex: 1 1 240px; min-width: 0`) y las acciones quedan en una fila | S | ✔ (verificado: 1 fila y sin desborde en 561, 640, 700, 760, 761, 800, 900, 1024, 1280 y 1440 px, en Regalos e Invitados) |
| O4 | Portada de la pareja (`.pn-cover`, Inicio y Regalos) | La etiqueta «Tu casamiento» (13 px, `opacity .85`) se confunde con la arena de la foto; el scrim empezaba en 0 % hasta el 35 % | Texto pequeño blanco sobre foto clara: contraste insuficiente y dependiente de la foto que suba la pareja | Media | Transversal (dos pantallas) | Scrim desde 20 % hasta `.62`, y sin opacidad en etiqueta y fecha | S | ✔ (cambio de CSS; **no** reverificado con captura posterior) |

### 3.2 Inconsistencias con el sistema visual

| # | Dónde | Evidencia | Problema | Sev. | Alc. | Solución | Esf. | Estado |
|---|---|---|---|---|---|---|---|---|
| I1 | `panel.css` | `design-system.md` §4c declara la escala 12·13·14·15·16·18·20·26; el archivo tenía además 11.5, 12.5, 13.5, 14.5, 15.5 y 17 px (≈26 usos) | La escala documentada no se cumplía; valores a medio píxel que no corresponden a ningún token | Baja | Transversal | Ajustar al valor de la escala más cercano (11.5→12, 12.5→13, 13.5→14, 14.5→15, 15.5→16, 17→18 en el subtítulo del onboarding y 17→16 en el título de tarjeta de pack) | S | ✔ (variación ≤ 0,5 px; sin captura comparativa) |
| I2 | `panel.css` (publicar y pagar) | `.pn-pay`, `.pn-upgrade` usan `var(--pn-line, #e7e7e7)`, `#f7f7f7`, `#2b2b2b`, `#4a4a4a` sueltos | Colores fuera de los tokens `--pn-*` | Baja | Aislado | Pasar a tokens existentes | S | ○ |
| I3 | `invitacion.css` | 70 `!important` | Dificulta mantener la página pública; es deuda técnica con riesgo de regresión en `/ejemplo` | Media | Aislado | No tocar sin pruebas visuales de `/ejemplo` y `/sitio/*` | L | ○ (fuera de alcance seguro) |
| I4 | Puntos de corte | ~26 valores distintos solo en `panel.css` (560, 640, 720, 760, 860, 900, 980, 1023, 1024, 1080, 1100, 1279, 1280…) | Comportamientos que cambian en anchos poco coherentes | Baja | Transversal | Consolidar en 3–4 cortes; requiere revisar cada pantalla | L | ○ |
| I5 | Acciones de Invitados en «Mesas y grupos» | En `?vista=mesas` siguen arriba «Exportar · Importar · Agregar invitado» | Son acciones de la lista de invitados, mostradas sobre la vista de mesas | Baja | Aislado | Ocultarlas o cambiarlas por «Crear mesa» según la solapa | M | ? (cambia qué ve la usuaria) |
| I6 | Vista previa («Vista previa») | «Publicar» aparece en la cabecera **y** debajo del título | `ux-flows.md` §8 dice que el botón de la cabecera no se repite en esa pantalla | Baja | Aislado | Quitar uno de los dos | S | ? (decidir cuál conservar) |
| I7 | `/panel/sitio` a 757 px | La ventana en vivo (≈340 px) queda centrada mientras los campos van alineados a la izquierda | Eje de alineación distinto entre la vista previa y el contenido | Baja | Aislado | Alinear a la izquierda o a todo el ancho | S | ○ |

### 3.3 Mejoras opcionales

- Eliminar `components/ui/button.tsx`, variantes sin uso (`default`, `destructive`…) y verificar si `dialog.tsx` conserva utilidades genéricas; hoy mezclan dos sistemas (utilidades de Tailwind y clases propias).
- El panel mezcla botones primarios de dos pesos (el «Publicar» verde y el primario gris); respetar la jerarquía documentada ya funciona, pero conviene una sola definición de «primario».
- Landing: `tiny=98` textos < 12 px a 320 px (casi todos dentro del mockup escalado de las demos `fd-*`; son decorativos y se leen como imagen). No se tocaron.

### 3.4 Decisiones que requieren tu criterio

1. **Documentación desactualizada** (no se corrigió porque habría que elegir cuál versión manda):
   - `design-system.md` §4c dice «mismo Arial» y §1 que el panel usa Geist: el código usa Geist.
   - `design-system.md` §4c/§4d y `ux-flows.md` §5 describen solapas «Elegir · Mi lista · Aportes · Recibidos» / «Elegí tus regalos → Revisá tu lista…»; la pantalla muestra **«Mis regalos · Catálogo y packs · Aportes recibidos · Datos de cobro»** y el título «Lista de regalos».
   - `design-system.md` §4c: «No hay capacidad por mesa»; el modelo y la pantalla ya muestran «Ocupación 3 / 8 lugares».
   - El botón primario del panel se ve como superficie tintada (gris suave), no como `#4a4a4a` oscuro, como indican §4d y §7.
   - **Recomendación:** que `docs/` se alinee al código (regla de `CLAUDE.md`), en una tarea aparte.
2. I5 e I6 (arriba).
3. Unificar o no el primario del panel con el verde de la landing (ya documentado como vacío; no se tocó la identidad).

## 4. Plan por lotes

| Lote | Contenido | Estado |
|---|---|---|
| **A** · errores evidentes y responsive | O1, O2, O3, O4 | ✔ implementado |
| **B** · consistencia y sistema | I1 ✔ · I2 (tokens de pago) ○ · I4 (puntos de corte) ○ · I3 (`!important` de la invitación) ○ · limpiar `components/ui` ○ | parcial |
| **C** · jerarquía, composición y densidad | I5, I6, I7 (esperan decisión o captura) | ○ |
| **D** · microinteracciones y estados | Revisar hover/foco/`active`/disabled con navegación real por teclado; hoy solo se leyó el CSS | ○ no inspeccionado |

## 5. Verificaciones ejecutadas (después del lote A y de I1)

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | Sin errores |
| `npx vitest run` | 7 archivos, 95 pruebas, todas pasan |
| `npm run build` | Compila sin errores (`.output/` está en `.gitignore`) |
| 404 en el navegador | Texto claro y legible sobre el botón verde (captura) |
| Cabeceras de Regalos e Invitados en 10 anchos | Una sola fila de acciones, sin desborde (medición por DOM) |
| Resto del panel tras el cambio de tipografía | **Sin recorrido visual posterior**: se recomienda mirar Regalos, Invitados, Mesas y el editor en tu navegador |

No se hizo commit, push ni deploy. No se agregaron dependencias.

## 6. Pendientes ordenados por impacto

1. Actualizar `docs/` al estado real (sección 3.4, punto 1).
2. Recorrer a mano con un dispositivo real: puntero táctil, diálogos de publicación y regalar, importar planilla, arrastrar tarjetas.
3. I3 y I4 (deuda técnica con riesgo de regresión; hacerlos con pruebas visuales).
4. I5, I6, I7.
5. I2 y limpieza de `components/ui`.
