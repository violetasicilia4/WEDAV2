# Weda · instrucciones permanentes para Claude Code

Weda crea y gestiona la experiencia digital de un casamiento (página web, lista de regalos simbólicos, invitados, mesas, vista previa). Este archivo es un **índice de reglas**: el detalle vive en `docs/`. Si algo de `AGENTS.md` (heredado del clon original «Seed») contradice este archivo, prevalece este.

## Antes de cualquier tarea de UX/UI, navegación, formularios, onboarding, interacción, responsive o conversión
1. Leé [docs/product-principles.md](docs/product-principles.md): criterio de producto, proceso de decisión, prioridades, checklist y límites. Es obligatorio.
2. Consultá [docs/design-system.md](docs/design-system.md) (tokens, componentes, patrones de interacción y vacíos) y [docs/ux-flows.md](docs/ux-flows.md) (recorridos, planes, supuestos).
3. Detalle técnico (rutas, estado local, arquitectura): [docs/panel-frontend.md](docs/panel-frontend.md). Auditorías previas: `docs/auditoria-*.md`, `docs/auditoria-micrositio/`.
4. Inspeccioná el código existente y reutilizá componentes antes de crear otros.

## Autonomía
- Resolvé por tu cuenta las decisiones habituales de UX/UI (patrón de interacción, jerarquía, textos, estados vacíos, feedback, responsive). No preguntes por cada detalle.
- Consultá solo si falta una **definición comercial importante**, la decisión es **difícil de revertir** o la ambigüedad **afecta materialmente al producto**. Si falta una definición comercial, mantené un comportamiento conservador y documentá el supuesto en `docs/ux-flows.md`.

## Fuente de verdad
- Mandan, en este orden: el código y las funcionalidades implementadas, las decisiones comerciales documentadas y luego los documentos de criterio. Si un documento contradice el código, corregí el documento o avisá; no inventes.
- **No inventes** features, precios, planes, beneficios, reglas de publicación, integraciones, estados de pago, testimonios ni métricas. La matriz de planes está en `src/lib/weda/plans.ts`.
- Una sola fuente de datos: el panel, la vista previa y la página pública leen el mismo estado (`src/lib/weda/`). No dupliques contenido ni crees una segunda versión de una página existente.

## Identidad visual (restricción permanente)
Tres contextos que no se mezclan: **landing** (`styles.css`, Arial), **administración** (`panel.css`, Arial, fondo blanco, pizarra `#707d87`/`#5A646C`/`#8A959E`) y **página pública** (`/ejemplo*`, `/sitio/*`; Cormorant Garamond solo en las secciones de la invitación posteriores a la portada). Detalle en `docs/design-system.md`. No agregues gradientes, sombras, colores, fuentes ni animaciones sin razón funcional. No rompas la landing ni `/ejemplo`.

## Reglas de trabajo del proyecto
- Interfaz en español rioplatense (voseo). Sin `alert` del navegador y sin botones decorativos: cada botón hace algo real.
- Sin backend: no simules cuentas, pagos, publicación, correos ni sincronización. Guardado local, y la interfaz lo dice así.
- **No hagas commit, push, merge ni deploy** salvo que se pida explícitamente («push»). Nunca force-push sin autorización. No subas `.claude/`, `analisis-confites-top50.md`, `luna-de-miel-confites.md`, `capturas/` ni las fotos sin usar de `public/` (`pareja-portada-3…7.webp`, `pareja-portada-10.png`).
- Verificá lo que construyas: `npx tsc --noEmit`, `npx vitest run`, `npm run build` y, para cambios visibles, el flujo real en el navegador (móvil y desktop). Informá qué se verificó y qué no; no afirmes pruebas que no ejecutaste. El servidor de desarrollo corre en el puerto 8080 (`preview_start` «seed-clone-buddy»).
- Si cambiás un patrón o un flujo, actualizá `docs/design-system.md` o `docs/ux-flows.md` en la misma tarea.
