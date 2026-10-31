---
paths:
  - "src/routes/**"
  - "src/components/**"
  - "src/**/*.css"
  - "public/**"
  - "e2e/**"
---

# Interfaz: UX, identidad visual y textos

## Antes de tocar UX/UI, navegación, formularios, onboarding, responsive o conversión
1. Leé [docs/product-principles.md](../../docs/product-principles.md) (criterio, prioridades, checklist y límites). Es obligatorio.
2. Consultá [docs/design-system.md](../../docs/design-system.md) (tokens, componentes, patrones, vacíos) y [docs/ux-flows.md](../../docs/ux-flows.md) (recorridos y supuestos).
3. Rutas y estado del panel: [docs/panel-frontend.md](../../docs/panel-frontend.md).
4. Reutilizá componentes existentes antes de crear otros.

Resolvé por tu cuenta las decisiones habituales de UX/UI (patrón, jerarquía, textos, vacíos, feedback, responsive). Si falta una definición comercial, mantené un comportamiento conservador y documentá el supuesto en `docs/ux-flows.md`.

## Identidad visual (restricción permanente)
- Tres contextos que no se mezclan: **landing** (`styles.css`), **administración** (`panel.css`: fondo blanco, grises `#6b6b6b`/`#4a4a4a`/`#9a9a9a`, sin azul en botones ni acentos) y **página pública** (`/ejemplo*`, `/sitio/*`).
- Tipografía **Geist** (local en `public/fonts/geist`; tokens en `src/typography.css`) en landing, onboarding y panel. El micrositio (`/ejemplo*`, `/sitio/*` y su maqueta en la landing) conserva la suya: Cormorant Garamond en portada y secciones; Arial en barra, pie, pop-ups y regalos.
- Sin gradientes, sombras, colores, fuentes ni animaciones nuevas sin razón funcional. No rompas la landing ni `/ejemplo`.

## Textos e interacción
- Español rioplatense con voseo. Sin `alert` del navegador y sin botones decorativos: cada botón hace algo real.
- No simules cuentas, pagos, publicación, correos ni sincronización.
- La interfaz no habla de «demo», «demostración» ni «pago de prueba» (decisión de la dueña, 2026-10-28). Lo que todavía no existe se deja fuera o se conecta; no se explica como demo.
- No presentes como «recibido» un aporte que Weda no verificó: el vocabulario es «pendiente / confirmado manualmente» (IC-07 del Product Blueprint).

## Verificación
Para cambios visibles, además de los comandos de CLAUDE.md: recorrido real en el navegador, en celular (390 px) y en compu, con el preview «weda» (puerto 8080). Si cambiaste un patrón o un flujo, actualizá `docs/design-system.md` o `docs/ux-flows.md` en la misma tarea.
