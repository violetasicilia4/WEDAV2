# Weda · instrucciones permanentes para Claude Code

Weda crea y gestiona la experiencia digital de un casamiento: página de invitación, lista de regalos simbólicos con aportes por alias, invitados y mesas, confirmación de asistencia y vista previa. Tiene frontend (TanStack Start + React) y un servidor propio (API `/api/*` con SQLite). Todavía **no** tiene hosting de producción ni proveedor de pagos real.

Este archivo es un índice. Las reglas por área se cargan solas al trabajar en esos archivos (`.claude/rules/`): interfaz (`frontend-ux.md`), servidor y datos (`backend-data.md`) y documentación (`docs.md`).

## Fuente de verdad
- Mandan, en este orden: el código, las decisiones comerciales documentadas y luego los documentos de criterio. Si un documento contradice el código, corregí el documento o avisá.
- Estado vigente del producto, reglas de negocio y decisiones abiertas: [docs/product-blueprint/](docs/product-blueprint/00-product-blueprint.md). Modelo de datos decidido: [docs/data-architecture/](docs/data-architecture/06-consolidation-report.md).
- **No inventes** features, precios, planes, beneficios, reglas de publicación, integraciones, estados de pago, testimonios ni métricas. Los planes están en `src/lib/weda/plans.ts`.
- Una sola fuente de datos: panel, vista previa y página pública leen el mismo estado (`src/lib/weda/`). No dupliques contenido ni crees una segunda versión de una página.

## Autonomía y decisiones
- Resolvé por tu cuenta lo habitual de implementación y de UX/UI.
- Pedí aprobación antes de: tocar una decisión pendiente (DP-xx), cambiar el esquema de la base, agregar dependencias, o cualquier cosa difícil de revertir o que afecte dinero, datos personales o seguridad.

## Git y entorno
- Cada tarea va en su rama y llega a `main` por PR. **No hagas commit, push, merge ni deploy** salvo que se pida explícitamente. Nunca force-push.
- Los permisos reales están en `.claude/settings.json` (versionado). Como los permisos de Bash miran solo el comienzo del comando, `.claude/hooks/guard.sh` revisa la llamada entera. Bloquea:
  - secretos, `.data*/`, flags destructivos de git en cualquier posición, `rm -rf`, `sqlite3` y deploys;
  - crear, borrar o publicar tags;
  - merge de PR y escrituras por `gh api`.

  Commit, push, `gh pr create` y la edición de `src/server/db.ts` piden aprobación en modo default y se **bloquean en cualquier otro modo**: en modo auto, una regla `ask` no frena la llamada. Para cerrar una tarea en modo auto, la dueña hace esos pasos o pasa la sesión a default (ver `.claude/hooks/README.md`). Los casos del hook se prueban con `bash .claude/hooks/guard.test.sh`. No subas `.claude/settings.local.json`, `analisis-confites-top50.md`, `luna-de-miel-confites.md`, `capturas/` ni las fotos sin usar de `public/` (`pareja-portada-3…7.webp`, `pareja-portada-10.png`).
- Node 22.5 o más (el servidor usa `node:sqlite`). Servidor de desarrollo en el puerto 8080 (preview «weda»); crea y migra `.data/weda.db`.

## Verificación
- Antes de dar algo por terminado: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`. Para cambios visibles, además el recorrido real en el navegador (celular y compu).
- Informá qué se verificó y qué no. No afirmes pruebas que no ejecutaste.
