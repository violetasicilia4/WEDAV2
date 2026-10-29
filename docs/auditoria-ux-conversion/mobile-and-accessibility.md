# Celular y accesibilidad

Auditoría del 2026-10-28. Resultados de las pruebas automáticas en `test-results.md`; acá, qué se revisó y cómo.

## Medidas de pantalla

| Medida | Qué se revisó | Cómo | Resultado |
|---|---|---|---|
| 320 × 568 | Sin scroll lateral en 7 páginas públicas y 5 del panel; constructor (nombres de secciones, barra); onboarding | E2E D-05, `builder.spec.ts`, `onboarding-photo.spec.ts` | Pasa |
| 360 × 800 | Públicas; constructor | E2E D-05, `builder.spec.ts` | Pasa |
| 390 × 844 | Todo el proyecto «mobile» de Playwright (táctil) | Suite completa | Pasa |
| 430 × 932 | Públicas; constructor; tipografía de la invitación | E2E D-05, `builder.spec.ts`, `mobile-journeys.spec.ts` | Pasa |
| 768 × 1024 | Públicas y panel | E2E D-05 | Pasa |
| 1280 × 800 | Proyecto «desktop» completo | Suite completa | Pasa |
| 1440 × 900 | Públicas y panel | E2E D-05 | Pasa |

**A mano en el navegador:**
- **Invitación (375, 871 y 1440 px):** los bloques quedaron con el mismo aire arriba y abajo (0–1 px de diferencia) y sin scroll lateral.
- **`/encontrar` a 320 px:** el texto de ayuda del campo se cortaba («Pegá el link de la invitac»). Se acortó a «Pegá el link acá».

## Accesibilidad (WCAG 2.2 AA, donde es práctico)

**Control automático en el navegador** (script propio sobre el DOM, 390 px) en `/`, `/ejemplo`, `/ejemplo/regalos`, `/crear/cuenta`, `/encontrar`, `/privacidad` y `/comprobante`:

| Control | Resultado |
|---|---|
| Un solo `h1` por página | 7/7 |
| Saltos en el orden de títulos (h2 → h4) | 0 |
| Imágenes sin `alt` | 0 |
| Campos sin etiqueta | 0 |
| Botones o enlaces sin nombre accesible | 0 |
| `lang="es"` | Sí |

**Arreglado en esta auditoría:**
- **«Tu invitación»:** el contador de secciones estaba dentro del título y cambiaba su nombre accesible. Ahora es decorativo (`aria-hidden`); el subtítulo ya dice la cantidad.
- **`/encontrar`:** el error del campo queda asociado (`aria-invalid`, `aria-describedby`, `role="alert"`).
- **`/comprobante`:** estados con `role="status"` y `role="alert"`; el campo de archivo tiene foco visible.

**Cubierto por pruebas existentes:**
- tamaño táctil de las filas (≥ 44 px);
- foco al primer campo inválido en registro y alta;
- diálogos que se cierran con Escape y devuelven el foco;
- buscador de lugares con teclado (combobox);
- contraste del botón «Publicar» (≈ 5,4:1).

**No verificado (pendiente):**
- **Contraste general con una herramienta** (axe o Lighthouse): no está instalada y no se agregaron dependencias.
- **Lector de pantalla real** (VoiceOver o TalkBack): sin ejecutar.
- **`prefers-reduced-motion`:** existe en CSS para varias animaciones, pero no se revisó página por página.

## Tipografía
El brief menciona Instrument Serif y DM Sans, pero el sistema de diseño del proyecto usa otras: **Geist** en landing y panel, y **Cormorant Garamond** y Arial en la invitación (`CLAUDE.md`, `docs/design-system.md`). Se respetó el sistema existente y no se agregaron fuentes.
